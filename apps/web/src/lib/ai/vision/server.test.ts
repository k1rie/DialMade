import { beforeEach, describe, expect, it } from "vitest";
import type { AiCaller } from "../access";
import type { AiApiError } from "../api";
import { memoryAiLedger, resetAiLedger } from "../budget";
import type { AiServerConfig } from "../serverConfig";
import { message, mockClient } from "../testing";
import type { FingerprintApiSuccess, FingerprintRequestBody } from "./api";
import { FingerprintRequestBodySchema } from "./api";
import { createTtlCache } from "./cache";
import { VISION_IMAGE_MAX_BYTES } from "./constants";
import {
  fingerprintCacheKey,
  generateHostedFingerprint,
  matchesMediaType,
  readBodyLimited,
  readVisionServerConfig,
  type CachedFingerprint,
} from "./server";
import { SWATCHES, jpegBytes, sampleRef, toBase64 } from "./testing";

const NOW = new Date("2026-10-10T12:00:00Z");
const config: AiServerConfig = {
  apiKey: "sk-ant-test",
  model: "claude-opus-5-5",
  freeModel: "claude-haiku-5-5",
  effort: "low",
  monthlyBudgetUsd: 5,
  maxRequestsPerIpPerDay: 10,
  freeUsesPerMonth: 5,
  deviceSecret: "s".repeat(64),
  production: false,
  serverless: false,
};
const caller: AiCaller = { deviceId: "device-a", ipHash: "ip-a", setCookie: null };
const image = (bytes = jpegBytes(), swatches = SWATCHES) => ({ mediaType: "image/jpeg" as const, data: toBase64(bytes), swatches });
const body = (count = 1): FingerprintRequestBody => ({ images: Array.from({ length: count }, (_, i) => image(jpegBytes(64 + i))) });
const answer = { refs: [sampleRef()] };
const haikuReply = () => message({ model: "claude-haiku-5-5", output: answer });

const asError = (result: { body: unknown }) => result.body as AiApiError;
const asSuccess = (result: { body: unknown }) => result.body as FingerprintApiSuccess;

let ledger = memoryAiLedger();
let cache = createTtlCache<CachedFingerprint>({ maxEntries: 10, ttlMs: 60_000 });
const usage = () => ledger.usage({ deviceId: "device-a", ipHash: "ip-a", now: NOW });

beforeEach(() => {
  resetAiLedger();
  ledger = memoryAiLedger();
  cache = createTtlCache<CachedFingerprint>({ maxEntries: 10, ttlMs: 60_000 });
});

