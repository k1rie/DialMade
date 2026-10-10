import { contrastRatio, extractFromPixels, hexToOklch, type Oklab, type Oklch } from "@dialmade/palette";
import { hueDelta, oklabOf } from "../../color";
import type { Mode } from "../../types";
import {
  ACCENT_FALLBACK_MAX_SHARE,
  ACCENT_MAX_SHARE,
  ACCENT_MIN_C,
  ACCENT_MIN_SHARE,
  ASSIGN_DELTA_E,
  DARK_L,
  DISTINCT_DELTA_E,
  DISTINCT_HUE,
  EXTRACT_SWATCHES,
  LIGHT_L,
  MAJORITY_SHARE,
  MAX_SAMPLES,
  MAX_SCREENSHOT_SWATCHES,
  NEUTRAL_C,
  OPAQUE_ALPHA,
  PHOTO_TOP_SHARE,
  SAME_SWATCH_DELTA_E,
  SCREENSHOT_MIN_COVERAGE,
  SPLIT_SHARE,
  TEXT_CONTRAST,
  TINT_MIN_C,
  TINT_MIN_SHARE,
  VIBRANCY_MIN_SHARE,
} from "./constants";
import { hexOfKey, hueOf, keyOfHex, oklabOfKey } from "./oklab";

export interface ScreenshotSwatch {
  /** Opaque `#rrggbb`, an exact pixel color of the image. */
  hex: string;
  oklch: Oklch;
  /** Share of the image's opaque pixels nearest to this color (ΔEok ≤ 0.1). */
  share: number;
}

export interface ScreenshotAnalysis {
  mode: Mode | "ambiguous";
  /** Majority color of the border (research), or the largest area when the border has no majority. */
  background: ScreenshotSwatch;
  backgroundFrom: "border" | "area";
  /** The most common neutral with text contrast (≥ 4.5:1) against the background. */
  foreground?: ScreenshotSwatch;
  /** The most chromatic color covering 0.2–10 % of the image (a CTA), else a larger colored area. */
  accent?: ScreenshotSwatch;
  /** Up to 12, background included, by share. */
  swatches: ScreenshotSwatch[];
  /** Mean hue and chroma of the tinted neutrals (C < 0.05); `c: 0` for pure grays. */
  neutralTint: { h: number; c: number };
  /** Mean chroma and lightness of the colored pixels (C ≥ 0.05); zeros when there are none. */
  vibrancy: { c: number; l: number };
  shares: { light: number; dark: number; neutral: number; chromatic: number; top16: number };
  /** Few repeated colors: a photo or an illustration rather than an interface. */
  photo: boolean;
  /** The opaque region analyzed (a window capture's transparent margin is cropped). */
  region: { x: number; y: number; width: number; height: number };
}

export interface AnalyzeOptions {
  /** Image share a swatch needs (default 0.002). */
  minCoverage?: number;
  /** Default 12. */
  maxSwatches?: number;
}

type Pixels = Uint8ClampedArray | Uint8Array;

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const dist2 = (x: Oklab, y: Oklab) => (x.l - y.l) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2;

function opaqueBounds(data: Pixels, width: number, height: number) {
  let x0 = width;
  let x1 = -1;
  let y0 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    let first = -1;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3]! >= OPAQUE_ALPHA) {
        first = x;
        break;
      }
    }
    if (first < 0) continue;
    let last = first;
    for (let x = width - 1; x > first; x--) {
      if (data[row + x * 4 + 3]! >= OPAQUE_ALPHA) {
        last = x;
        break;
      }
    }
    if (y0 < 0) y0 = y;
    y1 = y;
    if (first < x0) x0 = first;
    if (last > x1) x1 = last;
  }
  return y0 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function cropRegion(data: Pixels, width: number, region: { x: number; y: number; width: number; height: number }): Uint8ClampedArray {
  const out = new Uint8ClampedArray(region.width * region.height * 4);
  for (let y = 0; y < region.height; y++) {
    const start = ((region.y + y) * width + region.x) * 4;
    out.set(data.subarray(start, start + region.width * 4), y * region.width * 4);
  }
  return out;
}

