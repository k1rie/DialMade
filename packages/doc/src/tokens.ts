import {
  DEFAULT_PAIRING_ID,
  DEFAULT_RECIPE_ID,
  getMotionTier,
  getStyleRecipe,
  resolveRecipe,
  getTypographyPairing,
  googleFontsCss2Url,
  type FontRequest,
  type MotionTier,
  type StyleRecipe,
  type TypographyPairing,
} from "@dialmade/catalog";
import {
  ROLE_KEYS,
  SCALE_STEPS,
  cssVarName,
  formatOklch,
  generateTheme,
  scaleGroups,
  type ColorMode,
  type GenerateThemeInput,
  type RoleKey,
  type ScaleStep,
  type ScaleStepNumber,
  type Theme,
  type ThemePins,
  type ThemeRoles,
} from "@dialmade/palette";
import { normalizeTokenColor, opaqueRoles } from "./color";
import { FONT_SIZE_NAMES, RADIUS_NAMES, SHADOW_NAMES } from "./constants";
import { isLocked } from "./locks";
import type { ColorScaleTokens, ComponentShape, ComponentSize, DesignDoc, Dials, FontFamilyTokenValue } from "./schema";

export { FONT_SIZE_NAMES, RADIUS_NAMES, SHADOW_NAMES };

export interface ThemeInputs {
  /** From `generateTheme` (@dialmade/palette). */
  theme: Theme;
  recipe: StyleRecipe;
  pairing: TypographyPairing;
  motionTier: MotionTier;
}

export interface TokenOptions extends ThemeInputs {
  mode: ColorMode;
  /** Page dials on top of `doc.brief.dials` (e.g. the App page's density). */
  pageDials?: Partial<Dials>;
}

const ROLE_BY_NAME = new Map<string, RoleKey>(ROLE_KEYS.map((key) => [cssVarName(key), key]));

const scaleSteps = (scale: ColorScaleTokens): ScaleStep[] =>
  SCALE_STEPS.flatMap((step: ScaleStepNumber) => {
    const hex = scale[String(step)];
    return hex ? [{ step, hex: hex.toLowerCase(), oklch: formatOklch(hex.toLowerCase()) }] : [];
  });

/**
 * The locked part of `tokens.color` as @dialmade/palette pins: roles keyed like `ThemeRoles`
 * (`primaryForeground`, alpha kept) and the 50–950 scales. Locked means «tu guía manda»: the theme
 * is built around these values. Unlocked colors still win in `compileThemeVars`, but do not anchor
 * the theme (e.g. «Color de botón»). `undefined` when nothing is pinned.
 */
export function pinnedFor(doc: DesignDoc): ThemePins | undefined {
  const pins: ThemePins = {};
  for (const mode of ["light", "dark"] as const) {
    const roles: Partial<ThemeRoles> = {};
    for (const [name, value] of Object.entries(doc.tokens.color[mode])) {
      const key = ROLE_BY_NAME.get(name);
      if (key && value && isLocked(doc, `/tokens/color/${mode}/${name}`)) roles[key] = normalizeTokenColor(value);
    }
    if (Object.keys(roles).length > 0) pins[mode] = roles;
  }
  const scales: NonNullable<ThemePins["scales"]> = {};
  for (const name of ["brand", "accent"] as const) {
    const scale = doc.tokens.color.scales?.[name];
    if (scale && isLocked(doc, `/tokens/color/scales/${name}`)) {
      const steps = scaleSteps(scale);
      if (steps.length > 0) scales[name] = steps;
    }
  }
  if (scales.brand || scales.accent) pins.scales = scales;
  return pins.light || pins.dark || pins.scales ? pins : undefined;
}

/** What `resolveThemeInputs` passes to `generateTheme`: seeds, palette style and the locked colors as `pinned`. */
export function themeInputFor(doc: DesignDoc): GenerateThemeInput {
  const { brand, brief } = doc;
  const pinned = pinnedFor(doc);
  return {
    primary: brand.seeds.primary,
    ...(brand.seeds.secondary && { secondary: brand.seeds.secondary }),
    achromatic: brand.achromatic,
    style: brief.paletteStyleId,
    ...(pinned && { pinned }),
  };
}

