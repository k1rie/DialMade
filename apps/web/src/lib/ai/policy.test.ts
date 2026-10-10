import { describe, expect, it } from "vitest";
import type { AiStatusResponse } from "./api";
import { OFFLINE_AI_STATUS, aiSourceFor, countersFrom, fallbackReasonOf, hostedBlocker, mergeAiCounters, modelFor, normalizeAiStatus } from "./policy";

const ON: AiStatusResponse = {
  configured: true,
  model: "claude-opus-5-5",
  freeModel: "claude-haiku-5-5",
  freeUsesTotal: 5,
  freeUsesRemaining: 3,
  remainingBudgetUsd: 4.98,
  minRequestUsd: 0.005,
};

describe("normalizeAiStatus", () => {
  it("keeps a complete status", () => {
    expect(normalizeAiStatus(ON)).toEqual(ON);
  });

  it("fills what an older server or a broken answer leaves out, failing closed", () => {
    expect(normalizeAiStatus({ configured: true, model: "claude-opus-5-5", remainingBudgetUsd: 2, minRequestUsd: 0.01 })).toEqual({
      configured: true,
      model: "claude-opus-5-5",
      freeModel: "claude-opus-5-5",
      freeUsesTotal: 5,
      freeUsesRemaining: 0,
      remainingBudgetUsd: 2,
      minRequestUsd: 0.01,
    });
    expect(normalizeAiStatus(null)).toEqual(OFFLINE_AI_STATUS);
    expect(normalizeAiStatus({ configured: "yes", freeUsesRemaining: -1, remainingBudgetUsd: "5" })).toMatchObject({
      configured: false,
      freeUsesRemaining: 0,
      remainingBudgetUsd: null,
    });
  });
});

describe("counters", () => {
  it("reads the counters of any hosted answer and merges them", () => {
    const counters = countersFrom({ code: "free-tier-exhausted", freeUsesRemaining: 0, freeUsesTotal: 5, remainingBudgetUsd: 4.5 });
    expect(counters).toEqual({ freeUsesRemaining: 0, freeUsesTotal: 5, remainingBudgetUsd: 4.5 });
    expect(mergeAiCounters(ON, counters)).toMatchObject({ freeUsesRemaining: 0, remainingBudgetUsd: 4.5, configured: true });
    expect(countersFrom({ patches: [] })).toEqual({});
    expect(mergeAiCounters(ON, {})).toBe(ON);
  });
});

describe("the policy: free tier → BYOK or «mi Claude»", () => {
  it("the user's key wins; otherwise the free tier while it can answer", () => {
    expect(aiSourceFor(ON, true)).toBe("byok");
    expect(aiSourceFor(ON, false)).toBe("hosted");
    expect(aiSourceFor({ ...ON, freeUsesRemaining: 0 }, false)).toBeNull();
    expect(aiSourceFor(null, false)).toBeNull();
  });

  it("says why the free tier cannot answer", () => {
    expect(hostedBlocker(ON)).toBeNull();
    expect(hostedBlocker(null)).toBe("not-configured");
    expect(hostedBlocker(OFFLINE_AI_STATUS)).toBe("not-configured");
    expect(hostedBlocker({ ...ON, freeUsesRemaining: 0 })).toBe("free-tier-exhausted");
    expect(hostedBlocker({ ...ON, remainingBudgetUsd: 0.001 })).toBe("budget-exceeded");
    expect(hostedBlocker({ ...ON, remainingBudgetUsd: null })).toBe("budget-exceeded");
  });

  it("maps the wire codes that need a way out, and only those", () => {
    expect(fallbackReasonOf("free-tier-exhausted")).toBe("free-tier-exhausted");
    expect(fallbackReasonOf("budget-exceeded")).toBe("budget-exceeded");
    expect(fallbackReasonOf("daily-limit")).toBe("daily-limit");
    expect(fallbackReasonOf("ai-not-configured")).toBe("not-configured");
    expect(fallbackReasonOf("rate-limited")).toBeNull();
    expect(fallbackReasonOf("invalid-response")).toBeNull();
  });

  it("the free tier runs DIALMADE_AI_FREE_MODEL; BYOK and «mi Claude» DIALMADE_AI_MODEL", () => {
    expect(modelFor("hosted", ON)).toBe("claude-haiku-5-5");
    expect(modelFor("byok", ON)).toBe("claude-opus-5-5");
    expect(modelFor(null, ON)).toBe("claude-opus-5-5");
    expect(modelFor("hosted", null)).toBe(OFFLINE_AI_STATUS.freeModel);
  });
});
