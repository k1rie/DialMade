import { formatHex, parse, toGamut } from "culori";

export type Oklch = { l: number; c: number; h: number };
export type Oklab = { l: number; a: number; b: number };

const SRGB_TO_LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const v = i / 255;
  SRGB_TO_LINEAR[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

const HEX_RE = /^#[0-9a-f]{6}$/;

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const mix = (from: number, to: number, t: number): number => from + (to - from) * t;
export const normalizeHue = (h: number): number => ((h % 360) + 360) % 360;

export function isHex(value: string): boolean {
  return HEX_RE.test(value);
}

/** Any CSS color string → lowercase `#rrggbb` (alpha dropped), or null when unparseable. */
export function parseColor(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (HEX_RE.test(trimmed)) return trimmed;
  const parsed = parse(trimmed);
  if (!parsed) return null;
  const hex = formatHex(parsed);
  return isHex(hex) ? hex : null;
}

export function requireHex(input: string, label = "color"): string {
  const hex = parseColor(input);
  if (!hex) throw new TypeError(`Invalid ${label}: ${JSON.stringify(input)}`);
  return hex;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function linearToOklab(r: number, g: number, b: number): Oklab {
  const l = Math.cbrt(0.412221469470763 * r + 0.5363325372617348 * g + 0.0514459932675022 * b);
  const m = Math.cbrt(0.2119034958178252 * r + 0.6806995506452344 * g + 0.1073969535369406 * b);
  const s = Math.cbrt(0.0883024591900564 * r + 0.2817188391361215 * g + 0.6299787016738222 * b);
  return {
    l: 0.210454268309314 * l + 0.7936177747023054 * m - 0.0040720430116193 * s,
    a: 1.9779985324311684 * l - 2.4285922420485799 * m + 0.450593709617411 * s,
    b: 0.0259040424655478 * l + 0.7827717124575296 * m - 0.8086757549230774 * s,
  };
}

export function oklabToLinear({ l, a, b }: Oklab): [number, number, number] {
  const L = (l + 0.3963377773761749 * a + 0.2158037573099136 * b) ** 3;
  const M = (l - 0.1055613458156586 * a - 0.0638541728258133 * b) ** 3;
  const S = (l - 0.0894841775298119 * a - 1.2914855480194092 * b) ** 3;
  return [
    4.0767416360759574 * L - 3.3077115392580616 * M + 0.2309699031821044 * S,
    -1.2684379732850317 * L + 2.6097573492876887 * M - 0.3413193760026573 * S,
    -0.0041960761386756 * L - 0.7034186179359362 * M + 1.7076146940746117 * S,
  ];
}

export function rgbToOklab(r: number, g: number, b: number): Oklab {
  return linearToOklab(SRGB_TO_LINEAR[r]!, SRGB_TO_LINEAR[g]!, SRGB_TO_LINEAR[b]!);
}

export function oklabToOklch({ l, a, b }: Oklab): Oklch {
  const c = Math.hypot(a, b);
  if (c < 1e-6) return { l, c: 0, h: 0 };
  return { l, c, h: normalizeHue((Math.atan2(b, a) * 180) / Math.PI) };
}

export function oklchToOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

export function hexToOklab(hex: string): Oklab {
  const [r, g, b] = hexToRgb(hex);
  return rgbToOklab(r, g, b);
}

/** Exact OKLCH of a normalized `#rrggbb`. */
export function oklchOf(hex: string): Oklch {
  return oklabToOklch(hexToOklab(hex));
}

/** OKLCH of any CSS color string, or null when it cannot be parsed. */
export function hexToOklch(color: string): Oklch | null {
  const hex = parseColor(color);
  return hex ? oklchOf(hex) : null;
}

const encode = (v: number): number => {
  const c = clamp(v, 0, 1);
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
};

/** Direct OKLCH → hex with per-channel clipping (no gamut mapping). Used for round-trip checks. */
export function oklchToHexClipped(o: Oklch): string {
  const [r, g, b] = oklabToLinear(oklchToOklab(o));
  return rgbToHex(encode(r), encode(g), encode(b));
}

export function isInSrgb(o: Oklch, eps = 1e-7): boolean {
  const [r, g, b] = oklabToLinear(oklchToOklab(o));
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
}

/** Largest chroma at (l, h) that stays inside sRGB. */
export function maxChroma(l: number, h: number): number {
  if (l <= 0 || l >= 1) return 0;
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (isInSrgb({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Lightness where hue `h` reaches its maximum sRGB chroma (the gamut cusp). */
export function cuspLightness(h: number): number {
  let lo = 0.2;
  let hi = 0.99;
  for (let i = 0; i < 40; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (maxChroma(m1, h) < maxChroma(m2, h)) lo = m1;
    else hi = m2;
  }
  return (lo + hi) / 2;
}

// Pure chroma reduction (delta disabled): keeps L and H, which is what brand identity needs.
const gamutMap = toGamut("rgb", "oklch", null);
const hexCache = new Map<string, string>();

/** OKLCH → sRGB hex, gamut-mapped with culori.toGamut('rgb', 'oklch') (chroma reduction at constant L and H). */
export function oklchToHex(o: Oklch): string {
  const l = clamp(o.l, 0, 1);
  const c = Math.max(0, o.c);
  const h = normalizeHue(o.h);
  const key = `${l.toFixed(6)}|${c.toFixed(6)}|${h.toFixed(4)}`;
  let hex = hexCache.get(key);
  if (hex === undefined) {
    hex = formatHex(gamutMap({ mode: "oklch", l, c, h }));
    if (hexCache.size > 50_000) hexCache.clear();
    hexCache.set(key, hex);
  }
  return hex;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * SRGB_TO_LINEAR[r]! + 0.7152 * SRGB_TO_LINEAR[g]! + 0.0722 * SRGB_TO_LINEAR[b]!;
}

/** WCAG 2.x contrast ratio (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function deltaEOK(x: Oklab, y: Oklab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

/** Signed shortest hue difference from `from` to `to`, in (-180, 180]. */
export function hueDelta(from: number, to: number): number {
  const d = normalizeHue(to - from);
  return d > 180 ? d - 360 : d;
}

/** Moves `h` toward `target` by `fraction` of the gap, never more than `cap` degrees. */
export function pullHue(h: number, target: number, fraction: number, cap: number): number {
  const d = hueDelta(h, target);
  return normalizeHue(h + clamp(d * fraction, -cap, cap));
}

const trim = (v: number, digits: number): number => {
  const r = Number(v.toFixed(digits));
  return Object.is(r, -0) ? 0 : r;
};

/**
 * OKLCH components of a hex, rounded to the fewest decimals that still convert back to the
 * exact same hex. Achromatic colors get c = 0 and h = 0.
 */
export function oklchComponents(hex: string): [number, number, number] {
  const o = oklchOf(hex);
  for (let digits = 3; digits <= 8; digits++) {
    const l = trim(o.l, digits);
    const c = o.c < 10 ** -digits ? 0 : trim(o.c, digits);
    const h = c === 0 ? 0 : trim(o.h, Math.max(1, digits - 1));
    if (oklchToHexClipped({ l, c, h }) === hex) return [l, c, h];
  }
  return [o.l, o.c, o.h];
}

/** CSS `oklch(l c h)` string that round-trips to the exact same hex. */
export function formatOklch(hex: string): string {
  const [l, c, h] = oklchComponents(hex);
  return `oklch(${l} ${c} ${h})`;
}

type ContrastTarget = { bg: string; ratio: number };

export function meetsAll(fg: string, targets: readonly ContrastTarget[]): boolean {
  return targets.every((t) => contrastRatio(fg, t.bg) >= t.ratio);
}

/**
 * Returns `fg` unchanged when it already meets every target. Otherwise moves its OKLCH lightness
 * (hue kept, chroma reduced only by gamut mapping) the minimum amount needed, away from the
 * backgrounds. Falls back to the other direction, then to pure black/white.
 */
export function ensureContrast(fg: string, targets: readonly ContrastTarget[]): string {
  if (targets.length === 0 || meetsAll(fg, targets)) return fg;
  const o = oklchOf(fg);
  const bgLum = targets.reduce((sum, t) => sum + relativeLuminance(t.bg), 0) / targets.length;
  const directions = bgLum > 0.18 ? [0, 1] : [1, 0];
  for (const extreme of directions) {
    const at = (l: number) => oklchToHex({ l, c: o.c, h: o.h });
    if (!meetsAll(at(extreme), targets)) continue;
    let fail = o.l;
    let pass = extreme;
    for (let i = 0; i < 30; i++) {
      const mid = (fail + pass) / 2;
      if (meetsAll(at(mid), targets)) pass = mid;
      else fail = mid;
    }
    return at(pass);
  }
  const score = (hex: string) => Math.min(...targets.map((t) => contrastRatio(hex, t.bg) / t.ratio));
  return score("#000000") >= score("#ffffff") ? "#000000" : "#ffffff";
}