/** Catalog objects and theme for the doc's choices; any of them can be overridden (live previews). */
export function resolveThemeInputs(doc: DesignDoc, overrides: Partial<ThemeInputs> = {}): ThemeInputs {
  const { brief } = doc;
  return {
    theme: overrides.theme ?? generateTheme(themeInputFor(doc)),
    recipe: overrides.recipe ?? resolveRecipe(brief.recipeId, brief.themeId) ?? getStyleRecipe(DEFAULT_RECIPE_ID)!,
    pairing: overrides.pairing ?? getTypographyPairing(brief.pairingId) ?? getTypographyPairing(DEFAULT_PAIRING_ID)!,
    motionTier: overrides.motionTier ?? getMotionTier(brief.motionTier) ?? getMotionTier("standard")!,
  };
}

/** The doc's own 50–950 scales by export name (`accent` → `cta`): step → `#rrggbb`. */
export function scaleOverrides(doc: DesignDoc): [string, Record<number, string>][] {
  const out: [string, Record<number, string>][] = [];
  for (const [name, exported] of [["brand", "brand"], ["accent", "cta"]] as const) {
    const scale = doc.tokens.color.scales?.[name];
    if (scale) out.push([exported, Object.fromEntries(scaleSteps(scale).map((s) => [s.step, s.hex]))]);
  }
  return out;
}

// ── dial math ──────────────────────────────────────────────────────────────────

/** Piecewise-linear dial (1..10): 1 → `atMin`, 5 → `atMid` (neutral), 10 → `atMax`. */
export function dialLerp(value: number, atMin: number, atMid: number, atMax: number): number {
  const v = Math.min(10, Math.max(1, value));
  return v <= 5 ? atMin + ((atMid - atMin) * (v - 1)) / 4 : atMid + ((atMax - atMid) * (v - 5)) / 5;
}

const round = (value: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};
const even = (value: number) => Math.round(value / 2) * 2;

// ── model ──────────────────────────────────────────────────────────────────────

export type FontSizeName = (typeof FONT_SIZE_NAMES)[number];
export type RadiusName = (typeof RADIUS_NAMES)[number];
export type ShadowName = (typeof SHADOW_NAMES)[number];

export interface FontToken {
  /** Web font family, or `null` for the system stack. */
  family: string | null;
  /** Full CSS `font-family` value. */
  stack: string;
  /** Available weights; empty when unknown (own families without `weights`). */
  weights: number[];
  /** `tokens`: the doc's own family (`tokens.typography`); absent: from the pairing. */
  source?: "tokens";
  /** Google Fonts family to load for this role (`null`: nothing to load). Absent for pairing fonts, which all load. */
  load?: string | null;
}

/** `minPx < px` means the size is fluid between 375px and 1280px viewports. */
export interface FontSize {
  px: number;
  minPx: number;
}

export interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  /** `#rrggbb`. */
  color: string;
  alpha: number;
}

/** A dimension that aliases another token (`ref`, e.g. `"radius.md"` or `"space.4"`) or is literal. */
export interface DimensionRef {
  px: number;
  ref?: string;
}

export type ShadowRef = ShadowName | "none";

export interface ComponentTokens {
  button: { radius: DimensionRef; hSm: number; hMd: number; hLg: number; px: DimensionRef; weight: number; shadow: ShadowRef };
  card: {
    radius: DimensionRef;
    padding: DimensionRef;
    shadow: ShadowRef;
    border: { width: number; color: "border" | "border-strong" } | null;
  };
  input: { radius: DimensionRef; h: DimensionRef };
  badge: { radius: DimensionRef };
  nav: { h: number };
  table: { rowH: number };
  sidebar: { w: number };
}

export interface ResolvedTokens {
  mode: ColorMode;
  dials: Dials;
  /**
   * Role → `#rrggbb` for this mode, with the doc's color overrides applied. Keys are CSS names
   * (`primary-foreground`). A color with alpha is composited over this mode's background; the CSS and
   * DTCG exports keep the real alpha.
   */
  colors: Record<string, string>;
  /** Scale group (`brand`, `cta`, `neutral`, `success`…) → step → `#rrggbb`. */
  scales: Record<string, Record<number, string>>;
  fonts: { heading: FontToken; body: FontToken; mono: FontToken };
  fontSizes: Record<FontSizeName, FontSize>;
  lineHeights: { tight: number; body: number };
  heading: { weight: number; tracking: number };
  bodyWeight: number;
  radius: Record<RadiusName, number>;
  /** `space[0]` is `--dl-space-1`. */
  space: number[];
  layout: { sectionPy: number; container: number };
  shadows: Record<ShadowName, ShadowLayer[]>;
  borderWidth: number;
  motion: { fast: number; base: number; slow: number; ease: string; bezier: [number, number, number, number] | null };
  components: ComponentTokens;
}

