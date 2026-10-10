import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiStatus, aiStatusResponse, withAiBudget, type AiBudgetTask } from "./access";
import { memoryAiLedger, resetAiLedger } from "./budget";
import { DEVICE_COOKIE, issueDeviceCookie } from "./device";
import { AiOutputError } from "./errors";
import type { AiServerConfig } from "./serverConfig";

const NOW = new Date("2026-10-09T12:00:00Z");
const SECRET = "d".repeat(64);
const config: AiServerConfig = {
  apiKey: "sk-ant-test",
  model: "claude-opus-5-5",
  freeModel: "claude-haiku-5-5",
  effort: "low",
  monthlyBudgetUsd: 5,
  maxRequestsPerIpPerDay: 10,
  freeUsesPerMonth: 5,
  deviceSecret: SECRET,
  production: true,
  serverless: false,
};
const env = { DIALMADE_TRUSTED_PROXY_HOPS: "1" };
const client = {} as Anthropic;

const request = (cookie?: string) =>
  new Request("https://dialmade.test/api/ai/fingerprint", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7", ...(cookie && { cookie }) },
  });

type Task = AiBudgetTask<{ fingerprint: string }>;

function task(overrides: Partial<Task> = {}) {
  return {
    estimate: vi.fn<Task["estimate"]>(overrides.estimate ?? (async () => 0.01)),
    run: vi.fn<Task["run"]>(overrides.run ?? (async () => ({ data: { fingerprint: "soft-rounded" }, costUsd: 0.002 }))),
  };
}

describe("withAiBudget (the infra any /api/ai/* route reuses)", () => {
  let ledger = memoryAiLedger();
  beforeEach(() => {
    resetAiLedger();
    ledger = memoryAiLedger();
  });

  it("sets a signed, httpOnly, Secure device cookie on the first request and answers data + counters", async () => {
    const t = task();
    const response = await withAiBudget(request(), t, { config, ledger, client, now: NOW, env });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`^${DEVICE_COOKIE}=v1\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]{43}; Path=/api/ai; Max-Age=\\d+; HttpOnly; SameSite=Lax; Secure$`));
    expect(await response.json()).toEqual({ fingerprint: "soft-rounded", costUsd: 0.002, remainingBudgetUsd: 4.998, freeUsesRemaining: 4, freeUsesTotal: 5 });

    const input = t.estimate.mock.calls[0]![0];
    expect(input).toMatchObject({ client, model: "claude-haiku-5-5", effort: "low", requestOptions: { maxRetries: 0 } });
    expect(t.run.mock.calls[0]![0].requestOptions.signal).toBeUndefined();
  });

  it("keeps the same device while its cookie verifies, and rotates a forged one", async () => {
    const { value } = issueDeviceCookie(SECRET);
    const first = await withAiBudget(request(`${DEVICE_COOKIE}=${value}`), task(), { config, ledger, client, now: NOW, env });
    expect(first.headers.get("set-cookie")).toBeNull();
    expect((await first.json()).freeUsesRemaining).toBe(4);
    const again = await withAiBudget(request(`${DEVICE_COOKIE}=${value}`), task(), { config, ledger, client, now: NOW, env });
    expect((await again.json()).freeUsesRemaining).toBe(3);

    const forged = await withAiBudget(request(`${DEVICE_COOKIE}=${value.slice(0, -1)}x`), task(), { config, ledger, client, now: NOW, env });
    expect(forged.headers.get("set-cookie")).toContain(`${DEVICE_COOKIE}=v1.`);
    expect((await forged.json()).freeUsesRemaining).toBe(4);
  });

  it("402 free-tier-exhausted { remaining: 0 } before estimating once the device has no free uses", async () => {
    const { value } = issueDeviceCookie(SECRET);
    const oneUse = { ...config, freeUsesPerMonth: 1 };
    await withAiBudget(request(`${DEVICE_COOKIE}=${value}`), task(), { config: oneUse, ledger, client, now: NOW, env });
    const t = task();
    const response = await withAiBudget(request(`${DEVICE_COOKIE}=${value}`), t, { config: oneUse, ledger, client, now: NOW, env });
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "free-tier-exhausted", remaining: 0, freeUsesRemaining: 0, freeUsesTotal: 1 });
    expect(t.estimate).not.toHaveBeenCalled();
  });

  it("settles an unusable answer at the cost the task reports", async () => {
    const t = task({
      run: async () => {
        throw new AiOutputError("invalid-response", "not JSON", { model: "claude-haiku-5-5", costUsd: 0.003 });
      },
    });
    const response = await withAiBudget(request(), t, { config, ledger, client, now: NOW, env });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "invalid-response", freeUsesRemaining: 4 });
    expect((await ledger.usage({ deviceId: "x", ipHash: "y", now: NOW })).spentUsd).toBeCloseTo(0.003, 9);
  });

  it("is off (503) in production without a device secret, and never estimates", async () => {
    const t = task();
    const originalError = console.error;
    console.error = () => {};
    try {
      const response = await withAiBudget(request(), t, { config: { ...config, deviceSecret: undefined }, ledger, client, now: NOW, env });
      expect(response.status).toBe(503);
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      console.error = originalError;
    }
    expect(t.estimate).not.toHaveBeenCalled();
  });

  it("rejects an estimate that is not a cost and keeps the ledger untouched", async () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      const response = await withAiBudget(request(), task({ estimate: async () => Number.NaN }), { config, ledger, client, now: NOW, env });
      expect(response.status).toBe(500);
    } finally {
      console.error = originalError;
    }
    expect(await ledger.usage({ deviceId: "x", ipHash: "y", now: NOW })).toMatchObject({ reservedUsd: 0, spentUsd: 0 });
  });
});

describe("GET /api/ai/status", () => {
  beforeEach(() => resetAiLedger());

  it("reports the free tier of this device and sets its cookie", async () => {
    const ledger = memoryAiLedger();
    const response = await aiStatusResponse(new Request("https://dialmade.test/api/ai/status"), { config, ledger, now: NOW, env });
    expect(response.headers.get("set-cookie")).toContain(`${DEVICE_COOKIE}=v1.`);
    const status = await response.json();
    expect(status).toMatchObject({
      configured: true,
      model: "claude-opus-5-5",
      freeModel: "claude-haiku-5-5",
      freeUsesTotal: 5,
      freeUsesRemaining: 5,
      remainingBudgetUsd: 5,
    });
    expect(status.minRequestUsd).toBeGreaterThan(0);
    expect(status.minRequestUsd).toBeLessThan(0.01);
  });

  it("is «off» without a key or a ledger, or when the ledger cannot be read", async () => {
    const caller = { deviceId: "device-a", ipHash: "ip-a", setCookie: null };
    expect(await aiStatus(caller, { config: { ...config, apiKey: undefined }, ledger: memoryAiLedger() })).toMatchObject({
      configured: false,
      freeUsesRemaining: 0,
      remainingBudgetUsd: null,
    });
    expect((await aiStatus(caller, { config, ledger: null })).configured).toBe(false);
    const broken = { ...memoryAiLedger(), usage: async () => Promise.reject(new Error("down")) };
    const originalError = console.error;
    console.error = () => {};
    try {
      expect((await aiStatus(caller, { config, ledger: broken })).configured).toBe(false);
    } finally {
      console.error = originalError;
    }
  });
});
