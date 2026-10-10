import { hexToOklch, parseColorWithAlpha, splitAlpha, type Oklab, type Oklch } from "@dialmade/palette";

/** A color ready for the DesignDoc: opaque hex plus alpha below 1, and its OKLCH. */
export interface NormalizedColor {
  hex: string;
  oklch: Oklch;
  alpha?: number;
}

export type ColorProblem = "non-color" | "transparent" | "invalid-color" | "unresolved";

export type NormalizeResult = { ok: true; color: NormalizedColor } | { ok: false; problem: ColorProblem; detail?: string };

/** Keywords that are valid CSS but not a brand color. */
const NON_COLORS: ReadonlySet<string> = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "none",
  "auto",
]);

/** Functions the importer does not evaluate (they go to `unresolved`). */
const UNRESOLVED = /\b(?:var|env|color-mix|light-dark|calc|attr)\(|\bfrom\s/i;

const MAX_COLOR_LENGTH = 256;
/** culori reads `bad`, `fade` or `600` as hex without `#`: a bare hex word is never a color here. */
const BARE_HEX = /^[0-9a-f]+$/i;

/**
 * Any CSS color string → `{ hex, alpha?, oklch }` (alpha kept: `oklch(1 0 0 / 10%)` → `#ffffff`, 0.1).
 * `transparent`, `currentColor` and friends are `non-color`; a fully transparent value is `transparent`;
 * `var()`, `color-mix()`, `light-dark()` and relative colors are `unresolved`. Hex needs its `#`
 * (Coolors slugs are prefixed by their parser).
 */
export function normalizeColor(value: string): NormalizeResult {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_COLOR_LENGTH || BARE_HEX.test(trimmed)) return { ok: false, problem: "invalid-color" };
  const lower = trimmed.toLowerCase();
  if (NON_COLORS.has(lower)) return { ok: false, problem: "non-color", detail: lower };
  if (UNRESOLVED.test(lower)) return { ok: false, problem: "unresolved" };
  const parsed = parseColorWithAlpha(lower);
  if (!parsed) return { ok: false, problem: "invalid-color" };
  const { hex, alpha } = splitAlpha(parsed);
  if (alpha <= 0) return { ok: false, problem: "transparent" };
  const oklch = hexToOklch(hex)!;
  return { ok: true, color: alpha < 1 ? { hex, oklch, alpha } : { hex, oklch } };
}

/** `#rrggbb` or `#rrggbbaa` (the DesignDoc token form) from a normalized color. */
export function tokenColor(color: { hex: string; alpha?: number }): string {
  if (color.alpha === undefined || color.alpha >= 1) return color.hex;
  const byte = Math.round(Math.min(1, Math.max(0, color.alpha)) * 255);
  return byte >= 255 ? color.hex : `${color.hex}${byte.toString(16).padStart(2, "0")}`;
}

const DEG = Math.PI / 180;

export const oklabOf = (o: Oklch): Oklab => ({ l: o.l, a: o.c * Math.cos(o.h * DEG), b: o.c * Math.sin(o.h * DEG) });

const labCache = new Map<string, Oklab>();

function labOfHex(hex: string): Oklab {
  let lab = labCache.get(hex);
  if (!lab) {
    const o = hexToOklch(hex);
    lab = o ? oklabOf(o) : { l: 0, a: 0, b: 0 };
    if (labCache.size > 10_000) labCache.clear();
    labCache.set(hex, lab);
  }
  return lab;
}

/** ΔEok between two opaque colors (any CSS color string; alpha ignored). */
export function deltaE(a: string, b: string): number {
  const x = labOfHex(a.slice(0, 7).toLowerCase());
  const y = labOfHex(b.slice(0, 7).toLowerCase());
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

/** Signed shortest hue difference, in (-180, 180]. */
export function hueDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

/** Chroma under which a color counts as gray (same threshold the engine uses for «achromatic»). */
export const ACHROMATIC_CHROMA = 0.04;
