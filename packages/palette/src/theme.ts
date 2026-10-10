import {
  clamp,
  compositeOver,
  contrastRatio,
  deltaEOK,
  ensureContrast,
  hexToOklab,
  hueDelta,
  meetsAll,
  oklchOf,
  oklchToHex,
  parseColorWithAlpha,
  requireHex,
  type Oklch,
} from "./color";
import { ROLE_KEYS } from "./exporters";
import {
  SCALE_STEPS,
  buildNeutralScale,
  buildScale,
  completeScale,
  stepIndex,
  type ScaleStep,
  type ScaleStepNumber,
} from "./scale";
import {
  MAX_STYLE_HUE_SHIFT,
  STYLE_SPECS,
  applyStyle,
  harmonizeHue,
  type ColorMode,
  type PaletteStyleId,
  type StyleSpec,
} from "./styles";

/**
 * The colors of one mode. Every value is `#rrggbb`, or `#rrggbbaa` for a role pinned with alpha
 * (shadcn's dark `--border: oklch(1 0 0 / 10%)` → `#ffffff1a`). Generated values are always opaque.
 */
export type ThemeRoles = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  /** Exact (style-adjusted) brand color. Decorative: no contrast guarantee. */
  brand: string;
  cta: string;
  ctaForeground: string;
  /** Brand-colored text that meets 4.5:1 on background and card. */
  primaryText: string;
  /** Border that meets 3:1 on background and card (`border` stays decorative). */
  borderStrong: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
};

export type RoleKey = keyof ThemeRoles;

export type ContrastSource = "imported" | "generated";

export type ContrastCheck = {
  pair: string;
  /** The foreground role as it is (it may be `#rrggbbaa`: then it is measured painted over `bg`). */
  fg: string;
  /** The opaque backdrop measured: the bg role, painted over the page background when it is translucent. */
  bg: string;
  ratio: number;
  required: number;
  pass: boolean;
  mode: ColorMode;
  /**
   * `generated`: Dialmade can move at least one side of the pair, and the pair meets AA.
   * `imported`: the result comes from pinned values (`GenerateThemeInput.pinned`) and is reported
   * as it is, never adjusted. See `generateTheme`.
   */
  source: ContrastSource;
};

export type ThemeScales = {
  brand: ScaleStep[];
  accent?: ScaleStep[];
  neutral: ScaleStep[];
  success: ScaleStep[];
  warning: ScaleStep[];
  error: ScaleStep[];
  info: ScaleStep[];
};

export type Theme = {
  styleId: PaletteStyleId;
  /** Input seeds, normalized to `#rrggbb`. */
  seeds: { primary: string; secondary?: string };
  light: ThemeRoles;
  dark: ThemeRoles;
  scales: ThemeScales;
  contrast: ContrastCheck[];
  achromatic: boolean;
  defaultMode: ColorMode;
  anchors: { brand: ScaleStepNumber; accent?: ScaleStepNumber };
};

/** Imported values that must come out exactly as given. Role values take any CSS color; alpha is kept. */
export type ThemePins = {
  light?: Partial<ThemeRoles>;
  dark?: Partial<ThemeRoles>;
  /** Used as they are (opaque; missing steps are filled), anchored at the step closest in ΔEok to the primary / CTA. */
  scales?: { brand?: ScaleStep[]; accent?: ScaleStep[] };
};

export type GenerateThemeInput = {
  primary: string;
  secondary?: string;
  achromatic?: boolean;
  style?: PaletteStyleId;
  /**
   * A pinned primary (light, else dark) anchors the brand scale exactly, without the palette style;
   * a pinned `cta` does the same for the accent scale. The style then only changes neutrals, states,
   * charts and the roles that are not pinned.
   */
  pinned?: ThemePins;
};

export const TEXT_CONTRAST = 4.5;
export const UI_CONTRAST = 3;
const CHROMATIC = 0.04;
const LAST = SCALE_STEPS.length - 1;

type Pair = { fg: RoleKey; bg: RoleKey; required: number };

const text = (fg: RoleKey, ...bgs: RoleKey[]): Pair[] => bgs.map((bg) => ({ fg, bg, required: TEXT_CONTRAST }));
const ui = (fg: RoleKey, ...bgs: RoleKey[]): Pair[] => bgs.map((bg) => ({ fg, bg, required: UI_CONTRAST }));

