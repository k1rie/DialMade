import { formatHex, parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import {
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
  pullHue,
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
});
