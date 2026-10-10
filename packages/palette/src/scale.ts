import {
  clamp,
  formatOklch,
  hueDelta,
  mix,
  oklchOf,
  oklchToHex,
  requireHex,
} from "./color";

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStepNumber = (typeof SCALE_STEPS)[number];
export type ScaleStep = { step: ScaleStepNumber; hex: string; oklch: string };

/*
 * Measured from tailwindcss@4.3.3 theme.css: mean OKLCH lightness per step over the 17 chromatic
 * families, mean chroma relative to each family's peak, and the `neutral` family lightness
 * (identical to shadcn's neutral theme).
 */
export const TAILWIND_L_CHROMATIC = [
  0.9772, 0.9504, 0.9055, 0.8405, 0.7535, 0.6827, 0.5978, 0.5149, 0.4461, 0.3946, 0.2779,
] as const;
export const TAILWIND_CHROMA_BELL = [
  0.0824, 0.1978, 0.3799, 0.6275, 0.8597, 0.9499, 0.9311, 0.8144, 0.6702, 0.5378, 0.3802,
] as const;
export const TAILWIND_L_NEUTRAL = [
  0.985, 0.97, 0.922, 0.87, 0.708, 0.556, 0.439, 0.371, 0.269, 0.205, 0.145,
] as const;

const LAST = SCALE_STEPS.length - 1;
const MIN_GAP = 0.006;
const CHROMA_CAP = 1.15;
const YELLOW_HUE = 95;
const YELLOW_WIDTH = 35;

export type BuildScaleOptions = {
  /** Max hue rotation (degrees) applied to the darkest steps of yellow-ish seeds. Default 12. */
  maxHueDrift?: number;
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function lightnessTargets(seedL: number, curve: readonly number[], anchor: number): number[] {
  const top = Math.max(curve[0]!, seedL + (1 - seedL) * 0.5);
  const bottom = Math.min(curve[LAST]!, seedL * 0.8);
  const anchorL = curve[anchor]!;
  return curve.map((t, i) => {
    if (i === anchor) return seedL;
    if (i < anchor) return seedL + ((t - anchorL) * (top - seedL)) / (curve[0]! - anchorL);
    return seedL - ((anchorL - t) * (seedL - bottom)) / (anchorL - curve[LAST]!);
  });
}

function toSteps(hexes: string[]): ScaleStep[] {
  return hexes.map((hex, i) => ({ step: SCALE_STEPS[i]!, hex, oklch: formatOklch(hex) }));
}

/**
 * Builds a 50–950 scale on the Tailwind v4 lightness curve. The seed hex appears EXACTLY at
 * `anchorStep` (the step whose curve lightness is closest to the seed); the rest of the curve is
 * stretched around it so lightness stays strictly decreasing.
 */
export function buildScale(
  seedHex: string,
  options: BuildScaleOptions = {},
): { steps: ScaleStep[]; anchorStep: ScaleStepNumber } {
  const hex = requireHex(seedHex, "seed");
  const seed = oklchOf(hex);
  const maxDrift = Math.max(0, options.maxHueDrift ?? 12);

  const chromatic = smoothstep(0.02, 0.06, seed.c);
  const curve = TAILWIND_L_NEUTRAL.map((n, i) => mix(n, TAILWIND_L_CHROMATIC[i]!, chromatic));
  let anchor = 0;
  for (let i = 1; i <= LAST; i++) {
    if (Math.abs(curve[i]! - seed.l) < Math.abs(curve[anchor]! - seed.l)) anchor = i;
  }

  const targets = lightnessTargets(seed.l, curve, anchor);
  const yellowness = seed.c >= 0.04 ? Math.max(0, 1 - Math.abs(hueDelta(YELLOW_HUE, seed.h)) / YELLOW_WIDTH) : 0;
  const bellAtAnchor = TAILWIND_CHROMA_BELL[anchor]!;

  const colorAt = (i: number, l: number) => {
    const c = Math.min((seed.c * TAILWIND_CHROMA_BELL[i]!) / bellAtAnchor, seed.c * CHROMA_CAP);
    const drift = i > anchor ? (-maxDrift * yellowness * (i - anchor)) / (LAST - anchor) : 0;
    return oklchToHex({ l, c, h: seed.h + drift });
  };

  const hexes = targets.map((l, i) => (i === anchor ? hex : colorAt(i, l)));
  const lightness = hexes.map((h) => oklchOf(h).l);

  for (let i = anchor - 1; i >= 0; i--) {
    let l = targets[i]!;
    while (lightness[i]! <= lightness[i + 1]! + MIN_GAP && l < 1) {
      l = Math.min(1, Math.max(l, lightness[i + 1]!) + MIN_GAP);
      hexes[i] = colorAt(i, l);
      lightness[i] = oklchOf(hexes[i]!).l;
    }
  }
  for (let i = anchor + 1; i <= LAST; i++) {
    let l = targets[i]!;
    while (lightness[i]! >= lightness[i - 1]! - MIN_GAP && l > 0) {
      l = Math.max(0, Math.min(l, lightness[i - 1]!) - MIN_GAP);
      hexes[i] = colorAt(i, l);
      lightness[i] = oklchOf(hexes[i]!).l;
    }
  }

  return { steps: toSteps(hexes), anchorStep: SCALE_STEPS[anchor]! };
}

/** Tinted neutral scale on Tailwind's neutral lightness curve; chroma follows a softened bell. */
export function buildNeutralScale(hue: number, peakChroma: number): ScaleStep[] {
  const peak = Math.max(...TAILWIND_CHROMA_BELL);
  const hexes = TAILWIND_L_NEUTRAL.map((l, i) =>
    oklchToHex({ l, c: peakChroma * (0.35 + (0.65 * TAILWIND_CHROMA_BELL[i]!) / peak), h: hue }),
  );
  return toSteps(hexes);
}

export function stepIndex(step: ScaleStepNumber): number {
  return SCALE_STEPS.indexOf(step);
}