/** Every pair checked (and enforced) in both modes. */
export const CONTRAST_PAIRS: readonly Pair[] = [
  ...text("foreground", "background", "muted"),
  ...text("cardForeground", "card"),
  ...text("popoverForeground", "popover"),
  ...text("primaryForeground", "primary"),
  ...text("secondaryForeground", "secondary"),
  ...text("mutedForeground", "muted", "background", "card"),
  ...text("accentForeground", "accent"),
  ...text("destructiveForeground", "destructive"),
  ...text("destructive", "background", "card"),
  ...text("ctaForeground", "cta"),
  ...text("primaryText", "background", "card"),
  ...text("successForeground", "success"),
  ...text("success", "background", "card"),
  ...text("warningForeground", "warning"),
  ...text("warning", "background", "card"),
  ...text("infoForeground", "info"),
  ...text("info", "background", "card"),
  ...ui("primary", "background", "card"),
  ...ui("cta", "background", "card"),
  ...ui("ring", "background", "card"),
  ...ui("input", "background", "card"),
  ...ui("borderStrong", "background", "card"),
  ...ui("chart1", "background", "card"),
  ...ui("chart2", "background", "card"),
  ...ui("chart3", "background", "card"),
  ...ui("chart4", "background", "card"),
  ...ui("chart5", "background", "card"),
];

/** Page surfaces: never moved to rescue a pinned color, because that would change the whole theme. */
const SURFACES: ReadonlySet<RoleKey> = new Set<RoleKey>(["background", "card", "popover", "muted"]);
/** What a translucent page background is painted over. */
const CANVAS: Record<ColorMode, string> = { light: "#ffffff", dark: "#000000" };

const STATUS_BASE = {
  success: { l: 0.63, c: 0.17, h: 150 },
  warning: { l: 0.77, c: 0.165, h: 75 },
  error: { l: 0.58, c: 0.22, h: 27 },
  info: { l: 0.62, c: 0.17, h: 240 },
} as const satisfies Record<string, Oklch>;

type StatusName = keyof typeof STATUS_BASE;
type RolePins = Partial<Record<RoleKey, string>>;

type Context = {
  spec: StyleSpec;
  achromatic: boolean;
  brand: string[];
  brandAnchor: number;
  accent?: string[];
  accentAnchor: number;
  neutral: string[];
  neutralTint: { hue: number; chroma: number };
  status: Record<StatusName, string[]>;
  chart: { hue: number; chroma: number };
  pins: Record<ColorMode, RolePins>;
};

const targetsFor = (bgs: string[], ratio: number) => bgs.map((bg) => ({ bg, ratio }));

/** Scale step closest to `preferred` that meets `ratio` on every bg; ties go darker or lighter. */
function pick(scale: string[], preferred: number, bgs: string[], ratio: number, darkerFirst: boolean): string {
  const targets = targetsFor(bgs, ratio);
  for (let d = 0; d <= LAST; d++) {
    const order = d === 0 ? [preferred] : darkerFirst ? [preferred + d, preferred - d] : [preferred - d, preferred + d];
    for (const i of order) {
      const hex = scale[i];
      if (hex && meetsAll(hex, targets)) return hex;
    }
  }
  return ensureContrast(scale[preferred]!, targets);
}

/** White when it reads (≥4.5:1), otherwise the first dark candidate that does. */
function onColor(bg: string, darkCandidates: string[]): string {
  for (const candidate of ["#ffffff", ...darkCandidates, "#000000"]) {
    if (contrastRatio(candidate, bg) >= TEXT_CONTRAST) return candidate;
  }
  return contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
}

const darkPreferred = (anchor: number) => (anchor <= 6 ? anchor : 5);

/** Opaque backdrop of a bg role: the page background over the canvas, any other role over the page. */
function backdrop(roles: ThemeRoles, key: RoleKey, mode: ColorMode): string {
  const page = compositeOver(roles.background, CANVAS[mode]);
  return key === "background" ? page : compositeOver(roles[key], page);
}

