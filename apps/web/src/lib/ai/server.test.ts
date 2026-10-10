import Anthropic from "@anthropic-ai/sdk";
import { applyPatch } from "@dialmade/doc";
import { beforeEach, describe, expect, it } from "vitest";
import type { AiCaller } from "./access";
import type { AiApiError, CopyApiSuccess } from "./api";
import { memoryAiLedger, resetAiLedger } from "./budget";
import { AiLedgerError } from "./ledger";
import { COPY_SYSTEM_PROMPT } from "./prompt";
import { clientIp, generateHostedCopy, readAiServerConfig, type AiServerConfig } from "./server";
import { message, mockClient, sampleDoc } from "./testing";

const NOW = new Date("2026-10-09T12:00:00Z");
const config: AiServerConfig = {
  apiKey: "sk-ant-test",
  model: "claude-opus-5-5",
  freeModel: "claude-opus-5-5",
  effort: "low",
  monthlyBudgetUsd: 5,
  maxRequestsPerIpPerDay: 10,
  freeUsesPerMonth: 5,
  deviceSecret: "s".repeat(64),
  production: false,
  serverless: false,
};
const caller: AiCaller = { deviceId: "device-a", ipHash: "ip-a", setCookie: null };
const doc = sampleDoc(["landing"]);
const body = { doc, kind: "landing" as const, locale: "es" as const, sectionIds: ["hero-1"] };
const REAL_COST = (1200 * 4 + 2000 * 0.2 + 800 * 20) / 1_000_000;

const asError = (result: { body: unknown }) => result.body as AiApiError;
const asSuccess = (result: { body: unknown }) => result.body as CopyApiSuccess;
const quiet = async <T>(run: () => Promise<T>): Promise<T> => {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = originalError;
  }
};

let ledger = memoryAiLedger();
const usage = (deviceId = "device-a", ipHash = "ip-a") => ledger.usage({ deviceId, ipHash, now: NOW });
const run = (overrides: Partial<Parameters<typeof generateHostedCopy>[1]> = {}, request = body) =>
  generateHostedCopy(request, { caller, config, ledger, now: NOW, ...overrides });

describe("readAiServerConfig", () => {
  it("defaults to Claude Opus 5.5 at low effort, $5 a month, 5 free uses and 10 requests per IP per day", () => {
    expect(readAiServerConfig({})).toEqual({
      apiKey: undefined,
      model: "claude-opus-5-5",
      freeModel: "claude-opus-5-5",
      effort: "low",
      monthlyBudgetUsd: 5,
      maxRequestsPerIpPerDay: 10,
      freeUsesPerMonth: 5,
      deviceSecret: undefined,
      production: false,
      serverless: false,
    });
  });

  it("reads and validates the env", () => {
    const parsed = readAiServerConfig({
      ANTHROPIC_API_KEY: " sk-ant-x ",
      DIALMADE_AI_MODEL: "claude-sonnet-5-5",
      DIALMADE_AI_FREE_MODEL: "claude-haiku-5-5",
      DIALMADE_AI_EFFORT: "medium",
      DIALMADE_AI_MONTHLY_BUDGET_USD: "12.5",
      DIALMADE_AI_MAX_REQUESTS_PER_IP_PER_DAY: "3",
      DIALMADE_AI_FREE_USES_PER_MONTH: "2",
      DIALMADE_DEVICE_ID_SECRET: "k".repeat(64),
      NODE_ENV: "production",
    });
    expect(parsed).toEqual({
      apiKey: "sk-ant-x",
      model: "claude-sonnet-5-5",
      freeModel: "claude-haiku-5-5",
      effort: "medium",
      monthlyBudgetUsd: 12.5,
      maxRequestsPerIpPerDay: 3,
      freeUsesPerMonth: 2,
      deviceSecret: "k".repeat(64),
      production: true,
      serverless: false,
    });
    expect(readAiServerConfig({ DIALMADE_AI_MODEL: "claude-sonnet-5-5", DIALMADE_AI_FREE_MODEL: " " }).freeModel).toBe("claude-sonnet-5-5");
    expect(readAiServerConfig({ VERCEL: "1" }).serverless).toBe(true);
    expect(readAiServerConfig({ AWS_LAMBDA_FUNCTION_NAME: "fn" }).serverless).toBe(true);
  });

  it("fails closed on mistyped limits and ignores a short device secret", async () => {
    await quiet(async () => {
      expect(readAiServerConfig({ DIALMADE_AI_EFFORT: "turbo", DIALMADE_AI_MONTHLY_BUDGET_USD: "-1" })).toMatchObject({ effort: "low", monthlyBudgetUsd: 0 });
      expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "$1" }).monthlyBudgetUsd).toBe(0);
      expect(readAiServerConfig({ DIALMADE_AI_FREE_USES_PER_MONTH: "five" }).freeUsesPerMonth).toBe(0);
      expect(readAiServerConfig({ DIALMADE_DEVICE_ID_SECRET: "short" }).deviceSecret).toBeUndefined();
    });
    expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "0" }).monthlyBudgetUsd).toBe(0);
    expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "  " }).monthlyBudgetUsd).toBe(5);
  });
});

