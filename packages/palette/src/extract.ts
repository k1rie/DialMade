import {
  deltaEOK,
  hexToOklab,
  hueDelta,
  oklabToOklch,
  oklchToHex,
  oklchToOklab,
  oklchOf,
  parseColor,
  rgbToHex,
  rgbToOklab,
  type Oklab,
  type Oklch,
} from "./color";

export type Swatch = { hex: string; oklch: Oklch; coverage: number };

export type ExtractMethod = "histogram" | "kmeans" | "none";

export type ExtractResult = {
  swatches: Swatch[];
  seeds: { primary: Swatch; secondary?: Swatch };
  achromatic: boolean;
  /**
   * Detected background (border majority). Achromatic backgrounds are removed from the swatches;
   * chromatic ones too with `keepChromaticBackground: false`.
   */
  background?: string;
  method: ExtractMethod;
};

export type ExtractOptions = {
  /** Colors declared in the source (e.g. `parseSvgColors`); clusters snap to them when ΔEok < 0.05. */
  declaredColors?: string[];
  /** Max swatches returned. Default 8. */
  maxSwatches?: number;
  /**
   * Colors covering less than this share of the analyzed pixels are dropped. Default 0.015 (logos);
   * screenshots want ≈0.002 so a small CTA survives.
   */
  minCoverage?: number;
  /**
   * Keep a chromatic background (an app-icon tile, a colored page) as a swatch, because it is
   * usually the brand. Default true; false removes it like an achromatic background.
   */
  keepChromaticBackground?: boolean;
};

const ALPHA_MIN = 128;
const BACKGROUND_DELTA = 0.03;
const BACKGROUND_MAJORITY = 0.6;
const MERGE_DELTA = 0.04;
const SNAP_DELTA = 0.05;
const MODE_SNAP_DELTA = 0.03;
const MIN_COVERAGE = 0.015;
const CHROMATIC = 0.04;
const FLAT_TOP_COLORS = 16;
const FLAT_SHARE = 0.6;
const K = 8;
const MAX_SAMPLES = 262_144;
const MAX_LEADERS = 512;
const SECONDARY_HUE = 30;
const SECONDARY_DELTA = 0.12;
/** shadcn neutral-900, used as primary when a logo has no near-black of its own. */
const FALLBACK_PRIMARY = "#171717";

type Entry = { key: number; count: number; lab: Oklab };
type Bin = { weight: number; l: number; a: number; b: number; modeKey: number; modeCount: number; modeLab: Oklab };
type Cluster = { lab: Oklab; key: number; weight: number };

const keyToHex = (key: number) => rgbToHex((key >> 16) & 255, (key >> 8) & 255, key & 255);
const keyToLab = (key: number) => rgbToOklab((key >> 16) & 255, (key >> 8) & 255, key & 255);