// ── resolvers ──────────────────────────────────────────────────────────────────

const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const BASE_SPACE = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];
const SIZE_FACTOR: Record<ComponentSize, number> = { compact: 0.875, normal: 1, roomy: 1.125 };
const SIDEBAR_WIDTH = { narrow: 224, normal: 256, wide: 288 } as const;
const PADDING_SPACE: Record<ComponentSize, number> = { compact: 4, normal: 5, roomy: 6 };
const ELEVATION_SHADOW: Record<0 | 1 | 2 | 3, ShadowRef> = { 0: "none", 1: "sm", 2: "md", 3: "lg" };

const quoteFamily = (family: string) => `"${family.replace(/"/g, "")}"`;

/** CSS generic families and system keywords, written unquoted in a stack (lowercase). */
const UNQUOTED_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "-apple-system",
  "blinkmacsystemfont",
]);

const cssFamily = (name: string) => (UNQUOTED_FAMILIES.has(name.toLowerCase()) ? name : quoteFamily(name));

function familyWeights(pairing: TypographyPairing, role: "heading" | "body"): number[] {
  const own = pairing[role];
  const other = pairing[role === "heading" ? "body" : "heading"];
  const weights = own.family === other.family ? [...own.weights, ...other.weights] : own.weights;
  return [...new Set(weights)].sort((a, b) => a - b);
}

/** Closest available weight; ties go heavier. */
export function nearestWeight(target: number, available: readonly number[]): number {
  if (available.length === 0) return target;
  return available.reduce((best, w) => {
    const d = Math.abs(w - target);
    const bd = Math.abs(best - target);
    return d < bd || (d === bd && w > best) ? w : best;
  });
}

const isMono = (font: FontToken) => /monospace/.test(font.stack) || /\bmono\b/i.test(font.family ?? "");

function fontToken(font: { family: string; fallback: string }, weights: number[]): FontToken {
  return { family: font.family, stack: `${quoteFamily(font.family)}, ${font.fallback}`, weights };
}

