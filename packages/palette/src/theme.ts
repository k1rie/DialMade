import {
  clamp,
  contrastRatio,
  ensureContrast,
  hueDelta,
  meetsAll,
  oklchOf,
  oklchToHex,
  requireHex,
  type Oklch,
} from "./color";
import {
  SCALE_STEPS,
  buildNeutralScale,
  buildScale,
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

export type ContrastCheck = {
  pair: string;
  fg: string;
  bg: string;
  ratio: number;
  required: number;
  pass: boolean;
  mode: ColorMode;
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

export type GenerateThemeInput = {
  primary: string;
  secondary?: string;
  achromatic?: boolean;
  style?: PaletteStyleId;
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

const STATUS_BASE = {
  success: { l: 0.63, c: 0.17, h: 150 },
  warning: { l: 0.77, c: 0.165, h: 75 },
  error: { l: 0.58, c: 0.22, h: 27 },
  info: { l: 0.62, c: 0.17, h: 240 },
} as const satisfies Record<string, Oklch>;

type StatusName = keyof typeof STATUS_BASE;

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

function buildRoles(mode: ColorMode, ctx: Context): ThemeRoles {
  const light = mode === "light";
  const n = ctx.neutral;
  const b = ctx.brand;
  const at = (scale: string[], i: number) => scale[i]!;
  const surface = (l: number) => oklchToHex({ l, c: ctx.neutralTint.chroma * 0.6, h: ctx.neutralTint.hue });
  const darkL = ctx.spec.darkBackgroundL;

  const background = light
    ? ctx.spec.lightBackground === "white" ? "#ffffff" : at(n, 0)
    : darkL !== undefined ? surface(darkL) : at(n, 10);
  const card = light ? "#ffffff" : darkL !== undefined ? surface(darkL + 0.06) : at(n, 9);
  const muted = light ? at(n, 1) : at(n, 8);
  const page = [background, card];

  const foreground = ensureContrast(at(n, light ? 10 : 0), targetsFor([background, card, muted], TEXT_CONTRAST));
  const secondaryForeground = ensureContrast(at(n, light ? 9 : 0), targetsFor([muted], TEXT_CONTRAST));
  const mutedForeground = ensureContrast(at(n, light ? 5 : 4), targetsFor([muted, background, card], TEXT_CONTRAST));

  const tintScale = ctx.achromatic ? ctx.accent : b;
  const accent = tintScale ? at(tintScale, light ? 1 : 10) : muted;
  const accentForeground = ensureContrast(
    tintScale ? at(tintScale, light ? 9 : 1) : at(n, light ? 9 : 0),
    targetsFor([accent], TEXT_CONTRAST),
  );

  const primary = light
    ? pick(b, ctx.brandAnchor, page, UI_CONTRAST, true)
    : pick(b, ctx.achromatic ? 2 : darkPreferred(ctx.brandAnchor), page, UI_CONTRAST, false);
  const darkText = [at(b, LAST), at(n, LAST)];

  const cta = ctx.accent
    ? light
      ? pick(ctx.accent, ctx.accentAnchor, page, UI_CONTRAST, true)
      : pick(ctx.accent, darkPreferred(ctx.accentAnchor), page, UI_CONTRAST, false)
    : primary;
  const ctaDarkText = ctx.accent ? [at(ctx.accent, LAST), at(n, LAST)] : darkText;

  const primaryText = light
    ? pick(b, ctx.brandAnchor, page, TEXT_CONTRAST, true)
    : pick(b, ctx.achromatic ? 1 : ctx.brandAnchor, page, TEXT_CONTRAST, false);

  const status = (name: StatusName) => {
    const scale = ctx.status[name];
    const color = light ? pick(scale, 6, page, TEXT_CONTRAST, true) : pick(scale, 4, page, TEXT_CONTRAST, false);
    return { color, foreground: onColor(color, [at(scale, LAST), at(n, LAST)]) };
  };
  const error = status("error");
  const success = status("success");
  const warning = status("warning");
  const info = status("info");

  const lineTargets = targetsFor(page, UI_CONTRAST);
  const input = ensureContrast(at(n, light ? 4 : 6), lineTargets);
  const ringScale = ctx.achromatic ? (ctx.accent ?? n) : b;
  const ring = ensureContrast(at(ringScale, light ? 5 : 4), lineTargets);

  const chart = [1, 2, 3, 4].map((k) =>
    ensureContrast(
      oklchToHex({ l: light ? 0.62 : 0.72, c: ctx.chart.chroma, h: ctx.chart.hue + 72 * k }),
      lineTargets,
    ),
  );

  return {
    background,
    foreground,
    card,
    cardForeground: foreground,
    popover: card,
    popoverForeground: foreground,
    primary,
    primaryForeground: onColor(primary, darkText),
    secondary: muted,
    secondaryForeground,
    muted,
    mutedForeground,
    accent,
    accentForeground,
    destructive: error.color,
    destructiveForeground: error.foreground,
    border: at(n, light ? 2 : 8),
    input,
    ring,
    brand: at(b, ctx.brandAnchor),
    cta,
    ctaForeground: onColor(cta, ctaDarkText),
    primaryText,
    borderStrong: input,
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
}

/** Safety net: any pair still failing gets its foreground moved in L until every target holds. */
function enforceContrast(roles: ThemeRoles): ThemeRoles {
  const out = { ...roles };
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const pair of CONTRAST_PAIRS) {
      if (contrastRatio(out[pair.fg], out[pair.bg]) >= pair.required) continue;
      const targets = CONTRAST_PAIRS.filter((p) => p.fg === pair.fg).map((p) => ({ bg: out[p.bg], ratio: p.required }));
      out[pair.fg] = ensureContrast(out[pair.fg], targets);
      changed = true;
    }
    if (!changed) break;
  }
  return out;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function checks(roles: ThemeRoles, mode: ColorMode): ContrastCheck[] {
  return CONTRAST_PAIRS.map(({ fg, bg, required }) => {
    const ratio = contrastRatio(roles[fg], roles[bg]);
    return { pair: `${fg}/${bg}`, fg: roles[fg], bg: roles[bg], ratio: round2(ratio), required, pass: ratio >= required, mode };
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

/**
 * Seeds + style → full light/dark theme. Every pair in CONTRAST_PAIRS meets WCAG 2.2 AA
 * (4.5:1 text, 3:1 UI) in both modes, and the brand hue moves at most ±15°.
 */
export function generateTheme(input: GenerateThemeInput): Theme {
  const styleId = input.style ?? "brand";
  const spec = STYLE_SPECS[styleId];
  if (!spec) throw new TypeError(`Unknown palette style: ${String(styleId)}`);

  const primaryHex = requireHex(input.primary, "primary");
  const secondaryHex = input.secondary === undefined ? undefined : requireHex(input.secondary, "secondary");
  const seed = oklchOf(primaryHex);
  const achromatic = input.achromatic ?? seed.c < CHROMATIC;

  const styledPrimary = styledSeedHex(styleId, primaryHex, achromatic);
  const brandScale = buildScale(styledPrimary.hex, {
    maxHueDrift: Math.max(0, MAX_STYLE_HUE_SHIFT - styledPrimary.hueShift),
  });
  const brand = hexes(brandScale.steps);
  const brandAnchor = stepIndex(brandScale.anchorStep);
  const brandColor = oklchOf(styledPrimary.hex);

  let accentSeed: string | undefined;
  if (spec.accent?.when === "always") {
    accentSeed = oklchToHex(spec.accent.color(brandColor, achromatic));
  } else if (styleId === "mono") {
    accentSeed = brand[brandAnchor + 3 <= LAST ? brandAnchor + 3 : brandAnchor - 3];
  } else if (secondaryHex) {
    accentSeed = styledSeedHex(styleId, secondaryHex, oklchOf(secondaryHex).c < CHROMATIC).hex;
  } else if (spec.accent && achromatic) {
    accentSeed = oklchToHex(spec.accent.color(brandColor, achromatic));
  }
  const accentScale = accentSeed ? buildScale(accentSeed) : undefined;
  const accentColor = accentSeed ? oklchOf(accentSeed) : undefined;

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
  };

  const light = enforceContrast(buildRoles("light", ctx));
  const dark = enforceContrast(buildRoles("dark", ctx));

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
    contrast: [...checks(light, "light"), ...checks(dark, "dark")],
    achromatic,
    defaultMode: spec.defaultMode,
    anchors: accentScale
      ? { brand: brandScale.anchorStep, accent: accentScale.anchorStep }
      : { brand: brandScale.anchorStep },
  };
}
