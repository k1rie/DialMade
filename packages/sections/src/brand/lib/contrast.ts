import type { ColorMode } from "../../types";
import type { BrandSystem, ContrastCheck } from "./system";

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

type Rgba = [number, number, number, number];

function rgba(hex: string): Rgba {
  const raw = hex.replace("#", "");
  const n = Number.parseInt(raw.slice(0, 6), 16);
  const alpha = raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

/** `fg` painted over an opaque `bg` (sRGB, like the browser). */
const over = ([r, g, b, a]: Rgba, [br, bgc, bb]: Rgba): Rgba => [r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a), 1];

const luminance = ([r, g, b]: Rgba) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

/**
 * WCAG 2.x contrast ratio (1–21) of `fg` on `bg` (`#rrggbb` or `#rrggbbaa`): a translucent `fg` is
 * painted over `bg`, a translucent `bg` over white (shadcn's dark `--border` is white at 10%).
 */
export function contrastRatio(fg: string, bg: string): number {
  const back = rgba(bg);
  const base = back[3] < 1 ? over(back, [255, 255, 255, 1]) : back;
  const front = rgba(fg);
  const la = luminance(front[3] < 1 ? over(front, base) : front);
  const lb = luminance(base);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `primaryForeground` → `primary-foreground`, `chart1` → `chart-1` (the CSS name of a role). */
export const roleCssName = (role: string): string => role.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

export interface ContrastRow extends ContrastCheck {
  fgRole: string;
  bgRole: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * The AA checks of one mode (`theme.contrast`). When the doc overrides colors of that mode, the
 * ratios are recomputed with the resolved colors so the table never shows stale numbers.
 */
export function contrastRows(system: BrandSystem, mode: ColorMode): ContrastRow[] {
  const colors = system.tokens[mode].colors;
  return system.theme.contrast
    .filter((check) => check.mode === mode)
    .map((check) => {
      const [fgRole = "", bgRole = ""] = check.pair.split("/");
      if (!system.overridden[mode]) return { ...check, fgRole, bgRole };
      const fg = colors[roleCssName(fgRole)] ?? check.fg;
      const bg = colors[roleCssName(bgRole)] ?? check.bg;
      const ratio = round2(contrastRatio(fg, bg));
      return { ...check, fgRole, bgRole, fg, bg, ratio, pass: ratio >= check.required };
    });
}

export interface ContrastSummary {
  passed: number;
  total: number;
}

export function contrastSummary(rows: readonly ContrastRow[]): ContrastSummary {
  return { passed: rows.filter((row) => row.pass).length, total: rows.length };
}
