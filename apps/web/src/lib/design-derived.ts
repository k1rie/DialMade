import type { MotionTier, OutputKind, StyleRecipe, TypographyPairing } from "@dialmade/catalog";
import { compileThemeVars, effectiveDials, resolveThemeInputs, type DesignDoc, type Dials, type ThemeInputs } from "@dialmade/doc";
import { generateTheme, type Theme } from "@dialmade/palette";

export type ThemeVars = Readonly<Record<string, string>>;

/** Everything a preview needs from one DesignDoc (and one page's dials). */
export type DesignDerived = {
  /** `generateTheme` of the doc's seeds, achromatic flag and palette style. */
  theme: Theme;
  recipe: StyleRecipe;
  pairing: TypographyPairing;
  motionTier: MotionTier;
  /** `{ theme, recipe, pairing, motionTier }`, ready for `compileThemeVars`/`resolveTokens`/exporters. */
  inputs: ThemeInputs;
  /** Page whose dials were applied (`null` = global dials only). */
  kind: OutputKind | null;
  /** Global dials with the page's overrides on top. */
  dials: Dials;
  /** `compileThemeVars` output per mode: colors, `--dl-*` tokens and component variables. */
  vars: { light: ThemeVars; dark: ThemeVars };
};

const THEME_CACHE_SIZE = 12;
const themeCache = new Map<string, Theme>();

/** generateTheme is the expensive part and only depends on the brand + palette style: cache it by value. */
function themeFor(doc: DesignDoc): Theme {
  const { seeds, achromatic } = doc.brand;
  const key = `${seeds.primary}|${seeds.secondary ?? ""}|${achromatic ? 1 : 0}|${doc.brief.paletteStyleId}`;
  const cached = themeCache.get(key);
  if (cached) {
    themeCache.delete(key);
    themeCache.set(key, cached);
    return cached;
  }
  const theme = generateTheme({
    primary: seeds.primary,
    ...(seeds.secondary && { secondary: seeds.secondary }),
    achromatic,
    style: doc.brief.paletteStyleId,
  });
  themeCache.set(key, theme);
  if (themeCache.size > THEME_CACHE_SIZE) themeCache.delete(themeCache.keys().next().value as string);
  return theme;
}

const derivedCache = new WeakMap<DesignDoc, Map<string, DesignDerived>>();

/**
 * Theme, catalog choices and CSS variables (both modes) of a document. Docs are immutable, so the
 * result is memoized per doc object and page: calling it on every render is cheap.
 */
export function deriveDesign(doc: DesignDoc, kind: OutputKind | null = null): DesignDerived {
  const pageKind = kind && doc.pages[kind] ? kind : null;
  const key = pageKind ?? "";
  let perDoc = derivedCache.get(doc);
  const hit = perDoc?.get(key);
  if (hit) return hit;

  const inputs = resolveThemeInputs(doc, { theme: themeFor(doc) });
  const pageDials = pageKind ? doc.pages[pageKind]?.dials : undefined;
  const compile = (mode: "light" | "dark") => compileThemeVars(doc, { ...inputs, mode, ...(pageDials && { pageDials }) });
  const derived: DesignDerived = {
    ...inputs,
    inputs,
    kind: pageKind,
    dials: effectiveDials(doc, pageKind ?? undefined),
    vars: { light: compile("light"), dark: compile("dark") },
  };

  if (!perDoc) derivedCache.set(doc, (perDoc = new Map()));
  perDoc.set(key, derived);
  return derived;
}
