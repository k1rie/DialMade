import Anthropic from "@anthropic-ai/sdk";
import { applyPatch } from "@dialmade/doc";
import { beforeEach, describe, expect, it } from "vitest";
import type { CopyApiError, CopyApiSuccess } from "./api";
import { remainingBudgetUsd, resetAiLedger } from "./budget";
import { COPY_SYSTEM_PROMPT } from "./prompt";
import { aiStatus, clientIp, generateHostedCopy, readAiServerConfig, type AiServerConfig } from "./server";
import { message, mockClient, sampleDoc } from "./testing";

const NOW = new Date("2026-10-09T12:00:00Z");
const config: AiServerConfig = {
  apiKey: "sk-ant-test",
  model: "claude-opus-5-5",
  effort: "low",
  monthlyBudgetUsd: 5,
  maxRequestsPerIpPerDay: 20,
  serverless: false,
};
const doc = sampleDoc(["landing"]);
const body = { doc, kind: "landing" as const, locale: "es" as const, sectionIds: ["hero-1"] };

const asError = (result: { body: unknown }) => result.body as CopyApiError;
const asSuccess = (result: { body: unknown }) => result.body as CopyApiSuccess;

describe("readAiServerConfig", () => {
  it("defaults to Claude Opus 5.5 at low effort, $5 a month and 20 requests per IP per day", () => {
    expect(readAiServerConfig({})).toEqual({
      apiKey: undefined,
      model: "claude-opus-5-5",
      effort: "low",
      monthlyBudgetUsd: 5,
      maxRequestsPerIpPerDay: 20,
      serverless: false,
    });
  });

  it("reads and validates the env", () => {
    const parsed = readAiServerConfig({
      ANTHROPIC_API_KEY: " sk-ant-x ",
      DIALMADE_AI_MODEL: "claude-sonnet-5-5",
      DIALMADE_AI_EFFORT: "medium",
      DIALMADE_AI_MONTHLY_BUDGET_USD: "12.5",
      DIALMADE_AI_MAX_REQUESTS_PER_IP_PER_DAY: "3",
    });
    expect(parsed).toEqual({
      apiKey: "sk-ant-x",
      model: "claude-sonnet-5-5",
      effort: "medium",
      monthlyBudgetUsd: 12.5,
      maxRequestsPerIpPerDay: 3,
      serverless: false,
    });
    expect(readAiServerConfig({ VERCEL: "1" }).serverless).toBe(true);
    expect(readAiServerConfig({ AWS_LAMBDA_FUNCTION_NAME: "fn" }).serverless).toBe(true);
  });

  it("fails closed on a mistyped budget: an invalid value means $0, not the default", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(readAiServerConfig({ DIALMADE_AI_EFFORT: "turbo", DIALMADE_AI_MONTHLY_BUDGET_USD: "-1" })).toMatchObject({ effort: "low", monthlyBudgetUsd: 0 });
      expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "$1" }).monthlyBudgetUsd).toBe(0);
    } finally {
      console.error = originalError;
    }
    expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "0" }).monthlyBudgetUsd).toBe(0);
    expect(readAiServerConfig({ DIALMADE_AI_MONTHLY_BUDGET_USD: "  " }).monthlyBudgetUsd).toBe(5);
  });
});

