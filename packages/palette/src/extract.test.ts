import { describe, expect, it } from "vitest";
import { deltaEOK, hexToOklab, hueDelta, oklchOf } from "./color";
import { extractFromPixels, type ExtractResult } from "./extract";
import { Canvas, circle, jitter, lerpHex, mulberry32, rect, type Rgba } from "./testing/fixtures";

const BLUE = "#2f5bd3";
const AMBER = "#f0a024";
const W = 160;
const H = 120;

const whiteCanvas = () => new Canvas(W, H, [255, 255, 255, 255]);
const twoColorLogo = (canvas: Canvas) =>
  canvas.draw(circle(50, 60, 40), BLUE).draw(rect(100, 30, 150, 90), AMBER);

function expectWellFormed(result: ExtractResult) {
  const total = result.swatches.reduce((sum, s) => sum + s.coverage, 0);
  expect(total).toBeLessThanOrEqual(1 + 1e-9);
  expect(result.swatches.length).toBeLessThanOrEqual(8);
  for (const s of result.swatches) {
    expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.coverage).toBeGreaterThanOrEqual(0.015);
    expect(Number.isFinite(s.oklch.l + s.oklch.c + s.oklch.h)).toBe(true);
  }
  const coverages = result.swatches.map((s) => s.coverage);
  expect(coverages).toEqual([...coverages].sort((a, b) => b - a));
  expect(JSON.stringify(result)).not.toContain("NaN");
}

