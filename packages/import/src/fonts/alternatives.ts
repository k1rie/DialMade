// Curated tables of the matcher. Keys are `familyKey` values; every target is a Google Fonts family
// (fonts.test.ts checks them against font-index.json).

/** Renamed or packaged names of a Google Fonts family: same design, so `match.kind: "alias"`. */
export const FONT_ALIASES: Readonly<Record<string, string>> = {
  sourcesanspro: "Source Sans 3",
  sourceserifpro: "Source Serif 4",
  intervariable: "Inter",
  intervar: "Inter",
  interdisplay: "Inter",
  interui: "Inter",
  rsmsinter: "Inter",
  geistsans: "Geist",
  opensanscondensed: "Open Sans",
  plusjakartadisplay: "Plus Jakarta Sans",
  jetbrainsmononl: "JetBrains Mono",
  ibmplex: "IBM Plex Sans",
};

/** Free families with the same metrics (layout does not shift): `match.kind: "metric-compatible"`. */
export const METRIC_COMPATIBLE: Readonly<Record<string, string>> = {
  arial: "Arimo",
  helvetica: "Arimo",
  liberationsans: "Arimo",
  timesnewroman: "Tinos",
  times: "Tinos",
  liberationserif: "Tinos",
  couriernew: "Cousine",
  courier: "Cousine",
  liberationmono: "Cousine",
  calibri: "Carlito",
  cambria: "Caladea",
  georgia: "Gelasio",
};

/**
 * Proprietary families and a free family in the same style («sugerencia, no equivalente»):
 * `match.kind: "style-alt"`, the first one as `family`.
 */
export const STYLE_ALTERNATIVES: Readonly<Record<string, readonly string[]>> = {
  helveticaneue: ["Inter", "Arimo"],
  futura: ["Jost"],
  futurapt: ["Jost"],
  gotham: ["Montserrat"],
  circular: ["Figtree", "DM Sans"],
  circularstd: ["Figtree", "DM Sans"],
  circularxx: ["Figtree", "DM Sans"],
  proximanova: ["Figtree", "Montserrat"],
  avenir: ["Nunito Sans"],
  avenirnext: ["Nunito Sans"],
  garamond: ["EB Garamond"],
  adobegaramond: ["EB Garamond"],
  adobegaramondpro: ["EB Garamond"],
  baskerville: ["Libre Baskerville"],
  caslon: ["Libre Caslon Text"],
  adobecaslon: ["Libre Caslon Text"],
  adobecaslonpro: ["Libre Caslon Text"],
  bodoni: ["Bodoni Moda"],
  didot: ["GFS Didot", "Playfair Display"],
  franklingothic: ["Libre Franklin"],
  myriad: ["Source Sans 3"],
  myriadpro: ["Source Sans 3"],
  minionpro: ["Source Serif 4"],
  operatormono: ["JetBrains Mono"],
  sfmono: ["JetBrains Mono"],
};

/** Style alternatives offered for system families (they stay `match.kind: "system"`, with these as `candidates`). */
export const SYSTEM_ALTERNATIVES: Readonly<Record<string, readonly string[]>> = {
  applesystem: ["Inter"],
  blinkmacsystemfont: ["Inter"],
  systemui: ["Inter"],
  uisansserif: ["Inter"],
  sfpro: ["Inter"],
  sfprotext: ["Inter"],
  sfprodisplay: ["Inter"],
  sanfrancisco: ["Inter"],
  segoeui: ["Open Sans", "Noto Sans"],
  segoeuivariable: ["Open Sans", "Noto Sans"],
  uimonospace: ["JetBrains Mono"],
  sfmono: ["JetBrains Mono"],
  sfmonoregular: ["JetBrains Mono"],
  menlo: ["JetBrains Mono"],
  monaco: ["JetBrains Mono"],
  consolas: ["JetBrains Mono"],
};

/** Words that name a role, not a family: `var(--font-sans)` or `var(--font-heading)` say nothing about the font. */
export const GENERIC_VAR_WORDS: ReadonlySet<string> = new Set([
  "sans",
  "serif",
  "mono",
  "monospace",
  "display",
  "heading",
  "headings",
  "headline",
  "title",
  "body",
  "base",
  "text",
  "copy",
  "primary",
  "secondary",
  "tertiary",
  "ui",
  "code",
  "default",
  "family",
  "custom",
  "main",
  "accent",
  "brand",
  "system",
  "emoji",
  "icon",
  "icons",
  "font",
  "fonts",
  "regular",
  "variable",
]);