describe("generateHostedCopy", () => {
  beforeEach(() => resetAiLedger());

  it("answers 503 ai-not-configured without an API key", async () => {
    const { client, create } = mockClient();
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", config: { ...config, apiKey: undefined }, client, now: NOW });
    expect(result.status).toBe(503);
    expect(asError(result).code).toBe("ai-not-configured");
    expect(create).not.toHaveBeenCalled();
    expect(aiStatus({ ...config, apiKey: undefined }, NOW)).toMatchObject({ configured: false, model: "claude-opus-5-5", remainingBudgetUsd: null });
  });

  it("stays off on serverless, where the in-memory ledger is not a hard budget", async () => {
    const { client, countTokens } = mockClient();
    const originalError = console.error;
    console.error = () => {};
    try {
      const result = await generateHostedCopy(body, { ip: "1.1.1.1", config: { ...config, serverless: true }, client, now: NOW });
      expect(result.status).toBe(503);
      expect(asError(result).code).toBe("ai-not-configured");
    } finally {
      console.error = originalError;
    }
    expect(countTokens).not.toHaveBeenCalled();
    expect(aiStatus({ ...config, serverless: true }, NOW).configured).toBe(false);
  });

  it("reports the reservation of a typical request so the UI stops offering the hosted AI in time", () => {
    const status = aiStatus(config, NOW);
    expect(status.configured).toBe(true);
    expect(status.minRequestUsd).toBeGreaterThan(0.1);
    expect(status.minRequestUsd).toBeLessThan(status.remainingBudgetUsd ?? 0);
  });

  it("never retries the paid call, never lets the client cancel it and settles its real cost", async () => {
    const { client, countTokens, create } = mockClient();
    const aborted = new AbortController();
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", signal: aborted.signal, config, client, now: NOW });
    expect(result.status).toBe(200);
    expect(countTokens.mock.calls[0]![1]).toMatchObject({ signal: aborted.signal, maxRetries: 0 });
    const requestOptions = create.mock.calls[0]![1] as Record<string, unknown>;
    expect(requestOptions).toMatchObject({ maxRetries: 0 });
    expect(requestOptions.signal).toBeUndefined();
    expect(requestOptions.timeout).toBeLessThan(60_000);
  });

  it("sends one cached, structured, low-effort request with the default fallback and returns a validated patch", async () => {
    const { client, countTokens, create } = mockClient({
      create: async () => message({ output: { edits: [{ id: "f2", text: "Cobra en segundos" }, { id: "f999", text: "x" }] } }),
    });
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", config, client, now: NOW });

    expect(result.status).toBe(200);
    const success = asSuccess(result);
    expect(success.patches).toEqual([{ op: "replace", path: "/pages/landing/elements/hero-1/props/title", value: "Cobra en segundos" }]);
    expect(success.rejected).toBe(1);
    expect(applyPatch(doc, success.patches).ok).toBe(true);
    expect(success.usage).toEqual({ inputTokens: 3200, outputTokens: 800, model: "claude-opus-5-5" });
    expect(success.costUsd).toBeCloseTo((1200 * 4 + 2000 * 0.2 + 800 * 20) / 1_000_000, 6);
    expect(success.remainingBudgetUsd).toBeCloseTo(5 - success.costUsd, 6);

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

  it("does not send fallbacks for a model without them", async () => {
    const { client, create } = mockClient({ create: async () => message({ model: "claude-haiku-5-5" }) });
    await generateHostedCopy(body, { ip: "1.1.1.1", config: { ...config, model: "claude-haiku-5-5" }, client, now: NOW });
    const params = create.mock.calls[0]![0] as unknown as Record<string, unknown>;
    expect(params.fallbacks).toBeUndefined();
    expect(params.betas).toBeUndefined();
  });

  it("answers 402 when the worst case does not fit in the month and never calls the model", async () => {
    const { client, create } = mockClient({ inputTokens: 5000 });
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", config: { ...config, monthlyBudgetUsd: 0.05 }, client, now: NOW });
    expect(result.status).toBe(402);
    expect(asError(result)).toMatchObject({ code: "budget-exceeded", remainingBudgetUsd: 0.05 });
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 429 daily-limit once the IP used its requests, without calling the API or touching the budget", async () => {
    const { client, countTokens } = mockClient();
    const limited = { ...config, maxRequestsPerIpPerDay: 1 };
    expect((await generateHostedCopy(body, { ip: "9.9.9.9", config: limited, client, now: NOW })).status).toBe(200);
    const spent = remainingBudgetUsd(5, NOW);
    const second = await generateHostedCopy(body, { ip: "9.9.9.9", config: limited, client, now: NOW });
    expect(second.status).toBe(429);
    expect(asError(second).code).toBe("daily-limit");
    expect(countTokens).toHaveBeenCalledOnce();
    expect(remainingBudgetUsd(5, NOW)).toBeCloseTo(spent, 9);
  });

  it("charges a refusal at its real cost and answers 422 refused", async () => {
    const { client } = mockClient({ create: async () => message({ stop_reason: "refusal", output: null }) });
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", config, client, now: NOW });
    expect(result.status).toBe(422);
    expect(asError(result).code).toBe("refused");
    expect(remainingBudgetUsd(5, NOW)).toBeCloseTo(5 - (1200 * 4 + 2000 * 0.2 + 800 * 20) / 1_000_000, 6);
  });

  it("releases the reservation when the API answers with an error status", async () => {
    const { client } = mockClient({
      create: async () => {
        throw new Anthropic.RateLimitError(429, { type: "error" }, "rate limited", new Headers({ "retry-after": "7" }));
      },
    });
    const result = await generateHostedCopy(body, { ip: "1.1.1.1", config, client, now: NOW });
    expect(result.status).toBe(429);
    expect(asError(result)).toMatchObject({ code: "rate-limited", retryAfterSeconds: 7 });
    expect(result.headers).toEqual({ "Retry-After": "7" });
    expect(remainingBudgetUsd(5, NOW)).toBe(5);
  });

  it("charges an unparsable or cut answer at its real cost, and keeps the worst case only on a timeout", async () => {
    const realCost = (1200 * 4 + 2000 * 0.2 + 800 * 20) / 1_000_000;
    for (const answer of [message({ output: '{"edits": [' }), message({ stop_reason: "max_tokens" })]) {
      resetAiLedger();
      const { client } = mockClient({ create: async () => answer });
      const result = await generateHostedCopy(body, { ip: "1.1.1.1", config, client, now: NOW });
      expect(result.status).toBe(502);
      expect(asError(result).code).toBe("invalid-response");
      expect(remainingBudgetUsd(5, NOW)).toBeCloseTo(5 - realCost, 6);
    }

    resetAiLedger();
    const timeout = mockClient({
      create: async () => {
        throw new Anthropic.APIConnectionTimeoutError();
      },
    });
    expect((await generateHostedCopy(body, { ip: "1.1.1.1", config, client: timeout.client, now: NOW })).status).toBe(504);
    expect(remainingBudgetUsd(5, NOW)).toBeLessThan(4.9);
  });

  it("maps a rejected server key to ai-not-configured and an overload to overloaded", async () => {
    const denied = mockClient({
      create: async () => {
        throw new Anthropic.AuthenticationError(401, {}, "invalid x-api-key", new Headers());
      },
    });
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(asError(await generateHostedCopy(body, { ip: "1.1.1.1", config, client: denied.client, now: NOW })).code).toBe(
        "ai-not-configured",
      );
    } finally {
      console.error = originalError;
    }
    const overloaded = mockClient({
      create: async () => {
        throw new Anthropic.InternalServerError(529, {}, "overloaded", new Headers());
      },
    });
    expect(asError(await generateHostedCopy(body, { ip: "1.1.1.1", config, client: overloaded.client, now: NOW })).code).toBe("overloaded");
  });

  it("rejects an invalid document, a missing page and sections without text", async () => {
    const { client } = mockClient();
    const bad = await generateHostedCopy({ ...body, doc: { nope: true } }, { ip: "1.1.1.1", config, client, now: NOW });
    expect(asError(bad).code).toBe("invalid-request");
    const noPage = await generateHostedCopy({ ...body, kind: "app" }, { ip: "1.1.1.1", config, client, now: NOW });
    expect(asError(noPage).code).toBe("no-page");
    const noFields = await generateHostedCopy({ ...body, sectionIds: ["missing-1"] }, { ip: "1.1.1.1", config, client, now: NOW });
    expect(asError(noFields).code).toBe("no-fields");
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

  it("on Vercel: x-real-ip, set by the platform", () => {
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1, 203.0.113.7", "x-real-ip": "198.51.100.2" });
    expect(clientIp(headers, { VERCEL: "1" })).toBe("198.51.100.2");
  });
});