/** The doc's own family: `family, substitute, ...fallback` (or the pairing's fallback for the role). */
function ownFontToken(own: FontFamilyTokenValue, defaultFallback: string): FontToken {
  const names = [own.family, ...(own.substitute ? [own.substitute] : []), ...(own.fallback ?? [])];
  const seen = new Set<string>();
  const unique = names.filter((name) => !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
  const stack = unique.map(cssFamily).join(", ");
  return {
    family: own.family,
    stack: own.fallback && own.fallback.length > 0 ? stack : `${stack}, ${defaultFallback}`,
    weights: [...new Set(own.weights ?? [])].sort((a, b) => a - b),
    source: "tokens",
    load: own.source === "google" ? own.family : (own.substitute ?? null),
  };
}

/** Mono role taken from a heading/body family that is monospaced. */
function monoFrom(font: FontToken): FontToken {
  if (font.source !== "tokens") return { family: font.family, stack: `${quoteFamily(font.family!)}, ${SYSTEM_MONO}`, weights: font.weights };
  const lead = font.stack.split(", ").filter((part) => !UNQUOTED_FAMILIES.has(part.toLowerCase()));
  return { ...font, stack: [...lead, SYSTEM_MONO].join(", ") };
}

/**
 * Heading, body and mono families: the doc's own (`tokens.typography`) where set, the pairing's
 * otherwise. A monospaced heading or body also serves as mono.
 */
export function resolveFonts(doc: Pick<DesignDoc, "tokens">, pairing: TypographyPairing): ResolvedTokens["fonts"] {
  const own = doc.tokens.typography;
  const heading = own.heading ? ownFontToken(own.heading, pairing.heading.fallback) : fontToken(pairing.heading, familyWeights(pairing, "heading"));
  const body = own.body ? ownFontToken(own.body, pairing.body.fallback) : fontToken(pairing.body, familyWeights(pairing, "body"));
  const mono = own.mono
    ? ownFontToken(own.mono, SYSTEM_MONO)
    : isMono(heading)
      ? monoFrom(heading)
      : isMono(body)
        ? monoFrom(body)
        : { family: null, stack: SYSTEM_MONO, weights: [400, 500, 700] };
  return { heading, body, mono };
}

/**
 * Google Fonts css2 URL for the doc's fonts: the pairing's URL when no own family is set, otherwise
 * the loadable families (Google source or free substitute) with their weights. `null` when the own
 * families need nothing from Google Fonts.
 */
export function fontsUrlFor(doc: Pick<DesignDoc, "tokens">, pairing: TypographyPairing): string | null {
  const own = doc.tokens.typography;
  if (!own.heading && !own.body && !own.mono) return pairing.googleFontsUrl;
  const fonts = resolveFonts(doc, pairing);
  const requests: FontRequest[] = [];
  for (const font of [fonts.heading, fonts.body, fonts.mono]) {
    const family = font.source === "tokens" ? font.load : font.family;
    if (family) requests.push({ family, weights: font.weights });
  }
  return requests.length > 0 ? googleFontsCss2Url(requests) : null;
}

/** Line height, tracking or weight of the first heading step (h1, h2, display, h3) the doc sets. */
function headingMetric(doc: DesignDoc, key: "lineHeight" | "letterSpacing" | "weight"): number | undefined {
  const scale = doc.tokens.typography.scale;
  for (const name of ["h1", "h2", "display", "h3"] as const) {
    const value = scale[name]?.[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

function resolveFontSizes(doc: DesignDoc, variance: number): Record<FontSizeName, FontSize> {
  const o = doc.tokens.fontSize;
  const ratio = dialLerp(variance, 1.125, 1.25, 1.333);
  const displayFactor = dialLerp(variance, 1.3, 1.44, 1.6);
  const body = o.body ?? 16;
  const h3 = o.h3 ?? round(body * ratio ** 2);
  const h2 = o.h2 ?? round(body * ratio ** 3);
  const h1Base = round(body * ratio ** 4);
  const h1 = o.h1 ?? h1Base;
  const display = o.display ?? round(h1Base * displayFactor);
  const fixed = (px: number): FontSize => ({ px, minPx: px });
  const fluid = (px: number, min: number, overridden: boolean): FontSize =>
    overridden ? fixed(px) : { px, minPx: Math.min(px, Math.max(min, 1)) };
  const h1Min = Math.max(h2, round(h1 * 0.8));
  return {
    display: fluid(display, Math.max(h1Min, round(display * 0.6)), o.display !== undefined),
    h1: fluid(h1, h1Min, o.h1 !== undefined),
    h2: fixed(h2),
    h3: fixed(h3),
    body: fixed(body),
    small: fixed(o.small ?? 14),
    caption: fixed(o.caption ?? 12),
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type Layer = [x: number, y: number, blur: number, spread: number, alpha: number];

const SHADOW_RECIPES: Record<Exclude<StyleRecipe["shadow"], "none">, Record<ShadowName, Layer[]>> = {
  soft: {
    sm: [[0, 1, 2, 0, 0.05], [0, 1, 3, 0, 0.08]],
    md: [[0, 4, 12, -2, 0.08], [0, 2, 4, -2, 0.06]],
    lg: [[0, 16, 40, -8, 0.14], [0, 6, 12, -6, 0.08]],
  },
  crisp: {
    sm: [[2, 2, 0, 0, 1]],
    md: [[4, 4, 0, 0, 1]],
    lg: [[6, 6, 0, 0, 1]],
  },
  deep: {
    sm: [[0, 2, 4, 0, 0.12], [0, 1, 2, 0, 0.08]],
    md: [[0, 12, 32, -8, 0.24], [0, 4, 8, -4, 0.12]],
    lg: [[0, 32, 72, -16, 0.38], [0, 12, 24, -12, 0.18]],
  },
  glow: {
    sm: [[0, 0, 0, 1, 0.2], [0, 0, 12, -2, 0.25]],
    md: [[0, 0, 0, 1, 0.25], [0, 0, 24, -4, 0.35]],
    lg: [[0, 0, 0, 1, 0.3], [0, 0, 48, -8, 0.45]],
  },
};

function resolveShadows(
  kind: StyleRecipe["shadow"],
  mode: ColorMode,
  colors: { shadow: string; primary: string; foreground: string },
): Record<ShadowName, ShadowLayer[]> {
  if (kind === "none") return { sm: [], md: [], lg: [] };
  const color = kind === "glow" ? colors.primary : kind === "crisp" ? colors.foreground : colors.shadow;
  const boost = mode === "light" || kind === "crisp" ? 1 : kind === "glow" ? 1.4 : 2.2;
  const build = (layers: Layer[]) =>
    layers.map(([x, y, blur, spread, alpha]) => ({
      x,
      y,
      blur,
      spread,
      color,
      alpha: boost === 1 ? alpha : round(Math.min(0.9, alpha * boost), 3),
    }));
  const spec = SHADOW_RECIPES[kind];
  return { sm: build(spec.sm), md: build(spec.md), lg: build(spec.lg) };
}

const EASE_KEYWORDS = new Map<string, [number, number, number, number]>([
  ["linear", [0, 0, 1, 1]],
  ["ease", [0.25, 0.1, 0.25, 1]],
  ["ease-in", [0.42, 0, 1, 1]],
  ["ease-out", [0, 0, 0.58, 1]],
  ["ease-in-out", [0.42, 0, 0.58, 1]],
]);

/** `cubic-bezier(a, b, c, d)` or a CSS easing keyword → control points; `null` when unknown. */
export function parseCubicBezier(ease: string): [number, number, number, number] | null {
  const keyword = EASE_KEYWORDS.get(ease.trim());
  if (keyword) return [...keyword];
  const match = /^cubic-bezier\(\s*([^)]+)\)$/.exec(ease.trim());
  if (!match) return null;
  const values = match[1]!.split(",").map((v) => Number(v.trim()));
  return values.length === 4 && values.every(Number.isFinite) ? (values as [number, number, number, number]) : null;
}

const shapeRadius = (shape: ComponentShape, radius: Record<RadiusName, number>): DimensionRef => {
  const name: RadiusName = shape === "square" ? "sm" : shape === "rounded" ? "md" : "full";
  return { px: radius[name], ref: `radius.${name}` };
};

const spaceRef = (space: number[], step: number): DimensionRef => ({ px: space[step - 1]!, ref: `space.${step}` });

/**
 * Every token of the design for one mode: color (from the theme + overrides), type, shape, space,
 * elevation, motion and component tokens (recipe + `doc.system`). Pure and deterministic.
 * Dials: density scales spacing and control heights (higher = denser); variance widens the type
 * scale and amplifies radii; motion scales durations.
 */
export function resolveTokens(doc: DesignDoc, options: TokenOptions): ResolvedTokens {
  const { theme, recipe, pairing, motionTier, mode } = options;
  const dials: Dials = { ...doc.brief.dials, ...options.pageDials };
  const { variance, density } = dials;
  const colors = opaqueRoles(theme, mode, doc.tokens.color[mode]);

  const scales: ResolvedTokens["scales"] = {};
  for (const [name, steps] of scaleGroups(theme)) scales[name] = Object.fromEntries(steps.map((s) => [s.step, s.hex]));
  for (const [name, own] of scaleOverrides(doc)) scales[name] = { ...scales[name], ...own };

  const fonts = resolveFonts(doc, pairing);
  const radiusFactor = dialLerp(variance, 0.5, 1, 1.5);
  const ro = doc.tokens.radius;
  const radius: Record<RadiusName, number> = {
    sm: ro.sm ?? round(recipe.radius.sm * radiusFactor),
    md: ro.md ?? round(recipe.radius.md * radiusFactor),
    lg: ro.lg ?? round(recipe.radius.lg * radiusFactor),
    xl: ro.xl ?? round(recipe.radius.xl * radiusFactor),
    full: 9999,
  };

  const spaceFactor = dialLerp(density, 1.25, 1, 0.75);
  const so = doc.tokens.space as Partial<Record<string, number>>;
  const space = BASE_SPACE.map((px, i) => so[String(i + 1)] ?? Math.max(1, round(px * spaceFactor)));

  const heightFactor = dialLerp(density, 1.1, 1, 0.85);
  const borderWidth = doc.tokens.borderWidth ?? recipe.borderWidth;
  const neutral = theme.scales.neutral;
  const derivedShadows = resolveShadows(recipe.shadow, mode, {
    shadow: neutral[neutral.length - 1]!.hex,
    primary: colors.primary!,
    foreground: colors.foreground!,
  });
  const elevation = doc.tokens.elevation;
  const shadows: Record<ShadowName, ShadowLayer[]> = {
    sm: elevation.sm ? elevation.sm.map((layer) => ({ ...layer, color: layer.color.toLowerCase() })) : derivedShadows.sm,
    md: elevation.md ? elevation.md.map((layer) => ({ ...layer, color: layer.color.toLowerCase() })) : derivedShadows.md,
    lg: elevation.lg ? elevation.lg.map((layer) => ({ ...layer, color: layer.color.toLowerCase() })) : derivedShadows.lg,
  };
  const shadowRef = (ref: ShadowRef): ShadowRef => (ref !== "none" && shadows[ref].length > 0 ? ref : "none");

  const mo = doc.tokens.motion;
  const motionFactor = dialLerp(dials.motion, 0.6, 1, 1.4);
  const duration = (ms: number) => round((ms * motionFactor) / 5) * 5;
  const ease = mo.ease ?? motionTier.ease;

  const sys = doc.system;
  const buttonShape = sys.button.shape ?? recipe.button.shape;
  const hMd = even(40 * heightFactor);
  const cardBorder = (sys.card.border ?? recipe.card.border) && borderWidth > 0;

  const components: ComponentTokens = {
    button: {
      radius: shapeRadius(buttonShape, radius),
      hSm: even(32 * heightFactor),
      hMd,
      hLg: even(48 * heightFactor),
      px: spaceRef(space, buttonShape === "pill" ? 5 : 4),
      weight: nearestWeight(sys.button.weight ?? recipe.button.weight, fonts.body.weights),
      shadow: shadowRef((sys.button.shadow ?? recipe.button.shadow) ? "sm" : "none"),
    },
    card: {
      radius: { px: radius.lg, ref: "radius.lg" },
      padding: spaceRef(space, PADDING_SPACE[sys.card.padding ?? recipe.card.padding]),
      shadow: shadowRef(ELEVATION_SHADOW[sys.card.elevation ?? recipe.card.elevation]),
      border: cardBorder ? { width: borderWidth, color: recipe.surface === "outlined" ? "border-strong" : "border" } : null,
    },
    input: {
      radius: shapeRadius(sys.input.shape ?? (buttonShape === "square" ? "square" : "rounded"), radius),
      h: { px: hMd, ref: "component.button.h-md" },
    },
    badge: { radius: shapeRadius(sys.badge.shape ?? (buttonShape === "square" ? "square" : "pill"), radius) },
    nav: { h: even(64 * heightFactor * SIZE_FACTOR[sys.nav.size ?? "normal"]) },
    table: { rowH: even(48 * heightFactor * SIZE_FACTOR[sys.table.size ?? "normal"]) },
    sidebar: { w: SIDEBAR_WIDTH[sys.sidebar.width ?? "normal"] },
  };

  const typeScale = doc.tokens.typography.scale;
  return {
    mode,
    dials,
    colors,
    scales,
    fonts,
    fontSizes: resolveFontSizes(doc, variance),
    lineHeights: {
      tight: headingMetric(doc, "lineHeight") ?? round(dialLerp(variance, 1.25, 1.15, 1.05), 2),
      body: typeScale.body?.lineHeight ?? round(dialLerp(density, 1.7, 1.6, 1.45), 2),
    },
    heading: {
      weight: headingMetric(doc, "weight") ?? nearestWeight(recipe.headingWeight, fonts.heading.weights),
      tracking: headingMetric(doc, "letterSpacing") ?? recipe.headingTracking,
    },
    bodyWeight: typeScale.body?.weight ?? nearestWeight(400, fonts.body.weights),
    radius,
    space,
    layout: {
      sectionPy: round(96 * dialLerp(density, 1.33, 1, 0.67)),
      container: round(dialLerp(density, 1120, 1200, 1320) / 8) * 8,
    },
    shadows,
    borderWidth,
    motion: {
      fast: mo.fast ?? duration(motionTier.durations.fast),
      base: mo.base ?? duration(motionTier.durations.base),
      slow: mo.slow ?? duration(motionTier.durations.slow),
      ease,
      bezier: parseCubicBezier(ease),
    },
    components,
  };
}