describe("extractFromPixels", () => {
  it("flat two-color logo on white: exact hexes, white removed as background", () => {
    const result = extractFromPixels(twoColorLogo(whiteCanvas()).data, W, H);
    expectWellFormed(result);
    expect(result.method).toBe("histogram");
    expect(result.background).toBe("#ffffff");
    expect(result.swatches.map((s) => s.hex)).toEqual([BLUE, AMBER]);
    expect(result.swatches[0]!.coverage).toBeCloseTo(0.6, 1);
    expect(result.seeds.primary.hex).toBe(BLUE);
    expect(result.seeds.secondary?.hex).toBe(AMBER);
    expect(result.achromatic).toBe(false);
  });

  it("same logo on a transparent canvas gives the same seeds and no background", () => {
    const result = extractFromPixels(twoColorLogo(new Canvas(W, H)).data, W, H);
    expectWellFormed(result);
    expect(result.background).toBeUndefined();
    expect(result.swatches.map((s) => s.hex)).toEqual([BLUE, AMBER]);
    expect(result.seeds.primary.hex).toBe(BLUE);
    expect(result.seeds.secondary?.hex).toBe(AMBER);
  });

  it("gradient logo goes through k-means and stays inside the gradient's hue range", () => {
    const from = "#2f6bff";
    const to = "#b03ae0";
    const canvas = new Canvas(160, 80).draw(rect(4, 4, 156, 76), (x) => lerpHex(from, to, (x - 4) / 152));
    const result = extractFromPixels(canvas.data, 160, 80);
    expectWellFormed(result);
    expect(result.method).toBe("kmeans");
    expect(result.swatches.length).toBeGreaterThanOrEqual(3);
    const h0 = oklchOf(from).h;
    const span = hueDelta(h0, oklchOf(to).h);
    for (const s of result.swatches) {
      const d = hueDelta(h0, s.oklch.h);
      expect(d).toBeGreaterThanOrEqual(-3);
      expect(d).toBeLessThanOrEqual(span + 3);
    }
    expect(result.achromatic).toBe(false);
    expect(result.seeds.secondary).toBeDefined();
  });

  it("black logo is achromatic and uses its near-black as primary", () => {
    const canvas = whiteCanvas().draw(circle(40, 60, 30), "#000000").draw(rect(80, 40, 150, 80), "#3a3a3a");
    const result = extractFromPixels(canvas.data, W, H);
    expectWellFormed(result);
    expect(result.achromatic).toBe(true);
    expect(result.seeds.primary.hex).toBe("#000000");
    expect(result.seeds.secondary).toBeUndefined();
  });

  it("white-only logo falls back to shadcn's near-black primary", () => {
    const canvas = new Canvas(W, H).draw(circle(80, 60, 40), "#ffffff");
    const result = extractFromPixels(canvas.data, W, H);
    expect(result.achromatic).toBe(true);
    expect(result.seeds.primary.hex).toBe("#171717");
  });

  it("small brand accent wins over a large black wordmark", () => {
    const canvas = whiteCanvas().draw(rect(10, 40, 130, 80), "#111111").draw(circle(145, 60, 7), "#e2581a");
    const result = extractFromPixels(canvas.data, W, H);
    expectWellFormed(result);
    expect(result.achromatic).toBe(false);
    expect(result.seeds.primary.hex).toBe("#e2581a");
    expect(result.seeds.primary.coverage).toBeLessThan(0.05);
  });

  it("photo-like noise: bounded, deterministic swatches with a chromatic primary", () => {
    const build = () => {
      const rand = mulberry32(42);
      return new Canvas(96, 96)
        .draw(rect(0, 0, 96, 96), (_x, y) => {
          const base = lerpHex("#6fa8dc", "#d9ead3", y / 95);
          const n = jitter("#808080", rand, 16);
          return base.map((v, i) => (i === 3 ? 255 : Math.max(0, Math.min(255, v + n[i]! - 128)))) as Rgba;
        })
        .draw(circle(48, 48, 22), () => jitter("#c0392b", rand, 16));
    };
    const a = extractFromPixels(build().data, 96, 96);
    const b = extractFromPixels(build().data, 96, 96);
    expectWellFormed(a);
    expect(a).toEqual(b);
    expect(a.method).toBe("kmeans");
    expect(a.background).toBeUndefined();
    expect(a.swatches.length).toBeGreaterThanOrEqual(2);
    expect(a.seeds.primary.oklch.c).toBeGreaterThanOrEqual(0.04);
    expect(deltaEOK(hexToOklab(a.seeds.primary.hex), hexToOklab("#c0392b"))).toBeLessThan(0.05);
    const secondary = a.seeds.secondary!;
    expect(
      Math.abs(hueDelta(a.seeds.primary.oklch.h, secondary.oklch.h)) >= 30 ||
        deltaEOK(hexToOklab(a.seeds.primary.hex), hexToOklab(secondary.hex)) >= 0.12,
    ).toBe(true);
  });

  it("snaps noisy clusters to declared SVG colors to keep the exact brand hex", () => {
    const rand = mulberry32(7);
    const canvas = whiteCanvas().draw(circle(50, 60, 40), () => jitter(BLUE, rand, 2));
    const loose = extractFromPixels(canvas.data, W, H);
    expect(deltaEOK(hexToOklab(loose.seeds.primary.hex), hexToOklab(BLUE))).toBeLessThan(0.02);
    const snapped = extractFromPixels(canvas.data, W, H, { declaredColors: ["#2F5BD3", AMBER] });
    expect(snapped.seeds.primary.hex).toBe(BLUE);
    expect(snapped.swatches.map((s) => s.hex)).not.toContain(AMBER);
  });

  it("keeps a chromatic background (app icon tile) as a brand color", () => {
    const canvas = new Canvas(64, 64, [47, 91, 211, 255]).draw(circle(32, 32, 16), "#ffffff");
    const result = extractFromPixels(canvas.data, 64, 64);
    expectWellFormed(result);
    expect(result.background).toBe(BLUE);
    expect(result.seeds.primary.hex).toBe(BLUE);
  });

  it("samples very large images", () => {
    const canvas = new Canvas(2000, 1000, [255, 255, 255, 255]).draw(rect(100, 100, 900, 900), BLUE);
    const result = extractFromPixels(canvas.data, 2000, 1000);
    expect(result.seeds.primary.hex).toBe(BLUE);
  });

  it("handles empty images and rejects bad buffers", () => {
    const empty = extractFromPixels(new Canvas(10, 10).data, 10, 10);
    expect(empty).toMatchObject({ swatches: [], achromatic: true, method: "none" });
    expect(empty.seeds.primary.hex).toBe("#171717");
    expect(() => extractFromPixels(new Uint8ClampedArray(10), 10, 10)).toThrow(RangeError);
    expect(() => extractFromPixels(new Uint8ClampedArray(0), 0, 0)).toThrow(RangeError);
  });
});