function buildRoles(mode: ColorMode, ctx: Context): ThemeRoles {
  const light = mode === "light";
  const pin = ctx.pins[mode];
  const n = ctx.neutral;
  const b = ctx.brand;
  const at = (scale: string[], i: number) => scale[i]!;
  const surface = (l: number) => oklchToHex({ l, c: ctx.neutralTint.chroma * 0.6, h: ctx.neutralTint.hue });
  const darkL = ctx.spec.darkBackgroundL;

  const background =
    pin.background ??
    (light
      ? ctx.spec.lightBackground === "white" ? "#ffffff" : at(n, 0)
      : darkL !== undefined ? surface(darkL) : at(n, 10));
  const card = pin.card ?? (light ? "#ffffff" : darkL !== undefined ? surface(darkL + 0.06) : at(n, 9));
  const muted = pin.muted ?? (light ? at(n, 1) : at(n, 8));
  const secondary = pin.secondary ?? muted;
  const pageBg = compositeOver(background, CANVAS[mode]);
  const flat = (hex: string) => compositeOver(hex, pageBg);
  const page = [pageBg, flat(card)];

  const foreground =
    pin.foreground ?? ensureContrast(at(n, light ? 10 : 0), targetsFor([pageBg, flat(card), flat(muted)], TEXT_CONTRAST));
  const secondaryForeground =
    pin.secondaryForeground ?? ensureContrast(at(n, light ? 9 : 0), targetsFor([flat(secondary)], TEXT_CONTRAST));
  const mutedForeground =
    pin.mutedForeground ??
    ensureContrast(at(n, light ? 5 : 4), targetsFor([flat(muted), pageBg, flat(card)], TEXT_CONTRAST));

  const tintScale = ctx.achromatic ? ctx.accent : b;
  const accent = pin.accent ?? (tintScale ? at(tintScale, light ? 1 : 10) : muted);
  const accentForeground =
    pin.accentForeground ??
    ensureContrast(tintScale ? at(tintScale, light ? 9 : 1) : at(n, light ? 9 : 0), targetsFor([flat(accent)], TEXT_CONTRAST));

  const primary =
    pin.primary ??
    (light
      ? pick(b, ctx.brandAnchor, page, UI_CONTRAST, true)
      : pick(b, ctx.achromatic ? 2 : darkPreferred(ctx.brandAnchor), page, UI_CONTRAST, false));
  const darkText = [at(b, LAST), at(n, LAST)];

  const cta =
    pin.cta ??
    (ctx.accent
      ? light
        ? pick(ctx.accent, ctx.accentAnchor, page, UI_CONTRAST, true)
        : pick(ctx.accent, darkPreferred(ctx.accentAnchor), page, UI_CONTRAST, false)
      : primary);
  const ctaDarkText = ctx.accent ? [at(ctx.accent, LAST), at(n, LAST)] : darkText;

  const primaryText =
    pin.primaryText ??
    (light
      ? pick(b, ctx.brandAnchor, page, TEXT_CONTRAST, true)
      : pick(b, ctx.achromatic ? 1 : ctx.brandAnchor, page, TEXT_CONTRAST, false));

  const status = (name: StatusName, colorRole: RoleKey, foregroundRole: RoleKey) => {
    const scale = ctx.status[name];
    const color =
      pin[colorRole] ?? (light ? pick(scale, 6, page, TEXT_CONTRAST, true) : pick(scale, 4, page, TEXT_CONTRAST, false));
    return { color, foreground: pin[foregroundRole] ?? onColor(flat(color), [at(scale, LAST), at(n, LAST)]) };
  };
  const error = status("error", "destructive", "destructiveForeground");
  const success = status("success", "success", "successForeground");
  const warning = status("warning", "warning", "warningForeground");
  const info = status("info", "info", "infoForeground");

  const lineTargets = targetsFor(page, UI_CONTRAST);
  // Also fills borderStrong when `input` is pinned (e.g. a translucent shadcn input).
  const line = ensureContrast(at(n, light ? 4 : 6), lineTargets);
  const ringScale = ctx.achromatic ? (ctx.accent ?? n) : b;
  const ring = pin.ring ?? ensureContrast(at(ringScale, light ? 5 : 4), lineTargets);

  const chart = [1, 2, 3, 4].map((k) =>
    ensureContrast(
      oklchToHex({ l: light ? 0.62 : 0.72, c: ctx.chart.chroma, h: ctx.chart.hue + 72 * k }),
      lineTargets,
    ),
  );

  const roles: ThemeRoles = {
    background,
    foreground,
    card,
    cardForeground: foreground,
    popover: card,
    popoverForeground: foreground,
    primary,
    primaryForeground: pin.primaryForeground ?? onColor(flat(primary), darkText),
    secondary,
    secondaryForeground,
    muted,
    mutedForeground,
    accent,
    accentForeground,
    destructive: error.color,
    destructiveForeground: error.foreground,
    border: at(n, light ? 2 : 8),
    input: line,
    ring,
    brand: at(b, ctx.brandAnchor),
    cta,
    ctaForeground: pin.ctaForeground ?? onColor(flat(cta), ctaDarkText),
    primaryText,
    borderStrong: line,
    success: success.color,
    successForeground: success.foreground,
    warning: warning.color,
    warningForeground: warning.foreground,
    info: info.color,
    infoForeground: info.foreground,
    chart1: primary,
    chart2: chart[0]!,
    chart3: chart[1]!,
    chart4: chart[2]!,
    chart5: chart[3]!,
  };
  return { ...roles, ...pin };
}

