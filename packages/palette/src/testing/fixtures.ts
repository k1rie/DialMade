export type Rgba = [number, number, number, number];
export type Shape = (x: number, y: number) => boolean;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomHex(rand: () => number): string {
  const byte = () => Math.floor(rand() * 256);
  return `#${[byte(), byte(), byte()].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgba(hex: string, alpha = 255): Rgba {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

export class Canvas {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
    fill: Rgba = [0, 0, 0, 0],
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) this.data.set(fill, i * 4);
  }

  get(x: number, y: number): Rgba {
    const i = (y * this.width + x) * 4;
    return [this.data[i]!, this.data[i + 1]!, this.data[i + 2]!, this.data[i + 3]!];
  }

  set(x: number, y: number, color: Rgba): void {
    this.data.set(color, (y * this.width + x) * 4);
  }

  /** Source-over compositing with 4×4 supersampled coverage, like a browser rasterizer. */
  draw(shape: Shape, color: string | ((x: number, y: number) => Rgba)): this {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let hits = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (shape(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) hits++;
        if (hits === 0) continue;
        const src = typeof color === "string" ? hexToRgba(color) : color(x, y);
        const alpha = (hits / 16) * (src[3] / 255);
        const dst = this.get(x, y);
        const dstA = dst[3] / 255;
        const outA = alpha + dstA * (1 - alpha);
        const channel = (i: 0 | 1 | 2) =>
          outA === 0 ? 0 : Math.round((src[i] * alpha + dst[i] * dstA * (1 - alpha)) / outA);
        this.set(x, y, [channel(0), channel(1), channel(2), Math.round(outA * 255)]);
      }
    }
    return this;
  }
}

export const circle = (cx: number, cy: number, r: number): Shape => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

export const rect = (x0: number, y0: number, x1: number, y1: number): Shape => (x, y) =>
  x >= x0 && x < x1 && y >= y0 && y < y1;

export const ring = (cx: number, cy: number, inner: number, outer: number): Shape => (x, y) => {
  const d = (x - cx) ** 2 + (y - cy) ** 2;
  return d <= outer * outer && d >= inner * inner;
};

export function lerpHex(a: string, b: string, t: number): Rgba {
  const ca = hexToRgba(a);
  const cb = hexToRgba(b);
  return [0, 1, 2].map((i) => Math.round(ca[i]! + (cb[i]! - ca[i]!) * t)).concat(255) as Rgba;
}

export function jitter(color: string, rand: () => number, amount: number): Rgba {
  const [r, g, b] = hexToRgba(color);
  const n = () => Math.round((rand() * 2 - 1) * amount);
  return [r + n(), g + n(), b + n(), 255].map((v) => Math.max(0, Math.min(255, v))) as Rgba;
}
