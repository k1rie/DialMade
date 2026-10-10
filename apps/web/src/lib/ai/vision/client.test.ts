import { describe, expect, it } from "vitest";
import { createTtlCache } from "./cache";
import { isCompleteScreenshot, toVisionResult, visionCacheKey } from "./client";
import { estimateVisionCostUsd, formatUsd, visionImageTokens } from "./estimate";
import { VISION_PROMPT_ID } from "./prompt";
import { normalizeFingerprintAnswer } from "./schema";
import { SWATCHES, sampleRef } from "./testing";

describe("toVisionResult", () => {
  it("maps fingerprints back to the import's sourceIds, skipping screenshots without one", () => {
    const normalized = normalizeFingerprintAnswer({ refs: [sampleRef({ refIndex: 1 })] }, [12, 12]);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    const result = toVisionResult([{ sourceId: "screenshot-aa" }, { sourceId: "screenshot-bb" }], normalized, {
      skipped: ["screenshot-cc"],
      model: "claude-haiku-5-5",
      costUsd: 0.001,
      source: "hosted",
      cached: false,
    });
    expect(result.fingerprints).toEqual([{ sourceId: "screenshot-bb", index: 1, fingerprint: normalized.fingerprints[1] }]);
    expect(result).toMatchObject({ skipped: ["screenshot-cc"], dropped: 0, source: "hosted" });
  });
});

describe("visionCacheKey", () => {
  it("depends on the files, the swatches and the prompt, not on hex case", () => {
    const key = visionCacheKey([{ contentHash: "ab12", swatches: ["#FFFFFF"] }]);
    expect(key.startsWith(VISION_PROMPT_ID)).toBe(true);
    expect(visionCacheKey([{ contentHash: "ab12", swatches: ["#ffffff"] }])).toBe(key);
    expect(visionCacheKey([{ contentHash: "ab13", swatches: ["#ffffff"] }])).not.toBe(key);
    expect(visionCacheKey([{ contentHash: "ab12", swatches: ["#fffffe"] }])).not.toBe(key);
  });
});

describe("isCompleteScreenshot", () => {
  it("needs the source, the file, the swatches and the hash to run", () => {
    const file = new Blob(["x"], { type: "image/png" });
    expect(isCompleteScreenshot({ sourceId: "s", file, swatches: SWATCHES, contentHash: "h" })).toBe(true);
    expect(isCompleteScreenshot({ width: 1280, height: 800 })).toBe(false);
    expect(isCompleteScreenshot({ sourceId: "s", file, contentHash: "h" })).toBe(false);
  });
});

describe("createTtlCache", () => {
  it("expires entries and drops the least recently used when full", () => {
    let now = 0;
    const cache = createTtlCache<number>({ maxEntries: 2, ttlMs: 100, now: () => now });
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    now = 150;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(1);
  });
});

describe("estimate", () => {
  it("≈ one token per 28×28 px patch of the image as sent (long side ≤ 1280)", () => {
    expect(visionImageTokens({ width: 1280, height: 800 })).toBe(1307);
    expect(visionImageTokens({ width: 2560, height: 1600 })).toBe(1307);
    expect(visionImageTokens()).toBe(1307);
    expect(visionImageTokens({ width: 640, height: 400 })).toBe(327);
  });

  it("is in the range of the spec for Claude Haiku 5.5 and Claude Opus 5.5", () => {
    const haiku = estimateVisionCostUsd("claude-haiku-5-5", [{}]);
    const opus = estimateVisionCostUsd("claude-opus-5-5", [{}]);
    const opusFour = estimateVisionCostUsd("claude-opus-5-5", [{}, {}, {}, {}]);
    expect(haiku).toBeGreaterThan(0.0003);
    expect(haiku).toBeLessThan(0.003);
    expect(opus).toBeGreaterThan(0.015);
    expect(opus).toBeLessThan(0.05);
    expect(opusFour).toBeLessThan(0.12);
    expect(estimateVisionCostUsd("claude-haiku-5-5", [])).toBe(0);
  });

  it("formats sub-cent costs with three decimals", () => {
    expect(formatUsd(0.0042, "en")).toBe("$0.004");
    expect(formatUsd(0.0312, "en")).toBe("$0.03");
    expect(formatUsd(0.0004, "en")).toBe("< $0.001");
    expect(formatUsd(0.12, "en")).toBe("$0.12");
    expect(formatUsd(0, "en")).toBe("$0.00");
    expect(formatUsd(0.0042, "es")).toBe("$0.004");
  });
});