/** The role Dialmade may move to fix a pair: its foreground, else a generated fill under a pinned foreground. */
function moverOf(pair: Pair, pinned: ReadonlySet<RoleKey>): RoleKey | undefined {
  if (!pinned.has(pair.fg)) return pair.fg;
  if (!pinned.has(pair.bg) && !SURFACES.has(pair.bg)) return pair.bg;
  return undefined;
}

/** Nearest OKLCH lightness (hue and chroma kept) where `ok` holds; unchanged when there is none. */
function fitLightness(start: string, ok: (hex: string) => boolean): string {
  if (ok(start)) return start;
  const o = oklchOf(start);
  const at = (l: number) => oklchToHex({ l, c: o.c, h: o.h });
  let best: number | undefined;
  for (let i = 0; i <= 100; i++) {
    const l = i / 100;
    if ((best === undefined || Math.abs(l - o.l) < Math.abs(best - o.l)) && ok(at(l))) best = l;
  }
  if (best === undefined) return start;
  let pass = best;
  let fail = Math.abs(best - o.l) <= 0.01 ? o.l : best > o.l ? best - 0.01 : best + 0.01;
  for (let i = 0; i < 24; i++) {
    const mid = (pass + fail) / 2;
    if (ok(at(mid))) pass = mid;
    else fail = mid;
  }
  return at(pass);
}

/** New value for `role` that meets every pair it is the foreground of, and every pinned text on it. */
function adjust(out: ThemeRoles, role: RoleKey, mode: ColorMode, pinned: ReadonlySet<RoleKey>): string {
  const asFg = CONTRAST_PAIRS.filter((p) => p.fg === role).map((p) => ({ bg: backdrop(out, p.bg, mode), ratio: p.required }));
  const asBg = CONTRAST_PAIRS.filter((p) => p.bg === role && pinned.has(p.fg));
  if (asBg.length === 0) return ensureContrast(out[role], asFg);
  return fitLightness(
    out[role],
    (hex) => meetsAll(hex, asFg) && asBg.every((p) => contrastRatio(out[p.fg], hex) >= p.required),
  );
}

/**
 * Safety net: a failing pair gets its foreground moved in L until every target holds. A pinned
 * value never moves: its generated partner does, except a page surface (see SURFACES).
 */
