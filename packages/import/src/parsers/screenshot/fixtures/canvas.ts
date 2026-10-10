/** A tiny RGBA painter for synthetic screenshots (no DOM, no encoder). */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function rgbOf(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function canvas(width: number, height: number, fill?: string, alpha = 255): Pixels {
  const p = { data: new Uint8ClampedArray(width * height * 4), width, height };
  if (fill) rect(p, 0, 0, width, height, fill, alpha);
  return p;
}

/** Fills a rectangle (clipped to the canvas). */
export function rect(p: Pixels, x: number, y: number, w: number, h: number, color: string, alpha = 255): void {
  const [r, g, b] = rgbOf(color);
  for (let yy = Math.max(0, y); yy < Math.min(p.height, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(p.width, x + w); xx++) {
      const i = (yy * p.width + xx) * 4;
      p.data[i] = r;
      p.data[i + 1] = g;
      p.data[i + 2] = b;
      p.data[i + 3] = alpha;
    }
  }
}

/** One-pixel frame. */
export function frame(p: Pixels, x: number, y: number, w: number, h: number, color: string): void {
  rect(p, x, y, w, 1, color);
  rect(p, x, y + h - 1, w, 1, color);
  rect(p, x, y, 1, h, color);
  rect(p, x + w - 1, y, 1, h, color);
}

/** Text as solid bars: `lines` bars of `thickness` px every `pitch` px. */
export function textLines(p: Pixels, x: number, y: number, widths: readonly number[], color: string, thickness = 2, pitch = 8): void {
  widths.forEach((w, i) => rect(p, x, y + i * pitch, w, thickness, color));
}

/** Pixels painted with `color` (exact match, opaque). */
export function countColor(p: Pixels, color: string): number {
  const [r, g, b] = rgbOf(color);
  let n = 0;
  for (let i = 0; i < p.data.length; i += 4) if (p.data[i] === r && p.data[i + 1] === g && p.data[i + 2] === b && p.data[i + 3] === 255) n++;
  return n;
}

/** Deterministic ±`amplitude` noise per channel (a rough stand-in for JPEG artifacts). */
export function withNoise(p: Pixels, amplitude: number, seed = 7): Pixels {
  const out = { data: new Uint8ClampedArray(p.data), width: p.width, height: p.height };
  let state = seed >>> 0 || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let i = 0; i < out.data.length; i += 4) {
    for (let c = 0; c < 3; c++) out.data[i + c] = out.data[i + c]! + Math.round((next() * 2 - 1) * amplitude);
  }
  return out;
}

/** Puts `p` inside a transparent margin with a translucent black shadow ring, like a macOS window capture. */
export function windowCapture(p: Pixels, margin: number): Pixels {
  const out = canvas(p.width + margin * 2, p.height + margin * 2);
  for (let ring = margin; ring > 0; ring--) {
    const alpha = Math.round(140 * (1 - ring / (margin + 1)));
    rect(out, margin - ring, margin - ring + 4, p.width + ring * 2, p.height + ring * 2, "#000000", alpha);
  }
  for (let y = 0; y < p.height; y++) out.data.set(p.data.subarray(y * p.width * 4, (y + 1) * p.width * 4), ((y + margin) * out.width + margin) * 4);
  return out;
}
