import { SCALE_STEPS, generateTheme, toCssVarRecord, type CssColorFormat, type Theme } from "@dialmade/palette";
import { opaqueRoles, tokenColorCss } from "./color";
import type { DesignDoc } from "./schema";
import { stateColorVars } from "./stateColors";
import {
  FONT_SIZE_NAMES,
  RADIUS_NAMES,
  SHADOW_NAMES,
  hexToRgb,
  resolveThemeInputs,
  resolveTokens,
  scaleOverrides,
  themeInputFor,
  type DimensionRef,
  type FontSize,
  type ResolvedTokens,
  type ShadowLayer,
  type ShadowRef,
  type ThemeInputs,
  type TokenOptions,
} from "./tokens";

/**
 * `mode` plus any of the theme inputs: the missing ones come from `resolveThemeInputs(doc)`, so the
 * theme is generated with the doc's locked colors as `pinned`. A `theme` passed in should come from
 * `generateTheme(themeInputFor(doc))` for the same reason.
 */
export interface CompileThemeVarsOptions extends Omit<TokenOptions, keyof ThemeInputs>, Partial<ThemeInputs> {
  /** Color value format (default `oklch`, like `toCssVars`). */
  colorFormat?: CssColorFormat;
}

const MIN_VIEWPORT = 375;
const MAX_VIEWPORT = 1280;

export const trimNumber = (value: number, digits = 4): string => {
  const out = Number(value.toFixed(digits));
  return Object.is(out, -0) ? "0" : String(out);
};
export const px = (value: number): string => (value === 0 ? "0" : `${trimNumber(value)}px`);
export const rem = (pxValue: number): string => (pxValue === 0 ? "0" : `${trimNumber(pxValue / 16)}rem`);

/** Fixed sizes in rem; fluid sizes as `clamp(min, intercept + slope·vw, max)` between 375px and 1280px. */
export function fontSizeCss(size: FontSize): string {
  if (size.minPx >= size.px) return rem(size.px);
  const slope = (size.px - size.minPx) / (MAX_VIEWPORT - MIN_VIEWPORT);
  const intercept = size.minPx - slope * MIN_VIEWPORT;
  return `clamp(${rem(size.minPx)}, ${trimNumber(intercept / 16)}rem + ${trimNumber(slope * 100)}vw, ${rem(size.px)})`;
}

export function shadowCss(layers: readonly ShadowLayer[]): string {
  if (layers.length === 0) return "none";
  return layers
    .map((l) => {
      const [r, g, b] = hexToRgb(l.color);
      return `${px(l.x)} ${px(l.y)} ${px(l.blur)} ${px(l.spread)} rgb(${r} ${g} ${b} / ${trimNumber(l.alpha, 3)})`;
    })
    .join(", ");
}

const refVar = (ref: string) => `var(--dl-${ref.replace(/^component\./, "").replace(/\./g, "-")})`;
const dimension = (value: DimensionRef) => (value.ref ? refVar(value.ref) : px(value.px));
const shadowVar = (ref: ShadowRef) => (ref === "none" ? "none" : `var(--dl-shadow-${ref})`);

