import type { Oklab } from "@dialmade/palette";

/** sRGB byte → linear light, the same transfer the palette engine uses. */
const LINEAR = (() => {
  const table = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    table[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }
  return table;
})();

/** OKLab of a packed `0xRRGGBB` color (same matrices as @dialmade/palette). */
export function oklabOfKey(key: number): Oklab {
  const r = LINEAR[(key >> 16) & 255]!;
  const g = LINEAR[(key >> 8) & 255]!;
  const b = LINEAR[key & 255]!;
  const l = Math.cbrt(0.412221469470763 * r + 0.5363325372617348 * g + 0.0514459932675022 * b);
  const m = Math.cbrt(0.2119034958178252 * r + 0.6806995506452344 * g + 0.1073969535369406 * b);
  const s = Math.cbrt(0.0883024591900564 * r + 0.2817188391361215 * g + 0.6299787016738222 * b);
  return {
    l: 0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s,
    a: 1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s,
    b: 0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s,
  };
}

export const keyOfHex = (hex: string): number => Number.parseInt(hex.slice(1, 7), 16);

export const hexOfKey = (key: number): string => `#${(key & 0xffffff).toString(16).padStart(6, "0")}`;

/** Hue in [0, 360) of an OKLab vector. */
export function hueOf(a: number, b: number): number {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}
