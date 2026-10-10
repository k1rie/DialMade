import { formatHex, parse } from "culori";
import { describe, expect, it } from "vitest";
import { hueDelta, oklchOf } from "./color";
import { SCALE_STEPS, buildNeutralScale, buildScale } from "./scale";
import { mulberry32, randomHex } from "./testing/fixtures";

const rand = mulberry32(99);
const SEEDS = [
  "#e11d48",
  "#3a5bd9",
  "#ff9900",
  "#1db954",
  "#facc15",
  "#0b1d51",
  "#7f00ff",
  "#f0f4ff",
  "#1a1a1a",
  "#808080",
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00ffff",
  ...Array.from({ length: 150 }, () => randomHex(rand)),
];

describe("buildScale", () => {
  it.each(SEEDS)("%s: exact anchor, strictly decreasing L, valid hex", (seed) => {
    const { steps, anchorStep } = buildScale(seed);
    expect(steps.map((s) => s.step)).toEqual([...SCALE_STEPS]);
    expect(steps.find((s) => s.step === anchorStep)?.hex).toBe(seed);

    const lightness = steps.map((s) => oklchOf(s.hex).l);
    for (let i = 1; i < lightness.length; i++) expect(lightness[i]!).toBeLessThan(lightness[i - 1]!);

    for (const s of steps) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(formatHex(parse(s.oklch))).toBe(s.hex);
    }
  });

  it("anchors extremes at the ends of the scale", () => {
    expect(buildScale("#000000").anchorStep).toBe(950);
    expect(buildScale("#ffffff").anchorStep).toBe(50);
    expect(buildScale("#171717").anchorStep).toBe(900);
  });

  it("follows the chroma bell without exceeding 1.15× the seed chroma", () => {
    for (const seed of SEEDS) {
      const c = oklchOf(seed).c;
      for (const s of buildScale(seed).steps) expect(oklchOf(s.hex).c).toBeLessThanOrEqual(c * 1.15 + 0.004);
    }
    const scale = buildScale("#e11d48").steps;
    expect(oklchOf(scale[0]!.hex).c).toBeLessThan(oklchOf(scale[5]!.hex).c);
    expect(oklchOf(scale[10]!.hex).c).toBeLessThan(oklchOf(scale[5]!.hex).c);
  });

  it("keeps the seed hue on chromatic steps (yellows drift at most maxHueDrift in the darks)", () => {
    for (const seed of SEEDS) {
      const seedColor = oklchOf(seed);
      if (seedColor.c < 0.04) continue;
      for (const s of buildScale(seed).steps) {
        const step = oklchOf(s.hex);
        if (step.c < 0.04) continue;
        expect(Math.abs(hueDelta(seedColor.h, step.h))).toBeLessThanOrEqual(14);
      }
    }
    const yellow = oklchOf("#facc15");
    const flat = buildScale("#facc15", { maxHueDrift: 0 }).steps;
    for (const s of flat.slice(3)) expect(Math.abs(hueDelta(yellow.h, oklchOf(s.hex).h))).toBeLessThan(2);
    const drifted = oklchOf(buildScale("#facc15").steps[9]!.hex);
    expect(hueDelta(yellow.h, drifted.h)).toBeLessThan(-5);
  });

  it("gray seeds give a gray scale; #171717 reproduces Tailwind's neutral", () => {
    for (const s of buildScale("#808080").steps) expect(oklchOf(s.hex).c).toBeLessThan(0.002);
    const neutral = buildScale("#171717").steps.map((s) => s.hex);
    expect(neutral).toEqual(["#fafafa", "#f5f5f5", "#e5e5e5", "#d4d4d4", "#a1a1a1", "#737373", "#525252", "#404040", "#262626", "#171717", "#0a0a0a"]);
  });

  it("rejects invalid seeds", () => {
    expect(() => buildScale("not a color")).toThrow(TypeError);
  });
});

describe("buildNeutralScale", () => {
  it("is a tinted neutral with chroma in the 0.005–0.02 band and decreasing L", () => {
    const steps = buildNeutralScale(265, 0.015);
    const colors = steps.map((s) => oklchOf(s.hex));
    for (let i = 1; i < colors.length; i++) expect(colors[i]!.l).toBeLessThan(colors[i - 1]!.l);
    for (const c of colors.slice(1, -1)) {
      expect(c.c).toBeGreaterThanOrEqual(0.004);
      expect(c.c).toBeLessThanOrEqual(0.02);
    }
    expect(buildNeutralScale(0, 0).map((s) => s.hex)[5]).toBe("#737373");
  });
});
