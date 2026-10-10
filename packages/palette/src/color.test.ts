import { formatHex, formatHex8, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  cuspLightness,
  ensureContrast,
  formatOklch,
  hueDelta,
  isInSrgb,
  maxChroma,
  oklchOf,
  oklchToHex,
  parseColor,
  parseColorWithAlpha,
  pullHue,
  splitAlpha,
} from "./color";
import { mulberry32, randomHex } from "./testing/fixtures";

const rand = mulberry32(1234);
const samples = Array.from({ length: 300 }, () => randomHex(rand)).concat(["#000000", "#ffffff", "#808080", "#ff0000"]);

describe("color math", () => {
  it("matches culori's OKLCH conversion", () => {
    for (const hex of samples) {
      const ours = oklchOf(hex);
      const theirs = parse(`oklch(${ours.l} ${ours.c} ${ours.h})`);
      expect(formatHex(theirs)).toBe(hex);
    }
  });

  it("matches culori's WCAG contrast", () => {
    for (let i = 1; i < samples.length; i++) {
      expect(contrastRatio(samples[i]!, samples[i - 1]!)).toBeCloseTo(wcagContrast(samples[i]!, samples[i - 1]!), 10);
    }
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 10);
  });

  it("formats OKLCH strings that round-trip to the exact hex", () => {
    for (const hex of samples) {
      const css = formatOklch(hex);
      expect(css).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
      expect(formatHex(parse(css))).toBe(hex);
    }
    expect(formatOklch("#ffffff")).toBe("oklch(1 0 0)");
    expect(formatOklch("#000000")).toBe("oklch(0 0 0)");
  });

  it("parses CSS colors to normalized hex", () => {
    expect(parseColor("#ABC")).toBe("#aabbcc");
    expect(parseColor(" Tomato ")).toBe("#ff6347");
    expect(parseColor("rgb(255 0 0)")).toBe("#ff0000");
    expect(parseColor("oklch(0.7 0.1 200)")).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseColor("nope")).toBeNull();
  });

  it("gamut-maps to sRGB keeping lightness and hue", () => {
    const out = oklchOf(oklchToHex({ l: 0.7, c: 0.4, h: 150 }));
    expect(out.l).toBeCloseTo(0.7, 2);
    expect(Math.abs(hueDelta(150, out.h))).toBeLessThan(1.5);
    expect(oklchToHex({ l: 1.2, c: 0.1, h: 10 })).toBe("#ffffff");
    expect(oklchToHex({ l: -1, c: 0.1, h: 10 })).toBe("#000000");
  });

  it("finds the max chroma and the cusp of a hue", () => {
    const c = maxChroma(0.6, 30);
    expect(isInSrgb({ l: 0.6, c, h: 30 })).toBe(true);
    expect(isInSrgb({ l: 0.6, c: c + 0.01, h: 30 })).toBe(false);
    expect(cuspLightness(oklchOf("#0000ff").h)).toBeCloseTo(oklchOf("#0000ff").l, 1);
    expect(cuspLightness(oklchOf("#ffff00").h)).toBeGreaterThan(0.9);
  });

  it("measures and limits hue rotation", () => {
    expect(hueDelta(350, 10)).toBe(20);
    expect(hueDelta(10, 350)).toBe(-20);
    expect(pullHue(250, 60, 0.35, 13)).toBeCloseTo(263, 6);
    expect(pullHue(100, 60, 0.35, 13)).toBeCloseTo(87, 6);
    expect(pullHue(40, 60, 0.5, 15)).toBeCloseTo(50, 6);
  });

  it("moves lightness just enough to reach a contrast target", () => {
    for (const hex of samples) {
      for (const bg of ["#ffffff", "#0a0a0a"]) {
        const fixed = ensureContrast(hex, [{ bg, ratio: 4.5 }]);
        expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(4.5);
        if (contrastRatio(hex, bg) >= 4.5) expect(fixed).toBe(hex);
      }
    }
    const fixed = oklchOf(ensureContrast("#ff9900", [{ bg: "#ffffff", ratio: 4.5 }]));
    expect(Math.abs(hueDelta(oklchOf("#ff9900").h, fixed.h))).toBeLessThan(2);
  });

  it("keeps alpha as #rrggbbaa and round-trips it through oklch()", () => {
    expect(parseColorWithAlpha("oklch(1 0 0 / 10%)")).toBe("#ffffff1a");
    expect(parseColorWithAlpha("oklch(1 0 0 / 15%)")).toBe("#ffffff26");
    expect(parseColorWithAlpha("rgb(0 0 0 / 0.5)")).toBe("#00000080");
    expect(parseColorWithAlpha(" #3A5BD9 ")).toBe("#3a5bd9");
    expect(parseColorWithAlpha("#3A5BD9FF")).toBe("#3a5bd9");
    expect(parseColorWithAlpha("#3a5bd980")).toBe("#3a5bd980");
    expect(parseColorWithAlpha("oklch(0.7 0.1 200 / 1)")).toBe(parseColor("oklch(0.7 0.1 200)"));
    expect(parseColorWithAlpha("nope")).toBeNull();
    expect(parseColor("oklch(1 0 0 / 10%)")).toBe("#ffffff");

    expect(splitAlpha("#ffffff1a")).toEqual({ hex: "#ffffff", alpha: 0.1 });
    expect(splitAlpha("#ffffff26")).toEqual({ hex: "#ffffff", alpha: 0.15 });
    expect(splitAlpha("#3a5bd9")).toEqual({ hex: "#3a5bd9", alpha: 1 });
    expect(formatOklch("#ffffff1a")).toBe("oklch(1 0 0 / 0.1)");

    for (const [i, hex] of samples.entries()) {
      const color = `${hex}${(i % 255).toString(16).padStart(2, "0")}`;
      const css = formatOklch(color);
      expect(css).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+ \/ [\d.]+\)$/);
      expect(formatHex8(parse(css))).toBe(color);
      expect(parseColorWithAlpha(css)).toBe(color);
    }
  });

  it("measures translucent colors painted over their background", () => {
    expect(compositeOver("#ffffff1a", "#0a0a0a")).toBe("#232323");
    expect(compositeOver("#3a5bd9", "#0a0a0a")).toBe("#3a5bd9");
    expect(compositeOver("#00000000", "#3a5bd9")).toBe("#3a5bd9");
    expect(contrastRatio("#ffffff1a", "#0a0a0a")).toBeCloseTo(contrastRatio("#232323", "#0a0a0a"), 10);
    expect(contrastRatio("#ffffff1a", "#0a0a0a")).toBeLessThan(1.5);
    expect(contrastRatio("#000000", "#ffffff00")).toBeCloseTo(21, 10);
    const fixed = ensureContrast("#ffffff1a", [{ bg: "#0a0a0a", ratio: 3 }]);
    expect(fixed).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(fixed, "#0a0a0a")).toBeGreaterThanOrEqual(3);
  });
});