function enforceContrast(roles: ThemeRoles, mode: ColorMode, pinned: ReadonlySet<RoleKey>): ThemeRoles {
  const out = { ...roles };
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const pair of CONTRAST_PAIRS) {
      if (contrastRatio(out[pair.fg], backdrop(out, pair.bg, mode)) >= pair.required) continue;
      const role = moverOf(pair, pinned);
      if (!role) continue;
      out[role] = adjust(out, role, mode, pinned);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Whether a pinned value takes part in the pair or constrains the role that would fix it. */
function pinnedAround(pair: Pair, mover: RoleKey, pinned: ReadonlySet<RoleKey>): boolean {
  if (pinned.has(pair.fg) || pinned.has(pair.bg)) return true;
  return CONTRAST_PAIRS.some((p) => (p.fg === mover && pinned.has(p.bg)) || (p.bg === mover && pinned.has(p.fg)));
}

function checks(roles: ThemeRoles, mode: ColorMode, pinned: ReadonlySet<RoleKey>): ContrastCheck[] {
  return CONTRAST_PAIRS.map((pair) => {
    const bg = backdrop(roles, pair.bg, mode);
    const ratio = contrastRatio(roles[pair.fg], bg);
    const pass = ratio >= pair.required;
    const mover = moverOf(pair, pinned);
    // Still failing although Dialmade could move a side: pinned values left it no room.
    const generated = mover !== undefined && (pass || !pinnedAround(pair, mover, pinned));
    return {
      pair: `${pair.fg}/${pair.bg}`,
      fg: roles[pair.fg],
      bg,
      ratio: round2(ratio),
      required: pair.required,
      pass,
      mode,
      source: generated ? "generated" : "imported",
    };
  });
}

const sameColor = (a: Oklch, b: Oklch) =>
  Math.abs(a.l - b.l) < 1e-9 && Math.abs(a.c - b.c) < 1e-9 && Math.abs(hueDelta(a.h, b.h)) < 1e-6;

function styledSeedHex(style: PaletteStyleId, hex: string, achromatic: boolean): { hex: string; hueShift: number } {
  const seed = oklchOf(hex);
  const styled = applyStyle(style, seed, achromatic);
  if (sameColor(seed, styled)) return { hex, hueShift: 0 };
  return { hex: oklchToHex(styled), hueShift: Math.abs(hueDelta(seed.h, styled.h)) };
}

function statusScale(base: Oklch, ctx: { achromatic: boolean; brandHue: number; chroma: number }): ScaleStep[] {
  const h = ctx.achromatic ? base.h : harmonizeHue(base.h, ctx.brandHue);
  return buildScale(oklchToHex({ l: base.l, c: base.c * ctx.chroma, h }), { maxHueDrift: 0 }).steps;
}

const hexes = (steps: ScaleStep[]) => steps.map((s) => s.hex);

const ROLE_SET: ReadonlySet<string> = new Set(ROLE_KEYS);

function rolePins(pins: Partial<ThemeRoles> | undefined, mode: ColorMode): RolePins {
  const out: RolePins = {};
  for (const [key, value] of Object.entries(pins ?? {})) {
    if (value === undefined) continue;
    if (!ROLE_SET.has(key)) throw new TypeError(`Unknown pinned role: ${mode}.${key}`);
    const color = typeof value === "string" ? parseColorWithAlpha(value) : null;
    if (!color) throw new TypeError(`Invalid pinned ${mode}.${key}: ${JSON.stringify(value)}`);
    out[key as RoleKey] = color;
  }
  return out;
}

/** An imported scale, anchored at its given step closest in ΔEok to `reference` (or to the middle without one). */
function importedScale(
  steps: readonly ScaleStep[] | undefined,
  reference: string | undefined,
): { steps: ScaleStep[]; anchorStep: ScaleStepNumber } | undefined {
  const complete = steps ? completeScale(steps) : undefined;
  if (!steps || !complete) return undefined;
  const given = new Set(steps.map((s) => s.step));
  const candidates = complete.filter((s) => given.has(s.step));
  const ref = reference ? hexToOklab(reference) : undefined;
  const distance = (s: ScaleStep) =>
    ref ? deltaEOK(hexToOklab(s.hex), ref) : Math.abs(stepIndex(s.step) - stepIndex(500));
  const anchor = candidates.reduce((best, s) => (distance(s) < distance(best) ? s : best));
  return { steps: complete, anchorStep: anchor.step };
}

const opaque = (color: string | undefined) => color?.slice(0, 7);

/**
 * Seeds + style → full light/dark theme. The brand hue moves at most ±15°, and every pair in
 * CONTRAST_PAIRS is checked against WCAG 2.2 AA (4.5:1 text, 3:1 UI) in both modes:
 * every pair with at least one generated role meets AA; pairs that are 100% imported are reported.
 * Precisely: every `source: "generated"` check passes, and `imported` ones keep their values.
 *
 * - Without `pinned`, every pair is `source: "generated"` and passes.
 * - Pinned values come out exactly as given and are never adjusted. When a pair fails, Dialmade
 *   moves its generated side (the foreground, or a generated fill under a pinned text color), and
 *   fills `primaryText` and `borderStrong` so brand text and strong borders still pass.
 * - `source: "imported"` marks the pairs whose result comes from the pins, reported with their real
 *   `pass`: both roles pinned; a pinned color on a generated page surface (background, card,
 *   popover, muted), because moving the page to rescue it would change the whole theme; and a pair
 *   that pinned values leave unsolvable (a pinned white background next to a pinned black card).
 * - Translucent colors (`#rrggbbaa`) are measured painted over the pair's background.
 */
export function generateTheme(input: GenerateThemeInput): Theme {
  const styleId = input.style ?? "brand";
  const spec = STYLE_SPECS[styleId];
  if (!spec) throw new TypeError(`Unknown palette style: ${String(styleId)}`);

  const primaryHex = requireHex(input.primary, "primary");
  const secondaryHex = input.secondary === undefined ? undefined : requireHex(input.secondary, "secondary");
  const pins = { light: rolePins(input.pinned?.light, "light"), dark: rolePins(input.pinned?.dark, "dark") };
  const pinnedPrimary = opaque(pins.light.primary ?? pins.dark.primary);
  const pinnedCta = opaque(pins.light.cta ?? pins.dark.cta);
  const brandHex = pinnedPrimary ?? primaryHex;
  const seed = oklchOf(brandHex);
  const achromatic = input.achromatic ?? seed.c < CHROMATIC;

  const styledPrimary = styledSeedHex(styleId, brandHex, achromatic);
  const brandScale =
    importedScale(input.pinned?.scales?.brand, brandHex) ??
    (pinnedPrimary
      ? buildScale(pinnedPrimary, { maxHueDrift: MAX_STYLE_HUE_SHIFT })
      : buildScale(styledPrimary.hex, { maxHueDrift: Math.max(0, MAX_STYLE_HUE_SHIFT - styledPrimary.hueShift) }));
  const brand = hexes(brandScale.steps);
  const brandAnchor = stepIndex(brandScale.anchorStep);
  // The style still drives neutrals, states and charts, even when the brand scale is pinned.
  const brandColor = oklchOf(styledPrimary.hex);

  let accentSeed: string | undefined;
  if (pinnedCta) {
    accentSeed = pinnedCta;
  } else if (spec.accent?.when === "always") {
    accentSeed = oklchToHex(spec.accent.color(brandColor, achromatic));
  } else if (styleId === "mono") {
    accentSeed = brand[brandAnchor + 3 <= LAST ? brandAnchor + 3 : brandAnchor - 3];
  } else if (secondaryHex) {
    accentSeed = styledSeedHex(styleId, secondaryHex, oklchOf(secondaryHex).c < CHROMATIC).hex;
  } else if (spec.accent && achromatic) {
    accentSeed = oklchToHex(spec.accent.color(brandColor, achromatic));
  }
  const pinnedAccent = importedScale(input.pinned?.scales?.accent, pinnedCta ?? secondaryHex ?? accentSeed);
  const accentScale = pinnedAccent ?? (accentSeed ? buildScale(accentSeed) : undefined);
  const accentColor = pinnedAccent
    ? oklchOf(pinnedAccent.steps[stepIndex(pinnedAccent.anchorStep)]!.hex)
    : accentSeed
      ? oklchOf(accentSeed)
      : undefined;

  const neutralTint = spec.neutral(brandColor, achromatic);
  const neutralSteps = buildNeutralScale(neutralTint.hue, neutralTint.chroma);
  const statusCtx = { achromatic, brandHue: brandColor.h, chroma: spec.statusChroma };
  const success = statusScale(STATUS_BASE.success, statusCtx);
  const warning = statusScale(STATUS_BASE.warning, statusCtx);
  const error = statusScale(STATUS_BASE.error, statusCtx);
  const info = statusScale(STATUS_BASE.info, statusCtx);

  const chartSource = achromatic ? accentColor : brandColor;
  const ctx: Context = {
    spec,
    achromatic,
    brand,
    brandAnchor,
    accent: accentScale ? hexes(accentScale.steps) : undefined,
    accentAnchor: accentScale ? stepIndex(accentScale.anchorStep) : brandAnchor,
    neutral: hexes(neutralSteps),
    neutralTint,
    status: { success: hexes(success), warning: hexes(warning), error: hexes(error), info: hexes(info) },
    chart: {
      hue: chartSource && chartSource.c >= CHROMATIC ? chartSource.h : 250,
      chroma: clamp(chartSource?.c ?? 0.13, 0.1, 0.17),
    },
    pins,
  };

  const pinnedLight = new Set(Object.keys(pins.light) as RoleKey[]);
  const pinnedDark = new Set(Object.keys(pins.dark) as RoleKey[]);
  const light = enforceContrast(buildRoles("light", ctx), "light", pinnedLight);
  const dark = enforceContrast(buildRoles("dark", ctx), "dark", pinnedDark);

  return {
    styleId,
    seeds: secondaryHex ? { primary: primaryHex, secondary: secondaryHex } : { primary: primaryHex },
    light,
    dark,
    scales: {
      brand: brandScale.steps,
      ...(accentScale ? { accent: accentScale.steps } : {}),
      neutral: neutralSteps,
      success,
      warning,
      error,
      info,
    },
    contrast: [...checks(light, "light", pinnedLight), ...checks(dark, "dark", pinnedDark)],
    achromatic,
    defaultMode: spec.defaultMode,
    anchors: accentScale
      ? { brand: brandScale.anchorStep, accent: accentScale.anchorStep }
      : { brand: brandScale.anchorStep },
  };
}
