import {
  ROLE_KEYS,
  TEXT_CONTRAST,
  contrastRatio,
  cssVarName,
  formatOklch,
  hexToOklch,
  oklchToHex,
  type ColorMode,
  type CssColorFormat,
  type Theme,
} from "@dialmade/palette";

/** How far a hover/active fill moves from its base color (like `color-mix(… 14%)`). */
const HOVER_MIX = 0.14;
/** Most a secondary text on a fill may lean towards the fill. */
const MUTED_MAX_MIX = 0.32;
/** Margin over AA so rounding in other formats never drops below it. */
const CONTRAST_MARGIN = 0.1;

type Lab = { l: number; a: number; b: number };

function toLab(hex: string): Lab {
  const o = hexToOklch(hex) ?? { l: 0, c: 0, h: 0 };
  const h = Number.isFinite(o.h) ? (o.h * Math.PI) / 180 : 0;
  return { l: o.l, a: o.c * Math.cos(h), b: o.c * Math.sin(h) };
}

/** `color-mix(in oklab, from, to t)` as hex. */
export function mixOklab(from: string, to: string, t: number): string {
  const x = toLab(from);
  const y = toLab(to);
  const l = x.l + (y.l - x.l) * t;
  const a = x.a + (y.a - x.a) * t;
  const b = x.b + (y.b - x.b) * t;
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return oklchToHex({ l, c: Math.hypot(a, b), h: (h + 360) % 360 });
}

const isLighter = (x: string, y: string) => contrastRatio(x, "#000000") > contrastRatio(y, "#000000");

/**
 * Hover/active fill of a solid control: `fill` moved away from its `text` (towards white under dark
 * text, towards black under light text), so the text contrast can only grow.
 */
export function hoverFill(fill: string, text: string, amount: number = HOVER_MIX): string {
  return mixOklab(fill, isLighter(text, fill) ? "#000000" : "#ffffff", amount);
}

/**
 * A quieter text on `fill` (subtitles over a brand panel): `text` leaning towards the fill as far as
 * it can while keeping AA (4.5:1). Without headroom it stays `text`.
 */
export function mutedTextOn(fill: string, text: string, min: number = TEXT_CONTRAST): string {
  const target = min + CONTRAST_MARGIN;
  if (contrastRatio(text, fill) < target) return text;
  let lo = 0;
  let hi = MUTED_MAX_MIX;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixOklab(text, fill, mid), fill) >= target) lo = mid;
    else hi = mid;
  }
  return lo === 0 ? text : mixOklab(text, fill, lo);
}

/** Interaction colors derived from the roles; part of the theme contract read by @dialmade/ui and @dialmade/sections. */
export const STATE_COLOR_VARS = [
  "--primary-hover",
  "--primary-foreground-hover",
  "--primary-foreground-muted",
  "--secondary-hover",
  "--cta-hover",
  "--destructive-hover",
] as const;

export interface StateColorOptions {
  format?: CssColorFormat;
  /** Role overrides by CSS name (`{ primary: "#…" }`), like `doc.tokens.color[mode]`. */
  overrides?: Readonly<Record<string, string | undefined>>;
}

/** The `STATE_COLOR_VARS` of one mode (hover fills and muted text on the primary). */
export function stateColorVars(theme: Theme, mode: ColorMode, options: StateColorOptions = {}): Record<string, string> {
  const roles = mode === "light" ? theme.light : theme.dark;
  const hex: Record<string, string> = {};
  for (const key of ROLE_KEYS) hex[cssVarName(key)] = roles[key].toLowerCase();
  for (const [name, value] of Object.entries(options.overrides ?? {})) if (value) hex[name] = value.toLowerCase();
  const role = (name: string) => hex[name] ?? "#000000";
  const out = (value: string) => (options.format === "hex" ? value : formatOklch(value));

  return {
    "--primary-hover": out(hoverFill(role("primary"), role("primary-foreground"))),
    "--primary-foreground-hover": out(hoverFill(role("primary-foreground"), role("primary"))),
    "--primary-foreground-muted": out(mutedTextOn(role("primary"), role("primary-foreground"))),
    "--secondary-hover": out(hoverFill(role("secondary"), role("secondary-foreground"))),
    "--cta-hover": out(hoverFill(role("cta"), role("cta-foreground"))),
    "--destructive-hover": out(hoverFill(role("destructive"), role("destructive-foreground"))),
  };
}