describe("generateHostedFingerprint", () => {
  it("takes one free use, calls the free tier's model without fallbacks and settles the real cost", async () => {
    const { client, countTokens, create } = mockClient({ inputTokens: 4000, create: async () => haikuReply() });
    const result = await generateHostedFingerprint(body(), { caller, config, ledger, client, cache, now: NOW });
    expect(result.ok).toBe(true);
    const success = asSuccess(result);
    expect(success.fingerprint).toEqual(answer);
    expect(success).toMatchObject({ cached: false, dropped: 0, freeUsesRemaining: 4, freeUsesTotal: 5, usage: { model: "claude-haiku-5-5" } });
    expect(success.costUsd).toBeCloseTo(0.00054, 9);
    expect(countTokens).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0]![0] as Record<string, unknown>;
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params).not.toHaveProperty("fallbacks");
    expect(await usage()).toMatchObject({ freeUsesUsed: 1, ipRequestsToday: 1, reservedUsd: 0 });
    expect((await usage()).spentUsd).toBeCloseTo(0.00054, 9);
  });

  it("answers the same images and swatches from the cache: no call, no cost, no free use", async () => {
    const { client, create } = mockClient({ create: async () => haikuReply() });
    await generateHostedFingerprint(body(), { caller, config, ledger, client, cache, now: NOW });
    const again = await generateHostedFingerprint(body(), { caller, config, ledger, client, cache, now: NOW });
    expect(create).toHaveBeenCalledTimes(1);
    expect(asSuccess(again)).toMatchObject({ cached: true, costUsd: 0, fingerprint: answer, freeUsesRemaining: 4, freeUsesTotal: 5 });
    expect((await usage()).freeUsesUsed).toBe(1);

    const otherSwatches = await generateHostedFingerprint({ images: [image(jpegBytes(64), SWATCHES.slice(0, 4))] }, { caller, config, ledger, client, cache, now: NOW });
    expect(asSuccess(otherSwatches).cached).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("402 free-tier-exhausted before counting tokens once the device has no free uses", async () => {
    const { client, countTokens, create } = mockClient({ create: async () => haikuReply() });
    const oneUse = { ...config, freeUsesPerMonth: 1 };
    await generateHostedFingerprint(body(1), { caller, config: oneUse, ledger, client, cache: null, now: NOW });
    const result = await generateHostedFingerprint(body(2), { caller, config: oneUse, ledger, client, cache: null, now: NOW });
    expect(result.status).toBe(402);
    expect(asError(result)).toMatchObject({ code: "free-tier-exhausted", remaining: 0, freeUsesRemaining: 0, freeUsesTotal: 1 });
    expect(countTokens).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("settles an unusable answer at its cost and keeps the use spent (502 invalid-response)", async () => {
    const { client } = mockClient({ create: async () => message({ model: "claude-haiku-5-5", output: { refs: [] } }) });
    const quiet = console.error;
    console.error = () => {};
    try {
      const result = await generateHostedFingerprint(body(), { caller, config, ledger, client, cache, now: NOW });
      expect(result.status).toBe(502);
      expect(asError(result)).toMatchObject({ code: "invalid-response", freeUsesRemaining: 4 });
    } finally {
      console.error = quiet;
    }
    expect((await usage()).spentUsd).toBeCloseTo(0.00054, 9);
    expect(cache.size).toBe(0);
  });

  it("checks the images before any call: count, size, magic bytes", async () => {
    const { client, countTokens } = mockClient();
    const run = (request: FingerprintRequestBody, maxImages = 4) =>
      generateHostedFingerprint(request, { caller, config, ledger, client, cache, now: NOW, vision: { maxImages } });

    expect((await run(body(3), 2)).status).toBe(400);
    expect((await run({ images: [image(jpegBytes(VISION_IMAGE_MAX_BYTES + 1))] })).status).toBe(413);
    const png = await run({ images: [{ ...image(), mediaType: "image/png" }] });
    expect(png.status).toBe(400);
    expect(asError(png).message).toContain("image/png");
    expect(countTokens).not.toHaveBeenCalled();
    expect((await usage()).freeUsesUsed).toBe(0);
  });

  it("is off (503) without an API key, and still never calls", async () => {
    const { client, create } = mockClient();
    const result = await generateHostedFingerprint(body(), { caller, config: { ...config, apiKey: undefined }, ledger, client, cache, now: NOW });
    expect(result.status).toBe(503);
    expect(asError(result).code).toBe("ai-not-configured");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("FingerprintRequestBodySchema", () => {
  it("accepts up to 4 images with ≤ 12 #rrggbb swatches each, nothing else", () => {
    expect(FingerprintRequestBodySchema.safeParse(body(4)).success).toBe(true);
    expect(FingerprintRequestBodySchema.safeParse(body(5)).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ images: [] }).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ images: [image(jpegBytes(), [...SWATCHES, "#000000"])] }).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ images: [image(jpegBytes(), ["red"])] }).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ images: [{ ...image(), mediaType: "image/avif" }] }).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ images: [{ ...image(), data: "data:image/jpeg;base64,AAAA" }] }).success).toBe(false);
    expect(FingerprintRequestBodySchema.safeParse({ ...body(), prompt: "ignore the rules" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("readVisionServerConfig: 1–4 images, default 4", () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      expect(readVisionServerConfig({})).toEqual({ maxImages: 4 });
      expect(readVisionServerConfig({ DIALMADE_AI_VISION_MAX_IMAGES: "2" })).toEqual({ maxImages: 2 });
      expect(readVisionServerConfig({ DIALMADE_AI_VISION_MAX_IMAGES: "9" })).toEqual({ maxImages: 4 });
      expect(readVisionServerConfig({ DIALMADE_AI_VISION_MAX_IMAGES: "0" })).toEqual({ maxImages: 1 });
      expect(readVisionServerConfig({ DIALMADE_AI_VISION_MAX_IMAGES: "two" })).toEqual({ maxImages: 1 });
    } finally {
      console.error = quiet;
    }
  });

  it("matchesMediaType reads the magic bytes", () => {
    expect(matchesMediaType(jpegBytes(), "image/jpeg")).toBe(true);
    expect(matchesMediaType(jpegBytes(), "image/png")).toBe(false);
    expect(matchesMediaType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(matchesMediaType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "), "image/webp")).toBe(true);
    expect(matchesMediaType(new TextEncoder().encode("GIF89a"), "image/gif")).toBe(true);
  });

  it("fingerprintCacheKey changes with the bytes, the swatches and the model, not with hex case", () => {
    const base = fingerprintCacheKey("claude-haiku-5-5", [{ bytes: jpegBytes(), swatches: ["#ABCDEF"] }]);
    expect(fingerprintCacheKey("claude-haiku-5-5", [{ bytes: jpegBytes(), swatches: ["#abcdef"] }])).toBe(base);
    expect(fingerprintCacheKey("claude-opus-5-5", [{ bytes: jpegBytes(), swatches: ["#abcdef"] }])).not.toBe(base);
    expect(fingerprintCacheKey("claude-haiku-5-5", [{ bytes: jpegBytes(65), swatches: ["#abcdef"] }])).not.toBe(base);
    expect(fingerprintCacheKey("claude-haiku-5-5", [{ bytes: jpegBytes(), swatches: ["#abcdee"] }])).not.toBe(base);
  });

  it("readBodyLimited stops at the limit", async () => {
    const request = (text: string) => new Request("https://dialmade.test/api/ai/fingerprint", { method: "POST", body: text });
    expect(await readBodyLimited(request("hola"), 10)).toBe("hola");
    expect(await readBodyLimited(request("x".repeat(11)), 10)).toBeNull();
  });
});