describe("generateHostedCopy under the free tier", () => {
  beforeEach(() => {
    resetAiLedger();
    ledger = memoryAiLedger();
  });

  it("answers 503 ai-not-configured without an API key, a ledger or a device secret", async () => {
    const { client, countTokens } = mockClient();
    expect(asError(await run({ client, config: { ...config, apiKey: undefined } })).code).toBe("ai-not-configured");
    await quiet(async () => {
      const noLedger = await run({ client, ledger: null });
      expect(noLedger.status).toBe(503);
      expect(asError(noLedger).code).toBe("ai-not-configured");
      expect(asError(await run({ client, caller: null })).code).toBe("ai-not-configured");
    });
    expect(countTokens).not.toHaveBeenCalled();
  });

  it("in production without Supabase the hosted AI stays off (no memory ledger)", async () => {
    const { client, countTokens } = mockClient();
    const result = await quiet(() => run({ client, ledger: undefined, env: {}, config: { ...config, production: true } }));
    expect(result.status).toBe(503);
    expect(countTokens).not.toHaveBeenCalled();
  });

  it("sends one cached, structured, low-effort request with the default fallback and returns a validated patch", async () => {
    const { client, countTokens, create } = mockClient({
      create: async () => message({ output: { edits: [{ id: "f2", text: "Cobra en segundos" }, { id: "f999", text: "x" }] } }),
    });
    const result = await run({ client });

    expect(result.status).toBe(200);
    const success = asSuccess(result);
    expect(success.patches).toEqual([{ op: "replace", path: "/pages/landing/elements/hero-1/props/title", value: "Cobra en segundos" }]);
    expect(success.rejected).toBe(1);
    expect(applyPatch(doc, success.patches).ok).toBe(true);
    expect(success.usage).toEqual({ inputTokens: 3200, outputTokens: 800, model: "claude-opus-5-5" });
    expect(success.costUsd).toBeCloseTo(REAL_COST, 6);
    expect(success.remainingBudgetUsd).toBeCloseTo(5 - REAL_COST, 6);
    expect(success).toMatchObject({ freeUsesRemaining: 4, freeUsesTotal: 5 });

    expect(countTokens).toHaveBeenCalledOnce();
    const params = create.mock.calls[0]![0] as unknown as Record<string, unknown> & {
      system: { text: string; cache_control: unknown }[];
      messages: { role: string; content: string }[];
      output_config: { effort: string; format: { type: string } };
    };
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(8192);
    expect(params.thinking).toBeUndefined();
    expect(params.system).toEqual([{ type: "text", text: COPY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }]);
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params.messages[0]!.content).toContain('"section": "hero-1"');
  });

  it("uses the free model (Claude Haiku 5.5: no server-side fallback, so none is sent) for count and call", async () => {
    const { client, countTokens, create } = mockClient({ create: async () => message({ model: "claude-haiku-5-5" }) });
    const result = await run({ client, config: { ...config, freeModel: "claude-haiku-5-5" } });
    expect(result.status).toBe(200);
    expect((countTokens.mock.calls[0]![0] as { model: string }).model).toBe("claude-haiku-5-5");
    const params = create.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.fallbacks).toBeUndefined();
    expect(params.betas).toBeUndefined();
    expect(asSuccess(result).costUsd).toBeCloseTo((1200 * 0.1 + 2000 * 0.01 + 800 * 0.5) / 1_000_000, 9);
  });

  it("never retries the paid call, never lets the client cancel it and settles its real cost", async () => {
    const { client, countTokens, create } = mockClient();
    const aborted = new AbortController();
    const result = await run({ client, signal: aborted.signal });
    expect(result.status).toBe(200);
    expect(countTokens.mock.calls[0]![1]).toMatchObject({ signal: aborted.signal, maxRetries: 0 });
    const requestOptions = create.mock.calls[0]![1] as Record<string, unknown>;
    expect(requestOptions).toMatchObject({ maxRetries: 0 });
    expect(requestOptions.signal).toBeUndefined();
    expect(requestOptions.timeout).toBeLessThan(60_000);
    expect(await usage()).toMatchObject({ reservedUsd: 0, freeUsesUsed: 1 });
  });

  it("answers 402 free-tier-exhausted with remaining 0 once the device used its free uses, without calling the API", async () => {
    const { client, countTokens } = mockClient();
    const twoUses = { ...config, freeUsesPerMonth: 2 };
    for (let i = 0; i < 2; i++) expect((await run({ client, config: twoUses })).status).toBe(200);
    const third = await run({ client, config: twoUses });
    expect(third.status).toBe(402);
    expect(asError(third)).toMatchObject({ code: "free-tier-exhausted", remaining: 0, freeUsesRemaining: 0, freeUsesTotal: 2 });
    expect(countTokens).toHaveBeenCalledTimes(2);

    const otherDevice = await run({ client, config: twoUses, caller: { ...caller, deviceId: "device-b" } });
    expect(otherDevice.status).toBe(200);
  });

  it("answers 402 budget-exceeded when the worst case does not fit in the month and never calls the model", async () => {
    const { client, create } = mockClient({ inputTokens: 5000 });
    const result = await run({ client, config: { ...config, monthlyBudgetUsd: 0.05 } });
    expect(result.status).toBe(402);
    expect(asError(result)).toMatchObject({ code: "budget-exceeded", remainingBudgetUsd: 0.05 });
    expect(create).not.toHaveBeenCalled();
    expect(await usage()).toMatchObject({ freeUsesUsed: 0, reservedUsd: 0 });
  });

  it("answers 429 daily-limit once the IP used its requests, whatever the device", async () => {
    const { client, countTokens } = mockClient();
    const limited = { ...config, maxRequestsPerIpPerDay: 1 };
    expect((await run({ client, config: limited })).status).toBe(200);
    const second = await run({ client, config: limited, caller: { ...caller, deviceId: "device-b" } });
    expect(second.status).toBe(429);
    expect(asError(second)).toMatchObject({ code: "daily-limit", retryAfterSeconds: 12 * 3600 });
    expect(second.ok ? null : second.headers).toEqual({ "Retry-After": String(12 * 3600) });
    expect(countTokens).toHaveBeenCalledOnce();
  });

  it("charges a refusal at its real cost (the use is spent) and answers 422 refused", async () => {
    const { client } = mockClient({ create: async () => message({ stop_reason: "refusal", output: null }) });
    const result = await run({ client });
    expect(result.status).toBe(422);
    expect(asError(result)).toMatchObject({ code: "refused", freeUsesRemaining: 4 });
    expect(await usage()).toMatchObject({ freeUsesUsed: 1, reservedUsd: 0 });
    expect((await usage()).spentUsd).toBeCloseTo(REAL_COST, 6);
  });

  it("releases the reservation and gives the free use back when the API answers with an error status", async () => {
    const { client } = mockClient({
      create: async () => {
        throw new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", new Headers({ "retry-after": "7" }));
      },
    });
    const result = await run({ client });
    expect(result.status).toBe(429);
    expect(asError(result)).toMatchObject({ code: "rate-limited", retryAfterSeconds: 7, freeUsesRemaining: 5 });
    expect(result.ok ? null : result.headers).toEqual({ "Retry-After": "7" });
    expect(await usage()).toMatchObject({ spentUsd: 0, reservedUsd: 0, freeUsesUsed: 0, ipRequestsToday: 1 });
  });

  it("charges an unparsable or cut answer at its real cost, and keeps the worst case only on a timeout", async () => {
    for (const answer of [message({ output: '{"edits": [' }), message({ stop_reason: "max_tokens" })]) {
      resetAiLedger();
      ledger = memoryAiLedger();
      const { client } = mockClient({ create: async () => answer });
      const result = await run({ client });
      expect(result.status).toBe(502);
      expect(asError(result).code).toBe("invalid-response");
      expect((await usage()).spentUsd).toBeCloseTo(REAL_COST, 6);
    }

    resetAiLedger();
    ledger = memoryAiLedger();
    const timeout = mockClient({
      create: async () => {
        throw new Anthropic.APIConnectionTimeoutError();
      },
    });
    expect((await run({ client: timeout.client })).status).toBe(504);
    expect((await usage()).spentUsd).toBeGreaterThan(0.1);
  });

  it("maps a rejected server key to ai-not-configured and an overload to overloaded", async () => {
    const denied = mockClient({
      create: async () => {
        throw new Anthropic.AuthenticationError(401, {}, "invalid x-api-key", new Headers());
      },
    });
    expect(asError(await quiet(() => run({ client: denied.client }))).code).toBe("ai-not-configured");
    const overloaded = mockClient({
      create: async () => {
        throw new Anthropic.InternalServerError(529, {}, "overloaded", new Headers());
      },
    });
    expect(asError(await run({ client: overloaded.client })).code).toBe("overloaded");
  });

  it("answers 503 when the ledger is down, before spending anything", async () => {
    const { client, countTokens } = mockClient();
    const broken = { ...ledger, usage: async () => Promise.reject(new AiLedgerError("down")) };
    const result = await quiet(() => run({ client, ledger: broken }));
    expect(result.status).toBe(503);
    expect(countTokens).not.toHaveBeenCalled();
  });

  it("rejects an invalid document, a missing page and sections without text, without touching the ledger", async () => {
    const { client, countTokens } = mockClient();
    expect(asError(await run({ client }, { ...body, doc: { nope: true } } as unknown as typeof body)).code).toBe("invalid-request");
    expect(asError(await run({ client }, { ...body, kind: "app" } as unknown as typeof body)).code).toBe("no-page");
    expect(asError(await run({ client }, { ...body, sectionIds: ["missing-1"] })).code).toBe("no-fields");
    expect(countTokens).not.toHaveBeenCalled();
    expect(await usage()).toMatchObject({ freeUsesUsed: 0, ipRequestsToday: 0 });
  });
});

