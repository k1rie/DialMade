import { styleRecipes, type StyleRecipe } from "@dialmade/catalog";
import { hexToOklch } from "@dialmade/palette";
import type { ImportedBrand, Mode, RecipeMatch, ShadowLayerValue } from "../types";

type Shadow = StyleRecipe["shadow"];
type Surface = StyleRecipe["surface"];
type ButtonShape = StyleRecipe["button"]["shape"];
type RadiusKey = keyof StyleRecipe["radius"];

/** What an import can say about the style. Every field is optional; only present ones are compared. */
export interface RecipeFeatures {
  /** px */
  radii?: Partial<Record<RadiusKey, number>>;
  shadow?: Shadow;
  /** px */
  borderWidth?: number;
  surface?: Surface;
  buttonShape?: ButtonShape;
  headingWeight?: number;
  /** em */
  headingTracking?: number;
  mode?: Mode;
}

/** Below this distance the recipe is «close»; above it the imported tokens carry the style. */
export const RECIPE_CLOSE_DISTANCE = 0.2;

const WEIGHTS = { radius: 3, shadow: 2, surface: 2, borderWidth: 1, buttonShape: 1, headingWeight: 1, headingTracking: 0.5, mode: 0.5 };

const SHADOW_DISTANCE: Readonly<Record<string, number>> = {
  "soft|deep": 0.5,
  "soft|crisp": 0.7,
  "crisp|deep": 0.6,
  "soft|glow": 0.8,
  "deep|glow": 0.7,
  "crisp|glow": 0.8,
};
const SURFACE_DISTANCE: Readonly<Record<string, number>> = {
  "glass|layered": 0.5,
  "flat|outlined": 0.5,
  "flat|layered": 0.7,
  "layered|outlined": 0.8,
  "flat|glass": 1,
  "glass|outlined": 1,
};
const SHAPE_DISTANCE: Readonly<Record<string, number>> = { "rounded|square": 0.5, "pill|rounded": 0.6, "pill|square": 1 };

const pair = (table: Readonly<Record<string, number>>, a: string, b: string) => (a === b ? 0 : (table[[a, b].sort().join("|")] ?? 1));
const capped = (x: number) => Math.min(1, Math.max(0, x));

/** 0–1 per feature, and which features were compared. */
function featureDistances(f: RecipeFeatures, r: StyleRecipe): [keyof typeof WEIGHTS, number][] {
  const out: [keyof typeof WEIGHTS, number][] = [];
  const radii = Object.entries(f.radii ?? {}).filter((e): e is [RadiusKey, number] => typeof e[1] === "number" && e[1] < 1000);
  if (radii.length > 0) {
    out.push(["radius", radii.reduce((sum, [key, px]) => sum + capped(Math.abs(px - r.radius[key]) / (r.radius[key] + 4)), 0) / radii.length]);
  }
  if (f.shadow) out.push(["shadow", f.shadow === "none" || r.shadow === "none" ? (f.shadow === r.shadow ? 0 : 1) : pair(SHADOW_DISTANCE, f.shadow, r.shadow)]);
  if (f.surface) out.push(["surface", pair(SURFACE_DISTANCE, f.surface, r.surface)]);
  if (f.borderWidth !== undefined) out.push(["borderWidth", capped(Math.abs(f.borderWidth - r.borderWidth) / 2)]);
  if (f.buttonShape) out.push(["buttonShape", pair(SHAPE_DISTANCE, f.buttonShape, r.button.shape)]);
  if (f.headingWeight !== undefined) out.push(["headingWeight", capped(Math.abs(f.headingWeight - r.headingWeight) / 300)]);
  if (f.headingTracking !== undefined) out.push(["headingTracking", capped(Math.abs(f.headingTracking - r.headingTracking) / 0.04)]);
  if (f.mode && r.preferredMode) out.push(["mode", f.mode === r.preferredMode ? 0 : 1]);
  return out;
}

/**
 * The closest of the catalog's style recipes (12) to what was imported: a weighted mean of
 * per-feature distances (radius counts most, then shadow and surface). Ties keep catalog order.
 * `null` when there is nothing to compare.
 */
