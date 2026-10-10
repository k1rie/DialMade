import { getStyleRecipe } from "@dialmade/catalog";
import type { Brief, DesignDoc } from "@dialmade/doc";
import type { ThemeVars } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { deriveDesign } from "@/lib/design-derived";

const KEEP =
  /^--(background|foreground|card|card-foreground|primary|primary-foreground|cta|cta-foreground|muted|muted-foreground|border|border-strong|brand|secondary|secondary-foreground|ring)$|^--dl-(radius-|shadow-|space-|border-width|card-|button-|font-|heading-)/;

export type BriefChoice = Partial<Pick<Brief, "recipeId" | "pairingId" | "paletteStyleId" | "motionTier">>;

const signatures = new WeakMap<DesignDoc, string>();

/** Everything that changes the global theme variables (names, copy and pages do not). */
function themeSignature(doc: DesignDoc): string {
  let signature = signatures.get(doc);
  if (signature === undefined) {
    const { brand, brief, tokens, system } = doc;
    signature = JSON.stringify([
      brand.seeds,
      brand.achromatic,
      brief.paletteStyleId,
      brief.recipeId,
      brief.pairingId,
      brief.motionTier,
      brief.dials,
      tokens,
      system,
    ]);
    signatures.set(doc, signature);
  }
  return signature;
}

const SAMPLE_CACHE_SIZE = 96;
const sampleCache = new Map<string, ThemeVars>();

/**
 * Variables of a card sample: `doc` with other brief choices, one mode, global dials, only the names a
 * sample reads (colors, shape, elevation, fonts). Cached by value, so typing a brand name or editing
 * copy returns the same objects and the cards do not re-render.
 */
export function sampleVars(doc: DesignDoc, choice: BriefChoice, mode: PreviewMode): ThemeVars {
  const key = `${themeSignature(doc)}|${choice.recipeId ?? ""}|${choice.pairingId ?? ""}|${choice.paletteStyleId ?? ""}|${choice.motionTier ?? ""}|${mode}`;
  const hit = sampleCache.get(key);
  if (hit) {
    sampleCache.delete(key);
    sampleCache.set(key, hit);
    return hit;
  }
  const variant: DesignDoc = { ...doc, brief: { ...doc.brief, ...choice } };
  const all = deriveDesign(variant, null).vars[mode];
  const picked = Object.fromEntries(Object.entries(all).filter(([name]) => KEEP.test(name)));
  sampleCache.set(key, picked);
  if (sampleCache.size > SAMPLE_CACHE_SIZE) sampleCache.delete(sampleCache.keys().next().value as string);
  return picked;
}

/** Brief choices a recipe brings when applied with `cascade` (pairing and motion follow unless pinned). */
export function recipeChoice(doc: DesignDoc, recipeId: string): BriefChoice {
  const recipe = getStyleRecipe(recipeId);
  if (!recipe) return { recipeId };
  const locks = doc.brief.locks;
  return {
    recipeId,
    ...(recipe.pairingId && !locks.includes("pairingId") && { pairingId: recipe.pairingId }),
    ...(!locks.includes("motionTier") && { motionTier: recipe.defaultMotion }),
  };
}
