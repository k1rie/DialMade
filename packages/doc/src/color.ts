import {
  ROLE_KEYS,
  compositeOver,
  cssVarName,
  formatOklch,
  type ColorMode,
  type CssColorFormat,
  type Theme,
} from "@dialmade/palette";

/** Lowercase, and `#rrggbbff` → `#rrggbb` (an opaque alpha byte is dropped). */
export function normalizeTokenColor(color: string): string {
  const lower = color.toLowerCase();
  return lower.length === 9 && lower.endsWith("ff") ? lower.slice(0, 7) : lower;
}

/** CSS value of a token color; alpha is kept: `oklch(l c h / a)` or `#rrggbbaa`. */
export function tokenColorCss(color: string, format: CssColorFormat = "oklch"): string {
  const value = normalizeTokenColor(color);
  return format === "hex" ? value : formatOklch(value);
}

/**
 * Every role of one mode (theme roles with `overrides` on top, keyed by CSS name) as opaque
 * `#rrggbb`: translucent colors are painted over the mode's background, which is itself painted
 * over white (light) or black (dark) when translucent.
 */
export function opaqueRoles(
  theme: Theme,
  mode: ColorMode,
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string> {
  const roles = mode === "light" ? theme.light : theme.dark;
  const raw: Record<string, string> = {};
  for (const key of ROLE_KEYS) raw[cssVarName(key)] = normalizeTokenColor(roles[key]);
  for (const [name, value] of Object.entries(overrides)) if (value) raw[name] = normalizeTokenColor(value);
  const base = compositeOver(raw.background!, mode === "light" ? "#ffffff" : "#000000");
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw)) out[name] = name === "background" ? base : compositeOver(value, base);
  return out;
}
