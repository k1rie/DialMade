import { describe, expect, it } from "vitest";
import type { BatchFile } from "../../registry";
import { aggregateScreenshots, castBatchVote, type ScreenshotVote } from "./consensus";

const vote = (mode: ScreenshotVote["mode"], accent?: string, tint = { h: 0, c: 0 }, vibrancy = { c: 0.15, l: 0.6 }): ScreenshotVote => ({
  mode,
  neutralTint: tint,
  vibrancy,
  ...(accent && { accentCandidate: accent }),
});

describe("aggregateScreenshots", () => {
  it("is null for no screenshots and fully consistent for one", () => {
    expect(aggregateScreenshots([])).toBeNull();
    expect(aggregateScreenshots([vote("light", "#564cd3")])).toMatchObject({ count: 1, mode: "light", accent: { hex: "#564cd3", votes: 1 }, consistency: 1, warnings: [] });
  });

  it("treats light and dark variants of one accent as the same color", () => {
    const c = aggregateScreenshots([vote("light", "#4f46e5"), vote("dark", "#818cf8"), vote("light", "#4338ca")])!;
    expect(c).toMatchObject({ mode: "both", modeVotes: { light: 2, dark: 1, ambiguous: 0 }, accent: { hex: "#4f46e5", votes: 3 }, agreement: { accent: 1 }, consistency: 1 });
    expect(c.warnings).toEqual([{ code: "screenshots-mode-mixed", detail: "light ×2 · dark ×1" }]);
  });

  it("votes the accent and warns when the captures disagree", () => {
    const c = aggregateScreenshots([vote("light", "#f97316"), vote("light", "#4f46e5"), vote("light", "#4338ca"), vote("light")])!;
    expect(c.accent).toEqual({ hex: "#4f46e5", votes: 2 });
    expect(c.accentVotes).toEqual([
      { hex: "#4f46e5", votes: 2 },
      { hex: "#f97316", votes: 1 },
    ]);
    expect(c.agreement.accent).toBeCloseTo(2 / 3, 3);
    expect(c.warnings).toEqual([{ code: "screenshots-accent-mixed", detail: "#4f46e5 ×2 · #f97316 ×1" }]);
    expect(c.mode).toBe("light");
  });

  it("averages the gray tint, flags warm against cool, and takes the median vibrancy", () => {
    const c = aggregateScreenshots([
      vote("light", undefined, { h: 250, c: 0.012 }, { c: 0.2, l: 0.5 }),
      vote("light", undefined, { h: 260, c: 0.01 }, { c: 0.1, l: 0.7 }),
      vote("dark", undefined, { h: 60, c: 0.008 }, { c: 0.16, l: 0.6 }),
      vote("ambiguous", undefined, { h: 0, c: 0 }, { c: 0, l: 0 }),
    ])!;
    expect(c.agreement.tint).toBeCloseTo(2 / 3, 3);
    expect(c.warnings).toContainEqual({ code: "screenshots-tint-mixed", detail: "h250 ×2 · h60 ×1" });
    expect(c.neutralTint.h).toBeGreaterThan(240);
    expect(c.neutralTint.h).toBeLessThan(275);
    expect(c.vibrancy).toEqual({ c: 0.16, l: 0.6 });
    expect(c.accent).toBeUndefined();
    expect(c.consistency).toBeCloseTo(0.667, 3);
  });
});

describe("castBatchVote", () => {
  const batch: BatchFile[] = [
    { name: "a.png", sourceId: "s-a", format: "png", parserId: "screenshot" },
    { name: "g.css", sourceId: "c-g", format: "css", parserId: "css" },
    { name: "b.png", sourceId: "s-b", format: "png", parserId: "screenshot" },
    { name: "c.png", sourceId: "s-c", format: "png", parserId: "screenshot" },
  ];

  it("answers once every screenshot of the batch voted; ties follow the batch order, not the parse order", () => {
    expect(castBatchVote(batch, "s-c", { vote: vote("light", "#f97316"), reference: false })).toBeNull();
    expect(castBatchVote(batch, "s-a", { vote: vote("light", "#4f46e5"), reference: false })).toBeNull();
    const done = castBatchVote(batch, "s-b", { vote: null, reference: false });
    expect(done).toMatchObject({ count: 2, accentVotes: [{ hex: "#4f46e5" }, { hex: "#f97316" }] });
  });

  it("leaves references out and needs two own screenshots", () => {
    const other = [...batch];
    castBatchVote(other, "s-a", { vote: vote("light", "#4f46e5"), reference: false });
    castBatchVote(other, "s-b", { vote: vote("dark", "#f97316"), reference: true });
    expect(castBatchVote(other, "s-c", { vote: null, reference: false })).toBeNull();
    expect(castBatchVote(other, "s-x", { vote: vote("light"), reference: false })).toBeNull();
  });
});
