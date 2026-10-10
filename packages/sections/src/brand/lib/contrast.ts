import type { ColorMode } from "../../types";
import type { BrandSystem, ContrastCheck } from "./system";

const toLinear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  return 0.2126 * toLinear((n >> 16) & 255) + 0.7152 * toLinear((n >> 8) & 255) + 0.0722 * toLinear(n & 255);
}

/** WCAG 2.x contrast ratio (1–21) of two `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
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
