const range = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);

/** Variables de color que genera `@dialmade/palette` (`toCssVars`) más las derivadas de `@dialmade/doc`. */
export const COLOR_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  ...range("--chart-", 1, 5),
  "--brand",
  "--cta",
  "--cta-foreground",
  "--primary-text",
  "--border-strong",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--info",
  "--info-foreground",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  // Derivados que añade `@dialmade/doc` (`STATE_COLOR_VARS`): rellenos de hover y texto secundario sobre el primario.
  "--primary-hover",
  "--primary-foreground-hover",
  "--primary-foreground-muted",
  "--secondary-hover",
  "--cta-hover",
  "--destructive-hover",
] as const;

/** Tokens no-color que genera `@dialmade/doc` (`compileThemeVars`). */
export const TOKEN_VARS = [
  "--dl-font-heading",
  "--dl-font-body",
  "--dl-font-mono",
  "--dl-fs-display",
  "--dl-fs-h1",
  "--dl-fs-h2",
  "--dl-fs-h3",
  "--dl-fs-body",
  "--dl-fs-small",
  "--dl-fs-caption",
  "--dl-lh-tight",
  "--dl-lh-body",
  "--dl-heading-weight",
  "--dl-heading-tracking",
  "--dl-radius-sm",
  "--dl-radius-md",
  "--dl-radius-lg",
  "--dl-radius-xl",
  "--dl-radius-full",
  ...range("--dl-space-", 1, 10),
  "--dl-section-py",
  "--dl-container",
  "--dl-shadow-sm",
  "--dl-shadow-md",
  "--dl-shadow-lg",
  "--dl-border-width",
  "--dl-duration-fast",
  "--dl-duration-base",
  "--dl-duration-slow",
  "--dl-ease",
] as const;

/** Tokens de componente que salen de `system` (recetas). */
export const COMPONENT_VARS = [
  "--dl-button-radius",
  "--dl-button-h-sm",
  "--dl-button-h-md",
  "--dl-button-h-lg",
  "--dl-button-px",
  "--dl-button-weight",
  "--dl-button-shadow",
  "--dl-card-radius",
  "--dl-card-padding",
  "--dl-card-shadow",
  "--dl-card-border",
  "--dl-input-radius",
  "--dl-input-h",
  "--dl-badge-radius",
  "--dl-nav-h",
  "--dl-table-row-h",
  "--dl-sidebar-w",
] as const;

export const THEME_CONTRACT_VARS: readonly string[] = [...COLOR_VARS, ...TOKEN_VARS, ...COMPONENT_VARS];

/** Escalas `--color-<grupo>-<paso>` de `@dialmade/palette`. */
export const SCALE_VAR_PATTERN = /^--color-(brand|cta|neutral|success|warning|error|info)-(50|[1-9]00|950)$/;

export function isThemeContractVar(name: string): boolean {
  return THEME_CONTRACT_VARS.includes(name) || SCALE_VAR_PATTERN.test(name);
}
