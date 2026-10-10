import { describe, expect, it, vi } from "vitest";
import { ENCODE_LEVELS, VisionImageError, bytesToBase64, cropFromProbe, fitToBudget, opaqueBounds, scaleToFit, type EncodeLevel, type EncodedImage } from "./image";

/** RGBA where `opaque(x, y)` decides alpha 255 or 0. */
function pixels(width: number, height: number, opaque: (x: number, y: number) => boolean): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[(y * width + x) * 4 + 3] = opaque(x, y) ? 255 : 0;
  return data;
}

describe("scaleToFit", () => {
  it("brings the long side down to the limit and never upscales", () => {
    expect(scaleToFit(2560, 1600, 1280)).toEqual({ width: 1280, height: 800 });
    expect(scaleToFit(800, 3000, 1280)).toEqual({ width: 341, height: 1280 });
    expect(scaleToFit(640, 400, 1280)).toEqual({ width: 640, height: 400 });
  });
});

describe("opaqueBounds and cropFromProbe (macOS window captures)", () => {
  it("finds the opaque box, or null when nothing is opaque", () => {
    expect(opaqueBounds(pixels(10, 8, (x, y) => x >= 2 && x <= 7 && y >= 1 && y <= 5), 10, 8)).toEqual({ x: 2, y: 1, width: 6, height: 5 });
    expect(opaqueBounds(pixels(4, 4, () => false), 4, 4)).toBeNull();
  });

  it("keeps a fully opaque screenshot whole", () => {
    const probe = { width: 320, height: 200 };
    const bounds = opaqueBounds(pixels(320, 200, () => true), 320, 200);
    expect(cropFromProbe(bounds, probe, { width: 2560, height: 1600 })).toEqual({ x: 0, y: 0, width: 2560, height: 1600 });
  });

  it("crops a transparent margin, one probe pixel inward on the sides that had one", () => {
    const probe = { width: 320, height: 200 };
    const bounds = { x: 10, y: 0, width: 300, height: 190 };
    expect(cropFromProbe(bounds, probe, { width: 640, height: 400 })).toEqual({ x: 22, y: 0, width: 596, height: 378 });
    expect(cropFromProbe(null, probe, { width: 640, height: 400 })).toEqual({ x: 0, y: 0, width: 640, height: 400 });
    expect(cropFromProbe({ x: 100, y: 100, width: 3, height: 3 }, probe, { width: 640, height: 400 })).toEqual({ x: 0, y: 0, width: 640, height: 400 });
  });
});

describe("bytesToBase64", () => {
  it("matches Buffer, also past one chunk", () => {
    const bytes = Uint8Array.from({ length: 70_000 }, (_, i) => (i * 31) % 256);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    expect(bytesToBase64(new Uint8Array())).toBe("");
  });
});

describe("fitToBudget", () => {
  /** A fake encoder: the size depends on the level, per image. */
  const encoder = (sizes: number[][]) =>
    vi.fn(async (index: number, level: EncodeLevel): Promise<EncodedImage> => {
      const bytes = sizes[index]![ENCODE_LEVELS.indexOf(level)]!;
      return { mediaType: "image/jpeg", data: "A".repeat(Math.ceil(bytes / 3) * 4), bytes, width: level.maxSide, height: 600 };
    });
  const limits = { imageBytes: 900, totalBase64: 2000, levels: ENCODE_LEVELS };

  it("starts at 1280 px q0.85 and steps an image down only while it is over its own limit", async () => {
    const encode = encoder([
      [500, 400, 300, 200],
      [1200, 950, 800, 600],
    ]);
    const images = await fitToBudget(2, encode, limits);
    expect(images.map((image) => image.bytes)).toEqual([500, 800]);
    expect(encode.mock.calls.map(([index, level]) => [index, level.maxSide, level.quality])).toEqual([
      [0, 1280, 0.85],
      [1, 1280, 0.85],
      [1, 1024, 0.85],
      [1, 1024, 0.72],
    ]);
  });

  it("then steps the largest image down until the request fits", async () => {
    const encode = encoder([
      [800, 600, 400, 300],
      [700, 500, 450, 300],
      [100, 90, 80, 70],
    ]);
    const images = await fitToBudget(3, encode, limits);
    const total = images.reduce((sum, image) => sum + image.data.length, 0);
    expect(total).toBeLessThanOrEqual(2000);
    expect(images.map((image) => image.bytes)).toEqual([600, 700, 100]);
  });

  it("throws too-large when even the last level does not fit", async () => {
    await expect(fitToBudget(1, encoder([[2000, 1900, 1800, 1700]]), limits)).rejects.toBeInstanceOf(VisionImageError);
    await expect(
      fitToBudget(
        4,
        encoder([
          [800, 800, 800, 800],
          [800, 800, 800, 800],
          [800, 800, 800, 800],
          [800, 800, 800, 800],
        ]),
        limits,
      ),
    ).rejects.toMatchObject({ code: "too-large" });
  });
});
