import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { FALLBACK_BETA } from "../config";
import { message, mockClient } from "../testing";
import { VISION_MAX_OUTPUT_TOKENS } from "./constants";
import { FingerprintGenerationError, countVisionTokens, generateFingerprint } from "./generate";
import { VISION_SYSTEM_PROMPT } from "./prompt";
import { STYLE_FINGERPRINT_JSON_SCHEMA } from "./schema";
import { promptImage, sampleRef } from "./testing";

type Params = {
  model: string;
  max_tokens: number;
  system: { type: string; text: string; cache_control?: unknown }[];
  messages: { role: string; content: { type: string }[] }[];
  output_config: { format: { type: string; schema: unknown }; effort?: string };
  betas?: string[];
  fallbacks?: unknown;
  thinking?: unknown;
};

const answer = (refs = [sampleRef()]) => ({ refs });
const HAIKU = { model: "claude-haiku-5-5", effort: "low" as const };
const OPUS = { model: "claude-opus-5-5", effort: "low" as const };

describe("generateFingerprint", () => {
  it("one structured-output call: cached system prompt, images, schema with enums, effort low, no thinking param", async () => {
    const { client, create } = mockClient({ create: async () => message({ model: "claude-haiku-5-5", output: answer() }) });
    const result = await generateFingerprint(client, [promptImage(), promptImage()], HAIKU, { timeout: 45_000, maxRetries: 0 });
    const [params, options] = create.mock.calls[0]! as [Params, unknown];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.max_tokens).toBe(VISION_MAX_OUTPUT_TOKENS);
    expect(params.system).toEqual([{ type: "text", text: VISION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]);
    expect(params.messages[0]!.content.filter((block) => block.type === "image")).toHaveLength(2);
    expect(params.output_config).toEqual({ format: { type: "json_schema", schema: STYLE_FINGERPRINT_JSON_SCHEMA }, effort: "low" });
    expect(params).not.toHaveProperty("thinking");
    expect(options).toEqual({ timeout: 45_000, maxRetries: 0 });
    expect(result.fingerprints).toHaveLength(2);
    expect(result.fingerprints[0]).toMatchObject({ recipeId: "soft-ui" });
    expect(result.fingerprints[1]).toBeNull();
    expect(result.usage).toEqual({ inputTokens: 3200, outputTokens: 800, model: "claude-haiku-5-5" });
    expect(result.costUsd).toBeCloseTo((1200 * 0.1 + 2000 * 0.01 + 800 * 0.5) / 1_000_000, 12);
  });

  it("sends no fallbacks with Claude Haiku 5.5, and `fallbacks: \"default\"` with Claude Opus 5.5", async () => {
    const haiku = mockClient({ create: async () => message({ model: "claude-haiku-5-5", output: answer() }) });
    await generateFingerprint(haiku.client, [promptImage()], HAIKU);
    const haikuParams = haiku.create.mock.calls[0]![0] as Params;
    expect(haikuParams).not.toHaveProperty("fallbacks");
    expect(haikuParams).not.toHaveProperty("betas");

    const opus = mockClient({ create: async () => message({ output: answer() }) });
    await generateFingerprint(opus.client, [promptImage()], OPUS);
    expect(opus.create.mock.calls[0]![0]).toMatchObject({ betas: [FALLBACK_BETA], fallbacks: "default" });
  });

  it("a refusal is a typed error that still carries the billed cost", async () => {
    const { client } = mockClient({ create: async () => message({ stop_reason: "refusal", output: null }) });
    const error = await generateFingerprint(client, [promptImage()], OPUS).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FingerprintGenerationError);
    expect(error).toMatchObject({ code: "refused", response: { model: "claude-opus-5-5" } });
    expect((error as FingerprintGenerationError).response!.costUsd).toBeGreaterThan(0);
  });

  it("a cut, non-JSON or unusable answer is invalid-response", async () => {
    for (const reply of [
      message({ stop_reason: "max_tokens", output: answer() }),
      message({ output: "not json" }),
      message({ output: { refs: [] } }),
      message({ output: { refs: [{ ...sampleRef(), recipeId: "brutalism" }] } }),
    ]) {
      const { client } = mockClient({ create: async () => reply });
      await expect(generateFingerprint(client, [promptImage()], OPUS)).rejects.toMatchObject({ code: "invalid-response" });
    }
  });

  it("lets the SDK's typed errors through", async () => {
    const { client } = mockClient({
      create: async () => {
        throw new Anthropic.APIConnectionError({ message: "offline" });
      },
    });
    await expect(generateFingerprint(client, [promptImage()], OPUS)).rejects.toBeInstanceOf(Anthropic.APIConnectionError);
  });
});

describe("countVisionTokens", () => {
  it("counts the same request (images and schema included) on the free endpoint", async () => {
    const { client, countTokens } = mockClient({ inputTokens: 4321 });
    expect(await countVisionTokens(client, [promptImage()], { model: "claude-haiku-5-5" }, { timeout: 10_000, maxRetries: 0 })).toBe(4321);
    const params = countTokens.mock.calls[0]![0] as Params;
    expect(params.output_config.format.schema).toBe(STYLE_FINGERPRINT_JSON_SCHEMA);
    expect(params.messages[0]!.content.some((block) => block.type === "image")).toBe(true);
  });
});
