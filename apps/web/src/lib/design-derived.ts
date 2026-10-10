import type { MotionTier, OutputKind, StyleRecipe, TypographyPairing } from "@dialmade/catalog";
import {
  compileThemeVars,
  effectiveDials,
  fontsUrlFor,
  pageForKey,
  resolveThemeInputs,
  themeInputFor,
  type DesignDoc,
  type Dials,
  type PageKey,
  type ThemeInputs,
} from "@dialmade/doc";
import { generateTheme, type Theme } from "@dialmade/palette";

export type ThemeVars = Readonly<Record<string, string>>;

/** Everything a preview needs from one DesignDoc (and one page's dials). */
export type DesignDerived = {
  /** `generateTheme` of the doc's seeds, achromatic flag, palette style and locked colors (`themeInputFor`). */
  theme: Theme;
  recipe: StyleRecipe;
  pairing: TypographyPairing;
  motionTier: MotionTier;
  /** `{ theme, recipe, pairing, motionTier }`, ready for `compileThemeVars`/`resolveTokens`/exporters. */
  inputs: ThemeInputs;
  /** Page whose dials were applied: a page kind or a screen id (`null` = global dials only). */
  key: PageKey | null;
  /** Kind of that page (a screen's `kind`; `null` = global dials only). */
  kind: OutputKind | null;
  /** Global dials with the page's overrides on top. */
  dials: Dials;
  /** `compileThemeVars` output per mode: colors, `--dl-*` tokens and component variables. */
  vars: { light: ThemeVars; dark: ThemeVars };
  /** Google Fonts stylesheet: the doc's own families (`tokens.typography`) or the pairing's; `null` = nothing to load. */
  fontsUrl: string | null;
};

const THEME_CACHE_SIZE = 12;
const themeCache = new Map<string, Theme>();

/**
 * generateTheme is the expensive part and only depends on what `themeInputFor` passes it (seeds,
 * palette style and the locked imported colors as `pinned`): cache it by value. With the pins, a
 * locked primary anchors the brand scale, CTA, ring and charts here too («tu guía manda»).
 */
function themeFor(doc: DesignDoc): Theme {
  const input = themeInputFor(doc);
  const key = JSON.stringify(input);
  const cached = themeCache.get(key);
  if (cached) {
    themeCache.delete(key);
    themeCache.set(key, cached);
    return cached;
  }
  const theme = generateTheme(input);
  themeCache.set(key, theme);
  if (themeCache.size > THEME_CACHE_SIZE) themeCache.delete(themeCache.keys().next().value as string);
  return theme;
}

const derivedCache = new WeakMap<DesignDoc, Map<string, DesignDerived>>();

/**
 * Theme, catalog choices and CSS variables (both modes) of a document, with the dials of one page: a page
 * kind (`"brand"`, or a legacy `"landing"`/`"app"`) or a screen id. Docs are immutable, so the result is
 * memoized per doc object and page: calling it on every render is cheap.
 */
export function deriveDesign(doc: DesignDoc, key: PageKey | null = null): DesignDerived {
  const page = key ? pageForKey(doc, key) : undefined;
  const pageKey = page ? key : null;
  const cacheKey = pageKey ?? "";
  let perDoc = derivedCache.get(doc);
  const hit = perDoc?.get(cacheKey);
  if (hit) return hit;

  const inputs = resolveThemeInputs(doc, { theme: themeFor(doc) });
  const pageDials = page?.dials;
  const compile = (mode: "light" | "dark") => compileThemeVars(doc, { ...inputs, mode, ...(pageDials && { pageDials }) });
  const derived: DesignDerived = {
    ...inputs,
    inputs,
    key: pageKey,
    kind: page?.kind ?? null,
    dials: effectiveDials(doc, pageKey ?? undefined),
    vars: { light: compile("light"), dark: compile("dark") },
    fontsUrl: fontsUrlFor(doc, inputs.pairing),
  };

  if (!perDoc) derivedCache.set(doc, (perDoc = new Map()));
  perDoc.set(cacheKey, derived);
  return derived;
}
