import { LOGO_EMPTY_ALPHA, decodeLogo, logoTone, type CropRect, type FlowLogo, type LogoTone } from "@/lib/image";

export type LogoAnalysis = {
  /** Normalized bounds of the mark (transparent or flat background trimmed); null when there is nothing to trim. */
  box: CropRect | null;
  /** Average lightness of the mark: dark marks read best on a light backdrop. */
  tone: LogoTone;
};

const BACKGROUND_DISTANCE = 34;
const UNIFORM_SHARE = 0.7;
const TRANSPARENT_SHARE = 0.6;

const distance = (data: Uint8ClampedArray, i: number, [r, g, b]: readonly [number, number, number]) =>
  Math.hypot((data[i] ?? 0) - r, (data[i + 1] ?? 0) - g, (data[i + 2] ?? 0) - b);

/** Finds the mark's bounding box and tone on a ≤160 px decode (same decoder the extraction uses). */
export async function analyzeLogo(logo: FlowLogo, maxSize = 160): Promise<LogoAnalysis> {
  const { data, width, height } = await decodeLogo(logo, { maxSize });
  const at = (x: number, y: number) => (y * width + x) * 4;

  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(at(x, 0), at(x, height - 1));
  for (let y = 1; y < height - 1; y++) border.push(at(0, y), at(width - 1, y));

  let transparent = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const i of border) {
    if ((data[i + 3] ?? 0) < LOGO_EMPTY_ALPHA) {
      transparent++;
      continue;
    }
    r += data[i] ?? 0;
    g += data[i + 1] ?? 0;
    b += data[i + 2] ?? 0;
  }
  const opaque = border.length - transparent;
  let background: [number, number, number] | null = null;
  let trimmable = transparent / border.length >= TRANSPARENT_SHARE;
  if (!trimmable && opaque > 0) {
    const mean: [number, number, number] = [r / opaque, g / opaque, b / opaque];
    const close = border.filter((i) => (data[i + 3] ?? 0) >= LOGO_EMPTY_ALPHA && distance(data, i, mean) < BACKGROUND_DISTANCE).length;
    if (close / border.length >= UNIFORM_SHARE) {
      background = mean;
      trimmable = true;
    }
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      const alpha = data[i + 3] ?? 0;
      if (alpha < LOGO_EMPTY_ALPHA || (background && distance(data, i, background) < BACKGROUND_DISTANCE)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const tone: LogoTone = logoTone(data, (i) => !background || distance(data, i, background) >= BACKGROUND_DISTANCE);
  if (!trimmable || maxX < 0) return { box: null, tone };

  const pad = Math.max(maxX - minX, maxY - minY) * 0.06 + 1;
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const x1 = Math.min(width, maxX + 1 + pad);
  const y1 = Math.min(height, maxY + 1 + pad);
  return { box: { x: x0 / width, y: y0 / height, w: (x1 - x0) / width, h: (y1 - y0) / height }, tone };
}