/** The non-color `--dl-*` variables (type, shape, space, elevation, motion and components). */
export function tokensToCssVars(tokens: ResolvedTokens): Record<string, string> {
  const vars: Record<string, string> = {
    "--dl-font-heading": tokens.fonts.heading.stack,
    "--dl-font-body": tokens.fonts.body.stack,
    "--dl-font-mono": tokens.fonts.mono.stack,
  };
  for (const name of FONT_SIZE_NAMES) vars[`--dl-fs-${name}`] = fontSizeCss(tokens.fontSizes[name]);
  vars["--dl-lh-tight"] = trimNumber(tokens.lineHeights.tight);
  vars["--dl-lh-body"] = trimNumber(tokens.lineHeights.body);
  vars["--dl-heading-weight"] = String(tokens.heading.weight);
  vars["--dl-heading-tracking"] = tokens.heading.tracking === 0 ? "0" : `${trimNumber(tokens.heading.tracking)}em`;
  for (const name of RADIUS_NAMES) vars[`--dl-radius-${name}`] = px(tokens.radius[name]);
  tokens.space.forEach((value, i) => (vars[`--dl-space-${i + 1}`] = px(value)));
  vars["--dl-section-py"] = px(tokens.layout.sectionPy);
  vars["--dl-container"] = px(tokens.layout.container);
  for (const name of SHADOW_NAMES) vars[`--dl-shadow-${name}`] = shadowCss(tokens.shadows[name]);
  vars["--dl-border-width"] = px(tokens.borderWidth);
  vars["--dl-duration-fast"] = `${tokens.motion.fast}ms`;
  vars["--dl-duration-base"] = `${tokens.motion.base}ms`;
  vars["--dl-duration-slow"] = `${tokens.motion.slow}ms`;
  vars["--dl-ease"] = tokens.motion.ease;

  const { button, card, input, badge, nav, table, sidebar } = tokens.components;
  vars["--dl-button-radius"] = dimension(button.radius);
  vars["--dl-button-h-sm"] = px(button.hSm);
  vars["--dl-button-h-md"] = px(button.hMd);
  vars["--dl-button-h-lg"] = px(button.hLg);
  vars["--dl-button-px"] = dimension(button.px);
  vars["--dl-button-weight"] = String(button.weight);
  vars["--dl-button-shadow"] = shadowVar(button.shadow);
  vars["--dl-card-radius"] = dimension(card.radius);
  vars["--dl-card-padding"] = dimension(card.padding);
  vars["--dl-card-shadow"] = shadowVar(card.shadow);
  vars["--dl-card-border"] = card.border ? `var(--dl-border-width) solid var(--${card.border.color})` : "none";
  vars["--dl-input-radius"] = dimension(input.radius);
  vars["--dl-input-h"] = dimension(input.h);
  vars["--dl-badge-radius"] = dimension(badge.radius);
  vars["--dl-nav-h"] = px(nav.h);
  vars["--dl-table-row-h"] = px(table.rowH);
  vars["--dl-sidebar-w"] = px(sidebar.w);
  return vars;
}

/**
 * Color variables for one mode: @dialmade/palette's record, the doc's colors on top (`tokens.color`
 * roles and 50–950 scales; alpha kept as `oklch(l c h / a)` or `#rrggbbaa`), a `--color-cta-*`
 * fallback and the derived interaction colors (`STATE_COLOR_VARS`: hover fills, muted text on
 * primary), computed on opaque colors.
 */
export function colorCssVars(
  doc: DesignDoc,
  options: Pick<CompileThemeVarsOptions, "theme" | "mode" | "colorFormat">,
): Record<string, string> {
  const format = options.colorFormat ?? "oklch";
  const theme: Theme = options.theme ?? generateTheme(themeInputFor(doc));
  const vars = toCssVarRecord(theme, options.mode, { format });
  const own = doc.tokens.color[options.mode];
  for (const [name, color] of Object.entries(own)) {
    if (color) vars[`--${name}`] = tokenColorCss(color, format);
  }
  for (const [name, steps] of scaleOverrides(doc)) {
    for (const [step, hex] of Object.entries(steps)) vars[`--color-${name}-${step}`] = tokenColorCss(hex, format);
  }
  for (const step of SCALE_STEPS) vars[`--color-cta-${step}`] ??= `var(--color-brand-${step})`;
  const overrides = opaqueRoles(theme, options.mode, own);
  Object.assign(vars, stateColorVars(theme, options.mode, { format, overrides }));
  return vars;
}

/**
 * Every CSS variable of the user's theme contract for one mode: colors (`--background`, `--primary`,
 * `--color-brand-500`…), non-color (`--dl-font-*`, `--dl-fs-*`, `--dl-radius-*`, `--dl-space-*`,
 * `--dl-shadow-*`, `--dl-duration-*`…) and component tokens (`--dl-button-*`, `--dl-card-*`…).
 * The doc's stored values (`tokens.*`: imported or edited) win over the ones derived from the
 * palette, recipe, pairing and dials. Deterministic: same input, same keys in the same order, same values.
 */
export function compileThemeVars(doc: DesignDoc, options: CompileThemeVarsOptions): Record<string, string> {
  const resolved = { ...options, ...resolveThemeInputs(doc, options) };
  return { ...colorCssVars(doc, resolved), ...tokensToCssVars(resolveTokens(doc, resolved)) };
}
