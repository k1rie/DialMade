import { getMotionTier, getStyleRecipe, getTypographyPairing, type StyleRecipe } from "@dialmade/catalog";
import { compileThemeVars, resolveThemeInputs, type DesignDoc, type ThemeInputs } from "@dialmade/doc";
import type { ColorMode } from "@dialmade/palette";
// Relative imports only: vitest runs this module without the `@/` alias.
import type { StyleChoice } from "../types";
import { GUIDE_STYLE, PREVIEW_SCALE, STYLE_VARS_CACHE_SIZE, THEME_INPUTS_CACHE_SIZE } from "./constants";

/*
 * Theme variables of a style preview: the user's brand (seeds, palette style, dials, overrides) with the
 * option's recipe, compiled by `compileThemeVars` like the real theme. Pure and cached by value: a new doc
 * object with the same theme (a renamed brand, edited copy) returns the very same objects, so the 13
 * previews do not re-render.
 */

/** What a preview needs from one style option. */
export type StyleVars = {
  /** Variables the preview reads (colors, radii, scaled shadows, card/button/input tokens), for `style`. */
  vars: Readonly<Record<string, string>>;
  /** `recipe.preferredMode`, else the palette style's default mode. */
  mode: ColorMode;
  /** `recipe.surface`: the theme contract has no variable for glass, so the preview paints it itself. */
  surface: StyleRecipe["surface"];
  /** The recipe the preview shows (the doc's own one for «Tu guía de estilo» or an unknown id). */
  recipeId: string;
};

/**
 * Names the preview reads. The component variables are `var()` references (`--dl-card-radius:
 * var(--dl-radius-lg)`), so the scales they point at must stay in the same scope.
 */
const KEEP =
  /^--(background|foreground|card|card-foreground|primary|primary-foreground|secondary|muted|muted-foreground|accent|border|border-strong|input|chart-[1-5]|sidebar|sidebar-foreground|sidebar-primary|sidebar-accent|sidebar-border)$|^--dl-(radius-|shadow-|border-width$|card-|button-|input-radius$)/;

const SHADOW = /^--dl-shadow-/;
const PX = /(-?\d*\.?\d+)px/g;

const trim = (value: number): string => {
  const out = Number(value.toFixed(2));
  return Object.is(out, -0) ? "0" : String(out);
};

/** Multiplies every px length of a CSS shadow (`0 4px 12px -2px rgb(…)`); colors and `none` stay. */
export function scaleShadow(value: string, factor: number): string {
  if (value === "none") return value;
  return value.replace(PX, (_, amount: string) => `${trim(Number(amount) * factor)}px`);
}

/* ---- Caches ---- */

const signatures = new WeakMap<DesignDoc, string>();

/** Everything that changes the theme variables (brand name, copy, pages and layout do not). */
export function themeSignature(doc: DesignDoc): string {
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
      brief.locks,
      tokens,
      system,
    ]);
    signatures.set(doc, signature);
  }
  return signature;
}

function lruGet<V>(cache: Map<string, V>, key: string): V | undefined {
  const hit = cache.get(key);
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

function lruSet<V>(cache: Map<string, V>, key: string, value: V, size: number): V {
  cache.set(key, value);
  if (cache.size > size) cache.delete(cache.keys().next().value as string);
  return value;
}

const baseInputs = new Map<string, ThemeInputs>();
const styleVarsCache = new Map<string, StyleVars>();

/** Empties both caches (tests). */
export function clearStyleVarsCache(): void {
  baseInputs.clear();
  styleVarsCache.clear();
}

/* ---- Inputs ---- */

/**
 * Theme inputs of an option. «Tu guía de estilo» (and an id the catalog does not know) is the doc as it
 * is. A recipe swaps `recipe` and, like `setRecipe(id, { cascade: true })`, its pairing and motion tier
 * unless the brief locks them.
 */
export function themeInputsFor(doc: DesignDoc, choice: StyleChoice): ThemeInputs {
  const signature = themeSignature(doc);
  const base =
    lruGet(baseInputs, signature) ?? lruSet(baseInputs, signature, resolveThemeInputs(doc), THEME_INPUTS_CACHE_SIZE);
  const recipe = choice === GUIDE_STYLE ? undefined : getStyleRecipe(choice);
  if (!recipe) return base;
  const locks = doc.brief.locks;
  const pairing = recipe.pairingId && !locks.includes("pairingId") ? getTypographyPairing(recipe.pairingId) : undefined;
  const motionTier = locks.includes("motionTier") ? undefined : getMotionTier(recipe.defaultMotion);
  return { ...base, recipe, pairing: pairing ?? base.pairing, motionTier: motionTier ?? base.motionTier };
}

/** Mode a preview is painted in: the recipe's preferred one, else the palette style's default. */
export const styleMode = (inputs: ThemeInputs): ColorMode => inputs.recipe.preferredMode ?? inputs.theme.defaultMode;

/**
 * Variables of one style option (`mode` defaults to `styleMode`). Same theme + option + mode → the same
 * frozen object, whatever the doc's identity.
 */
export function getStyleVars(doc: DesignDoc, choice: StyleChoice, mode?: ColorMode): StyleVars {
  const key = `${themeSignature(doc)}|${choice}|${mode ?? ""}`;
  const hit = lruGet(styleVarsCache, key);
  if (hit) return hit;

  const inputs = themeInputsFor(doc, choice);
  const resolvedMode = mode ?? styleMode(inputs);
  const all = compileThemeVars(doc, { ...inputs, mode: resolvedMode, colorFormat: "hex" });
  const vars: Record<string, string> = {};
  for (const [name, value] of Object.entries(all)) {
    if (KEEP.test(name)) vars[name] = SHADOW.test(name) ? scaleShadow(value, PREVIEW_SCALE) : value;
  }
  const result: StyleVars = {
    vars: Object.freeze(vars),
    mode: resolvedMode,
    surface: inputs.recipe.surface,
    recipeId: inputs.recipe.id,
  };
  return lruSet(styleVarsCache, key, Object.freeze(result), STYLE_VARS_CACHE_SIZE);
}
