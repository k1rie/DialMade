import { describe, expect, it } from "vitest";
import { FULL_INSET, REVEAL_TIMING, insetFrom, planReveal, rectIn } from "./revealPlan";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `b${i}`);

describe("planReveal", () => {
  it("one step per block, in reading order, never decreasing", () => {
    for (const n of [1, 2, 5, 12, 40, 200]) {
      const plan = planReveal(ids(n));
      expect(plan.steps.map((step) => step.id)).toEqual(ids(n));
      for (let i = 1; i < plan.steps.length; i++) expect(plan.steps[i]!.delayMs).toBeGreaterThanOrEqual(plan.steps[i - 1]!.delayMs);
    }
  });

  it("the page leads, then the first block; the whole moment fits in 900 ms for any size", () => {
    for (let n = 0; n <= 300; n++) {
      const plan = planReveal(ids(n));
      expect(plan.totalMs).toBeLessThanOrEqual(REVEAL_TIMING.totalMs);
      if (n > 0) {
        expect(plan.steps[0]!.delayMs).toBe(REVEAL_TIMING.leadMs);
        expect(plan.steps[n - 1]!.delayMs + plan.itemMs).toBe(plan.totalMs);
      }
    }
  });

  it("the stagger stays between 30 and 40 ms and each section opens in 260–380 ms", () => {
    for (let n = 2; n <= 300; n++) {
      const plan = planReveal(ids(n));
      expect(plan.staggerMs).toBeGreaterThanOrEqual(30);
      expect(plan.staggerMs).toBeLessThanOrEqual(40);
      expect(plan.itemMs).toBeGreaterThanOrEqual(REVEAL_TIMING.minItemMs);
      expect(plan.itemMs).toBeLessThanOrEqual(REVEAL_TIMING.itemMs);
      // Consecutive delays differ by 0 (same wave) or exactly one stagger.
      for (let i = 1; i < n; i++) expect([0, plan.staggerMs]).toContain(plan.steps[i]!.delayMs - plan.steps[i - 1]!.delayMs);
    }
  });

  it("short layouts: one block per wave at 35 ms, full-length clips", () => {
    const plan = planReveal(ids(10));
    expect(plan.staggerMs).toBe(35);
    expect(plan.itemMs).toBe(380);
    expect(plan.steps.map((step) => step.delayMs)).toEqual(ids(10).map((_, i) => 60 + i * 35));
  });

  it("long layouts reveal in waves of consecutive blocks", () => {
    const plan = planReveal(ids(200));
    const delays = new Set(plan.steps.map((step) => step.delayMs));
    expect(delays.size).toBeLessThan(200);
    expect(delays.size).toBeGreaterThan(10);
    // A wave is a run of consecutive blocks.
    const firstOf = new Map<number, number>();
    plan.steps.forEach((step, index) => {
      if (!firstOf.has(step.delayMs)) firstOf.set(step.delayMs, index);
    });
    const starts = [...firstOf.values()];
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("reduced motion: a single 150 ms fade, no stagger", () => {
    const plan = planReveal(ids(30), { reduced: true });
    expect(plan.reduced).toBe(true);
    expect(plan.totalMs).toBe(150);
    expect(plan.baseMs).toBe(150);
    expect(plan.staggerMs).toBe(0);
    expect(plan.steps.every((step) => step.delayMs === 0)).toBe(true);
  });

  it("no blocks: only the page fade", () => {
    const plan = planReveal([]);
    expect(plan.steps).toEqual([]);
    expect(plan.totalMs).toBe(REVEAL_TIMING.baseMs);
  });
});

describe("insetFrom", () => {
  it("clips the section to the part under the box, in the section's own (unscaled) px", () => {
    const section = { left: 10, top: 20, width: 200, height: 100 };
    const box = { left: 30, top: 40, width: 100, height: 40 };
    // Scale 0.5: 20 screen px = 40 page px.
    expect(insetFrom(box, section, 0.5)).toBe("inset(40px 160px 80px 40px)");
    expect(insetFrom(box, section, 1)).toBe("inset(20px 80px 40px 20px)");
  });

  it("the box covering the whole section, or reaching past it, leaves those sides open", () => {
    const section = { left: 10, top: 20, width: 200, height: 100 };
    expect(insetFrom({ left: 0, top: 0, width: 400, height: 400 }, section, 1)).toBe(FULL_INSET);
    expect(insetFrom({ left: 0, top: 50, width: 400, height: 400 }, section, 1)).toBe("inset(30px 0px 0px 0px)");
  });

  it("a box that misses the section collapses the clip to a line, never to negative sizes", () => {
    const section = { left: 0, top: 0, width: 100, height: 100 };
    const below = insetFrom({ left: 0, top: 300, width: 100, height: 50 }, section, 1);
    expect(below).toBe("inset(100px 0px 0px 0px)");
    const left = insetFrom({ left: -200, top: 0, width: 50, height: 100 }, section, 1);
    expect(left).toBe("inset(0px 100px 0px 0px)");
  });

  it("a bad scale falls back to 1 and values are rounded", () => {
    expect(insetFrom({ left: 1 / 3, top: 0, width: 10, height: 10 }, { left: 0, top: 0, width: 20, height: 10 }, 0)).toBe(
      "inset(0px 9.67px 0px 0.33px)",
    );
  });
});

describe("rectIn", () => {
  it("moves a client rect into its origin's coordinates", () => {
    expect(rectIn({ left: 120, top: 80, width: 10, height: 20 }, { left: 100, top: 50 })).toEqual({ left: 20, top: 30, width: 10, height: 20 });
  });
});