describe("clientIp", () => {
  it("self-hosted: the address added by the trusted proxy, so rotating the client-sent start does not help", () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, i) => clientIp(new Headers({ "x-forwarded-for": `10.0.0.${i}, 203.0.113.7` }), {})),
    );
    expect([...seen]).toEqual(["203.0.113.7"]);
    expect(clientIp(new Headers({ "x-forwarded-for": "10.0.0.1, 198.51.100.9, 203.0.113.7" }), { DIALMADE_TRUSTED_PROXY_HOPS: "2" })).toBe(
      "198.51.100.9",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }), { DIALMADE_TRUSTED_PROXY_HOPS: "0" })).toBe("unknown");
    expect(clientIp(new Headers(), {})).toBe("unknown");
  });

  it("in production a client-sent x-forwarded-for is ignored unless the proxies are declared", () => {
    const spoofed = new Headers({ "x-forwarded-for": "6.6.6.6" });
    expect(clientIp(spoofed, { NODE_ENV: "production" })).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.7" }), { NODE_ENV: "production", DIALMADE_TRUSTED_PROXY_HOPS: "1" })).toBe("203.0.113.7");
  });

  it("on Vercel: x-real-ip, set by the platform", () => {
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1, 203.0.113.7", "x-real-ip": "198.51.100.2" });
    expect(clientIp(headers, { VERCEL: "1" })).toBe("198.51.100.2");
  });
});