function detectBackground(data: Uint8ClampedArray, width: number, height: number) {
  const band = Math.max(1, Math.min(2, Math.floor(Math.min(width, height) / 8)));
  const counts = new Map<number, number>();
  let total = 0;
  let transparent = 0;
  for (let y = 0; y < height; y++) {
    const edgeRow = y < band || y >= height - band;
    for (let x = 0; x < width; x++) {
      if (!edgeRow && x >= band && x < width - band) {
        x = width - band - 1;
        continue;
      }
      const i = (y * width + x) * 4;
      total++;
      if (data[i + 3]! < ALPHA_MIN) {
        transparent++;
        continue;
      }
      const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (total === 0 || transparent / total >= 0.5 || counts.size === 0) return undefined;

  let modeKey = 0;
  let modeCount = -1;
  for (const [key, count] of counts) {
    if (count > modeCount || (count === modeCount && key < modeKey)) {
      modeKey = key;
      modeCount = count;
    }
  }
  const lab = keyToLab(modeKey);
  let near = 0;
  for (const [key, count] of counts) if (deltaEOK(keyToLab(key), lab) < BACKGROUND_DELTA) near += count;
  if (near / total < BACKGROUND_MAJORITY) return undefined;
  return { hex: keyToHex(modeKey), lab, chromatic: oklabToOklch(lab).c >= CHROMATIC };
}

function toBins(entries: Entry[]): Bin[] {
  const bins = new Map<number, Bin>();
  for (const e of entries) {
    const binKey = (((e.key >> 19) & 31) << 10) | (((e.key >> 11) & 31) << 5) | ((e.key >> 3) & 31);
    let bin = bins.get(binKey);
    if (!bin) {
      bin = { weight: 0, l: 0, a: 0, b: 0, modeKey: e.key, modeCount: 0, modeLab: e.lab };
      bins.set(binKey, bin);
    }
    bin.weight += e.count;
    bin.l += e.lab.l * e.count;
    bin.a += e.lab.a * e.count;
    bin.b += e.lab.b * e.count;
    if (e.count > bin.modeCount || (e.count === bin.modeCount && e.key < bin.modeKey)) {
      bin.modeKey = e.key;
      bin.modeCount = e.count;
      bin.modeLab = e.lab;
    }
  }
  return [...bins.values()]
    .map((bin) => ({ ...bin, l: bin.l / bin.weight, a: bin.a / bin.weight, b: bin.b / bin.weight }))
    .sort((x, y) => y.weight - x.weight || x.modeKey - y.modeKey);
}

/** Flat logos: leader clustering over the 5-bit histogram; each cluster keeps its most frequent exact color. */
function leaderClusters(bins: Bin[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const bin of bins) {
    let best = -1;
    let bestD = clusters.length >= MAX_LEADERS ? Infinity : MERGE_DELTA;
    for (let i = 0; i < clusters.length; i++) {
      const d = deltaEOK(bin, clusters[i]!.lab);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    }
    if (best >= 0) clusters[best]!.weight += bin.weight;
    else clusters.push({ lab: bin.modeLab, key: bin.modeKey, weight: bin.weight });
  }
  return clusters;
}

/** Gradients and photos: weighted k-means in OKLab with deterministic farthest-point seeding. */
function kmeansClusters(bins: Bin[], k: number): Cluster[] {
  const n = bins.length;
  const dist2 = (i: number, c: Oklab) => {
    const p = bins[i]!;
    return (p.l - c.l) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2;
  };
  const centers: Oklab[] = [];
  const nearest = new Float64Array(n).fill(Infinity);
  for (let c = 0; c < k; c++) {
    let pick = 0;
    if (c > 0) {
      let bestScore = 0;
      for (let i = 0; i < n; i++) {
        const score = bins[i]!.weight * nearest[i]!;
        if (score > bestScore) {
          bestScore = score;
          pick = i;
        }
      }
      if (bestScore <= 1e-10) break;
    }
    const p = bins[pick]!;
    const center = { l: p.l, a: p.a, b: p.b };
    centers.push(center);
    for (let i = 0; i < n; i++) nearest[i] = Math.min(nearest[i]!, dist2(i, center));
  }

  const assignment = new Int32Array(n).fill(-1);
  for (let iteration = 0; iteration < 40; iteration++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = dist2(i, centers[c]!);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    }
    if (!changed) break;
    const sums = centers.map(() => ({ w: 0, l: 0, a: 0, b: 0 }));
    for (let i = 0; i < n; i++) {
      const s = sums[assignment[i]!]!;
      const p = bins[i]!;
      s.w += p.weight;
      s.l += p.l * p.weight;
      s.a += p.a * p.weight;
      s.b += p.b * p.weight;
    }
    sums.forEach((s, c) => {
      if (s.w > 0) centers[c] = { l: s.l / s.w, a: s.a / s.w, b: s.b / s.w };
    });
  }

  return centers.flatMap((center, c) => {
    let weight = 0;
    let mode: Bin | undefined;
    for (let i = 0; i < n; i++) {
      if (assignment[i] !== c) continue;
      const bin = bins[i]!;
      weight += bin.weight;
      if (!mode || bin.modeCount > mode.modeCount) mode = bin;
    }
    if (!mode || weight === 0) return [];
    if (deltaEOK(mode.modeLab, center) < MODE_SNAP_DELTA) return [{ lab: mode.modeLab, key: mode.modeKey, weight }];
    const hex = oklchToHex(oklabToOklch(center));
    const key = Number.parseInt(hex.slice(1), 16);
    return [{ lab: keyToLab(key), key, weight }];
  });
}

/** Repeatedly merges identical colors and the closest pair under ΔEok `delta`; the heavier one keeps its color. */
function mergeClose(clusters: Cluster[], delta: number): Cluster[] {
  const out = clusters.map((c) => ({ ...c }));
  for (;;) {
    let bi = -1;
    let bj = -1;
    let bestD = delta;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const d = out[i]!.key === out[j]!.key ? -1 : deltaEOK(out[i]!.lab, out[j]!.lab);
        if (d < bestD) {
          bestD = d;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi < 0) return out;
    const [keep, drop] = out[bi]!.weight >= out[bj]!.weight ? [out[bi]!, out[bj]!] : [out[bj]!, out[bi]!];
    keep.weight += drop.weight;
    out.splice(out.indexOf(drop), 1);
  }
}

function snapToDeclared(clusters: Cluster[], declared: string[]): Cluster[] {
  const targets = declared
    .map((c) => parseColor(c))
    .filter((hex): hex is string => hex !== null)
    .map((hex) => ({ key: Number.parseInt(hex.slice(1), 16), lab: hexToOklab(hex) }));
  if (targets.length === 0) return clusters;
  return clusters.map((cluster) => {
    let best: (typeof targets)[number] | undefined;
    let bestD = SNAP_DELTA;
    for (const t of targets) {
      const d = deltaEOK(cluster.lab, t.lab);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best ? { ...cluster, key: best.key, lab: best.lab } : cluster;
  });
}

const chromaWeight = (c: number) => Math.min(c, 0.2) / 0.2;
const seedScore = (s: Swatch) => s.coverage ** 0.7 * chromaWeight(s.oklch.c);

function pickSeeds(swatches: Swatch[]): Pick<ExtractResult, "seeds" | "achromatic"> {
  const chromatic = swatches
    .filter((s) => s.oklch.c >= CHROMATIC)
    .sort((a, b) => seedScore(b) - seedScore(a) || a.hex.localeCompare(b.hex));
  const primary = chromatic[0];
  if (!primary) {
    const darkest = [...swatches].sort((a, b) => a.oklch.l - b.oklch.l)[0];
    const fallback = { hex: FALLBACK_PRIMARY, oklch: oklchOf(FALLBACK_PRIMARY), coverage: 0 };
    return { seeds: { primary: darkest && darkest.oklch.l <= 0.45 ? darkest : fallback }, achromatic: true };
  }
  const primaryLab = oklchToOklab(primary.oklch);
  const secondary = chromatic
    .slice(1)
    .find(
      (s) =>
        Math.abs(hueDelta(primary.oklch.h, s.oklch.h)) >= SECONDARY_HUE ||
        deltaEOK(primaryLab, oklchToOklab(s.oklch)) >= SECONDARY_DELTA,
    );
  return { seeds: secondary ? { primary, secondary } : { primary }, achromatic: false };
}

/**
 * Logo pixels (RGBA, row-major) → swatches and brand seeds. Pure and DOM-free, so it runs in a
 * Web Worker (feed it `ImageData.data` from an OffscreenCanvas) or in Node.
 */
export function extractFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: ExtractOptions = {},
): ExtractResult {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`Invalid image size ${width}×${height}`);
  }
  if (data.length < width * height * 4) throw new RangeError("Pixel buffer is smaller than width × height × 4");
  const minCoverage = opts.minCoverage ?? MIN_COVERAGE;
  if (!(minCoverage >= 0 && minCoverage <= 1)) throw new RangeError(`Invalid minCoverage ${minCoverage}`);

  const stride = Math.max(1, Math.ceil(Math.sqrt((width * height) / MAX_SAMPLES)));
  const counts = new Map<number, number>();
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      if (data[i + 3]! < ALPHA_MIN) continue;
      const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const background = detectBackground(data, width, height);
  const all: Entry[] = [...counts].map(([key, count]) => ({ key, count, lab: keyToLab(key) }));
  let entries = all;
  if (background && (!background.chromatic || opts.keepChromaticBackground === false)) {
    entries = all.filter((e) => deltaEOK(e.lab, background.lab) >= BACKGROUND_DELTA);
    if (entries.length === 0) entries = all;
  }
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const backgroundField = background ? { background: background.hex } : {};

  if (total === 0) {
    const primary = { hex: FALLBACK_PRIMARY, oklch: oklchOf(FALLBACK_PRIMARY), coverage: 0 };
    return { swatches: [], seeds: { primary }, achromatic: true, method: "none", ...backgroundField };
  }

  entries.sort((a, b) => b.count - a.count || a.key - b.key);
  const topShare = entries.slice(0, FLAT_TOP_COLORS).reduce((sum, e) => sum + e.count, 0) / total;
  const flat = topShare >= FLAT_SHARE;
  const bins = toBins(entries);
  const raw = flat ? leaderClusters(bins) : kmeansClusters(bins, Math.min(K, bins.length));

  const merged = mergeClose(raw, MERGE_DELTA).filter((c) => c.weight / total >= minCoverage);
  const snapped = mergeClose(snapToDeclared(merged, opts.declaredColors ?? []), 0);
  const swatches = snapped
    .sort((a, b) => b.weight - a.weight || a.key - b.key)
    .slice(0, opts.maxSwatches ?? K)
    .map((c) => {
      const hex = keyToHex(c.key);
      return { hex, oklch: oklchOf(hex), coverage: c.weight / total };
    });

  return { swatches, ...pickSeeds(swatches), method: flat ? "histogram" : "kmeans", ...backgroundField };
}