export function nearestRecipe(features: RecipeFeatures, recipes: readonly StyleRecipe[] = styleRecipes): RecipeMatch | null {
  const scored = recipes.map((recipe, index) => {
    const parts = featureDistances(features, recipe);
    const weight = parts.reduce((sum, [key]) => sum + WEIGHTS[key], 0);
    const distance = weight === 0 ? Number.NaN : parts.reduce((sum, [key, d]) => sum + WEIGHTS[key] * d, 0) / weight;
    return { id: recipe.id, distance, index };
  });
  const comparable = scored.filter((s) => Number.isFinite(s.distance));
  if (comparable.length === 0) return null;
  comparable.sort((a, b) => a.distance - b.distance || a.index - b.index);
  const best = comparable[0]!;
  const round = (d: number) => Math.round(d * 1000) / 1000;
  const basis = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).filter((key) =>
    key === "radius" ? Object.keys(features.radii ?? {}).length > 0 : features[key] !== undefined,
  );
  return {
    id: best.id,
    distance: round(best.distance),
    close: best.distance <= RECIPE_CLOSE_DISTANCE,
    ranking: comparable.slice(0, 3).map((s) => ({ id: s.id, distance: round(s.distance) })),
    basis,
  };
}

/** The recipe vocabulary for a box-shadow: none, soft, crisp (hard offset), deep (large/dark) or glow (colored halo). */
export function classifyShadow(layers: readonly ShadowLayerValue[]): Shadow {
  const visible = layers.filter((l) => !l.inset && l.alpha > 0.01);
  if (visible.length === 0) return "none";
  const chromatic = visible.some((l) => (hexToOklch(l.color)?.c ?? 0) >= 0.08 && l.blur >= 8);
  if (chromatic) return "glow";
  if (visible.some((l) => l.blur <= 1 && (Math.abs(l.x) >= 2 || Math.abs(l.y) >= 2) && l.alpha >= 0.5)) return "crisp";
  const strongest = visible.reduce((a, b) => (b.blur * b.alpha > a.blur * a.alpha ? b : a));
  if (strongest.blur >= 24 && strongest.alpha >= 0.2) return "deep";
  return "soft";
}

const RADIUS_KEYS: readonly RadiusKey[] = ["sm", "md", "lg", "xl"];

/** Features from an imported brand: radii (or shadcn's `--radius` scale), shadows, border width, heading metrics, mode. */
export function featuresFromBrand(brand: Pick<ImportedBrand, "shape" | "typeScale" | "screenshots" | "colors">): RecipeFeatures {
  const features: RecipeFeatures = {};
  const radii: Partial<Record<RadiusKey, number>> = {};
  for (const key of RADIUS_KEYS) {
    const r = brand.shape.radii?.[key];
    if (r) radii[key] = r.px;
  }
  if (Object.keys(radii).length === 0 && brand.shape.radius) {
    const base = brand.shape.radius.px;
    Object.assign(radii, { sm: Math.max(0, base - 4), md: Math.max(0, base - 2), lg: base, xl: base + 4 });
  }
  if (Object.keys(radii).length > 0) features.radii = radii;
  const fullRadius = brand.shape.radii?.["full"] ?? brand.shape.radii?.["button"];
  if (fullRadius && fullRadius.px >= 999) features.buttonShape = "pill";

  const shadows = brand.shape.shadows ?? [];
  if (shadows.length > 0) {
    const pick = shadows.find((s) => s.name === "md" || s.name === "DEFAULT") ?? shadows[Math.floor(shadows.length / 2)]!;
    features.shadow = classifyShadow(pick.layers);
  }
  if (brand.shape.borderWidth) features.borderWidth = brand.shape.borderWidth.px;

  const heading = brand.typeScale?.find((t) => t.step === "h1") ?? brand.typeScale?.find((t) => t.step === "display");
  if (heading?.weight !== undefined) features.headingWeight = heading.weight;
  if (heading?.letterSpacing !== undefined) features.headingTracking = heading.letterSpacing;

  const fp = brand.screenshots?.find((s) => s.fingerprint)?.fingerprint;
  if (fp?.surface) features.surface = fp.surface;
  if (!features.shadow && fp?.elevation) features.shadow = fp.elevation;

  const modes = new Set(brand.screenshots?.map((s) => s.mode).filter((m): m is Mode => m === "light" || m === "dark"));
  if (modes.size === 1) features.mode = [...modes][0]!;
  return features;
}