const asClamped = (data: Pixels): Uint8ClampedArray =>
  data instanceof Uint8ClampedArray ? data : new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

/**
 * Reads an interface screenshot (RGBA, row-major, already decoded and reduced by the host) without
 * AI: the dominant background and the mode it implies, the text color, an accent candidate that a
 * 1 % CTA can win, the tint of the neutrals and the vibrancy of the colored pixels. Swatches come from
 * `extractFromPixels` (minCoverage 0.002, chromatic background kept) and are exact pixel colors.
 * Returns null when no pixel is opaque.
 */
export function analyzeScreenshot(data: Pixels, width: number, height: number, options: AnalyzeOptions = {}): ScreenshotAnalysis | null {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new RangeError(`Invalid image size ${width}×${height}`);
  if (data.length < width * height * 4) throw new RangeError("Pixel buffer is smaller than width × height × 4");
  const minCoverage = options.minCoverage ?? SCREENSHOT_MIN_COVERAGE;
  const maxSwatches = Math.max(1, Math.min(MAX_SCREENSHOT_SWATCHES, options.maxSwatches ?? MAX_SCREENSHOT_SWATCHES));

  const region = opaqueBounds(data, width, height);
  if (!region) return null;
  const full = region.width === width && region.height === height;
  const pixels = full ? asClamped(data) : cropRegion(data, width, region);
  const w = region.width;
  const h = region.height;

  const stride = Math.max(1, Math.ceil(Math.sqrt((w * h) / MAX_SAMPLES)));
  const counts = new Map<number, number>();
  let total = 0;
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const i = (y * w + x) * 4;
      if (pixels[i + 3]! < OPAQUE_ALPHA) continue;
      const key = (pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      total++;
    }
  }
  if (total === 0) return null;

  const entries: { key: number; n: number; lab: Oklab }[] = [];
  let light = 0;
  let dark = 0;
  let neutral = 0;
  let tinted = 0;
  let tintA = 0;
  let tintB = 0;
  let chromatic = 0;
  let vibC = 0;
  let vibL = 0;
  for (const [key, n] of counts) {
    const lab = oklabOfKey(key);
    entries.push({ key, n, lab });
    if (lab.l > LIGHT_L) light += n;
    else if (lab.l < DARK_L) dark += n;
    const c = Math.hypot(lab.a, lab.b);
    if (c < NEUTRAL_C) {
      neutral += n;
      const gray = (key >> 16) === ((key >> 8) & 255) && (key & 255) === ((key >> 8) & 255);
      if (!gray) {
        tinted += n;
        tintA += lab.a * n;
        tintB += lab.b * n;
      }
    } else {
      chromatic += n;
      vibC += c * n;
      vibL += lab.l * n;
    }
  }
  const top16 = entries
    .map((e) => e.n)
    .sort((a, b) => b - a)
    .slice(0, 16)
    .reduce((sum, n) => sum + n, 0);

  const extracted = extractFromPixels(pixels, w, h, { minCoverage, maxSwatches: EXTRACT_SWATCHES, keepChromaticBackground: true });
  const candidates: { hex: string; lab: Oklab; share: number }[] = [];
  const near = SAME_SWATCH_DELTA_E ** 2;
  for (const hex of [...(extracted.background ? [extracted.background] : []), ...extracted.swatches.map((s) => s.hex)]) {
    const lab = oklabOfKey(keyOfHex(hex));
    if (!candidates.some((c) => dist2(c.lab, lab) < near)) candidates.push({ hex, lab, share: 0 });
  }
  if (candidates.length === 0) {
    const mode = [...entries].sort((a, b) => b.n - a.n || a.key - b.key)[0]!;
    candidates.push({ hex: hexOfKey(mode.key), lab: mode.lab, share: 0 });
  }
  const assign = ASSIGN_DELTA_E ** 2;
  for (const e of entries) {
    let best = -1;
    let bestD = assign;
    for (let i = 0; i < candidates.length; i++) {
      const d = dist2(e.lab, candidates[i]!.lab);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    }
    if (best >= 0) candidates[best]!.share += e.n / total;
  }

  const fromBorder = extracted.background !== undefined;
  const bgCandidate = fromBorder ? candidates[0]! : candidates.reduce((a, b) => (b.share > a.share ? b : a));
  const toSwatch = (c: (typeof candidates)[number]): ScreenshotSwatch => ({ hex: c.hex, oklch: hexToOklch(c.hex)!, share: round(c.share, 4) });
  const ranked = candidates
    .filter((c) => c === bgCandidate || c.share >= minCoverage)
    .sort((a, b) => b.share - a.share || a.hex.localeCompare(b.hex));
  const kept = ranked.slice(0, maxSwatches);
  if (!kept.includes(bgCandidate)) kept[kept.length - 1] = bgCandidate;
  const swatches = kept.map(toSwatch);
  const background = swatches.find((s) => s.hex === bgCandidate.hex)!;
  const others = swatches.filter((s) => s !== background);

  const lightShare = light / total;
  const darkShare = dark / total;
  let mode: Mode | "ambiguous" = background.oklch.l > LIGHT_L ? "light" : background.oklch.l < DARK_L ? "dark" : "ambiguous";
  if (mode === "light" && darkShare >= SPLIT_SHARE) mode = "ambiguous";
  else if (mode === "dark" && lightShare >= SPLIT_SHARE) mode = "ambiguous";
  else if (mode === "ambiguous") mode = lightShare >= MAJORITY_SHARE ? "light" : darkShare >= MAJORITY_SHARE ? "dark" : "ambiguous";

  const foreground = others
    .filter((s) => s.oklch.c < NEUTRAL_C && contrastRatio(s.hex, background.hex) >= TEXT_CONTRAST)
    .sort((a, b) => b.share - a.share || contrastRatio(b.hex, background.hex) - contrastRatio(a.hex, background.hex))[0];

  const byChroma = (a: ScreenshotSwatch, b: ScreenshotSwatch) => b.oklch.c - a.oklch.c || b.share - a.share || a.hex.localeCompare(b.hex);
  const colored = others.filter((s) => s.oklch.c >= ACCENT_MIN_C && s.share >= ACCENT_MIN_SHARE);
  const accent =
    colored.filter((s) => s.share <= ACCENT_MAX_SHARE).sort(byChroma)[0] ??
    colored.filter((s) => s.share <= ACCENT_FALLBACK_MAX_SHARE).sort(byChroma)[0];

  let neutralTint = { h: 0, c: 0 };
  if (tinted > 0 && tinted / neutral >= TINT_MIN_SHARE) {
    const a = tintA / tinted;
    const b = tintB / tinted;
    const c = Math.hypot(a, b);
    if (c >= TINT_MIN_C) neutralTint = { h: Math.round(hueOf(a, b)) % 360, c: round(c, 4) };
  }
  const vibrancy = chromatic / total >= VIBRANCY_MIN_SHARE ? { c: round(vibC / chromatic, 3), l: round(Math.min(1, vibL / chromatic), 3) } : { c: 0, l: 0 };

  return {
    mode,
    background,
    backgroundFrom: fromBorder ? "border" : "area",
    ...(foreground && { foreground }),
    ...(accent && { accent }),
    swatches,
    neutralTint,
    vibrancy,
    shares: {
      light: round(lightShare, 4),
      dark: round(darkShare, 4),
      neutral: round(neutral / total, 4),
      chromatic: round(chromatic / total, 4),
      top16: round(top16 / total, 4),
    },
    photo: top16 / total < PHOTO_TOP_SHARE,
    region,
  };
}

/** Whether a second chromatic color reads as a separate CTA next to the brand color (ΔH ≥ 30° or ΔEok ≥ 0.12). */
export function distinctColors(a: Oklch, b: Oklch): boolean {
  return Math.abs(hueDelta(a.h, b.h)) >= DISTINCT_HUE || Math.sqrt(dist2(oklabOf(a), oklabOf(b))) >= DISTINCT_DELTA_E;
}
