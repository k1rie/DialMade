import { formatOklch, hexToRgb, oklchComponents, splitAlpha } from "./color";
import type { ScaleStep } from "./scale";
import type { ColorMode } from "./styles";
import type { RoleKey, Theme, ThemeRoles } from "./theme";

/** Role order used by every exporter (shadcn's order first, then Dialmade's extras). */
export const ROLE_KEYS: RoleKey[] = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "border",
  "input",
  "ring",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "brand",
  "cta",
  "ctaForeground",
  "primaryText",
  "borderStrong",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
];

const SIDEBAR_ALIASES: [string, RoleKey][] = [
  ["sidebar", "card"],
  ["sidebar-foreground", "cardForeground"],
  ["sidebar-primary", "primary"],
  ["sidebar-primary-foreground", "primaryForeground"],
  ["sidebar-accent", "accent"],
  ["sidebar-accent-foreground", "accentForeground"],
  ["sidebar-border", "border"],
  ["sidebar-ring", "ring"],
];

/** `primaryForeground` → `primary-foreground`, `chart1` → `chart-1`. */
export function cssVarName(key: RoleKey): string {
  return key.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();
}

/**
 * Scale groups in export order. `Theme.scales.accent` is exported as `cta`, because in shadcn
 * `accent` is the hover surface, not the call-to-action color.
 */
export function scaleGroups(theme: Theme): [string, ScaleStep[]][] {
  const { brand, accent, neutral, success, warning, error, info } = theme.scales;
  return [
    ["brand", brand],
    ...(accent ? ([["cta", accent]] as [string, ScaleStep[]][]) : []),
    ["neutral", neutral],
    ["success", success],
    ["warning", warning],
    ["error", error],
    ["info", info],
  ];
}

export type CssColorFormat = "oklch" | "hex";

/** `oklch(L C H)` or hex; a translucent role gives `oklch(L C H / a)` or `#rrggbbaa`. */
const cssValue = (hex: string, format: CssColorFormat) => (format === "hex" ? hex : formatOklch(hex));

/** Scales that become Tailwind utilities (`bg-brand-500`, `text-cta-700`). */
const utilityScales = (theme: Theme) => scaleGroups(theme).filter(([name]) => name === "brand" || name === "cta");

/**
 * shadcn-compatible variables: `:root` (light) and `.dark`, with Dialmade's extras
 * (`--brand`, `--cta`, `--cta-foreground`, `--primary-text`, `--border-strong`, status colors),
 * sidebar aliases and the `--color-brand-50..950` (and `--color-cta-*`) scales.
 */
export function toCssVars(theme: Theme, options: { format?: CssColorFormat } = {}): string {
  const format = options.format ?? "oklch";
  const block = (selector: string, roles: ThemeRoles, extra: string[]) =>
    [
      `${selector} {`,
      ...ROLE_KEYS.map((key) => `  --${cssVarName(key)}: ${cssValue(roles[key], format)};`),
      ...SIDEBAR_ALIASES.map(([name, key]) => `  --${name}: var(--${cssVarName(key)});`),
      ...extra,
      "}",
    ].join("\n");
  const scales = utilityScales(theme).flatMap(([name, steps]) =>
    steps.map((s) => `  --color-${name}-${s.step}: ${cssValue(s.hex, format)};`),
  );
  return `${block(":root", theme.light, scales)}\n\n${block(".dark", theme.dark, [])}\n`;
}

/**
 * The same variables as `toCssVars` for one mode, as a record (`{ "--primary": "oklch(…)" }`) ready for
 * `style={…}` or `setProperty`. Includes the sidebar aliases and every scale (`--color-brand-*`,
 * `--color-cta-*` when there is an accent, `--color-neutral-*`, `--color-success-*`…), which are
 * the same in both modes.
 */
export function toCssVarRecord(
  theme: Theme,
  mode: ColorMode,
  options: { format?: CssColorFormat } = {},
): Record<string, string> {
  const format = options.format ?? "oklch";
  const roles = mode === "light" ? theme.light : theme.dark;
  const record: Record<string, string> = {};
  for (const key of ROLE_KEYS) record[`--${cssVarName(key)}`] = cssValue(roles[key], format);
  for (const [name, key] of SIDEBAR_ALIASES) record[`--${name}`] = `var(--${cssVarName(key)})`;
  for (const [name, steps] of scaleGroups(theme)) {
    for (const s of steps) record[`--color-${name}-${s.step}`] = cssValue(s.hex, format);
  }
  return record;
}

/** Tailwind v4 `@theme inline` block mapping every role to a utility color, plus raw brand scales. */
export function toTailwindTheme(theme: Theme): string {
  const lines = [
    ...ROLE_KEYS.map((key) => `  --color-${cssVarName(key)}: var(--${cssVarName(key)});`),
    ...SIDEBAR_ALIASES.map(([name]) => `  --color-${name}: var(--${name});`),
    ...utilityScales(theme).flatMap(([name, steps]) =>
      steps.map((s) => `  --color-${name}-${s.step}: ${formatOklch(s.hex)};`),
    ),
  ];
  return `@theme inline {\n${lines.join("\n")}\n}\n`;
}

/** A complete `globals.css` for a Tailwind v4 + shadcn project. */
export function toGlobalsCss(theme: Theme): string {
  return [
    '@import "tailwindcss";',
    "",
    "@custom-variant dark (&:is(.dark *));",
    "",
    toCssVars(theme).trimEnd(),
    "",
    toTailwindTheme(theme).trimEnd(),
    "",
    "@layer base {",
    "  * {",
    "    @apply border-border outline-ring/50;",
    "  }",
    "  body {",
    "    @apply bg-background text-foreground;",
    "  }",
    "}",
    "",
  ].join("\n");
}

export const DTCG_EXTENSION = "design.dialmade";

/** `alpha` only appears on translucent colors (DTCG's default is 1); `hex` is always the opaque `#rrggbb`. */
export type DtcgOklchValue = { colorSpace: "oklch"; components: [number, number, number]; alpha?: number; hex: string };
export type DtcgSrgbValue = { colorSpace: "srgb"; components: [number, number, number]; alpha: number; hex: string };
export type DtcgColorToken<V> = { $type: "color"; $value: V; $extensions?: Record<string, unknown> };
type TokenGroup<V> = Record<string, DtcgColorToken<V>>;

export type DtcgDocument = {
  $description: string;
  $extensions: Record<string, unknown>;
  primitives: Record<string, TokenGroup<DtcgOklchValue>>;
  semantic: TokenGroup<DtcgOklchValue>;
};

export type FigmaTokensDocument = { color: TokenGroup<DtcgSrgbValue> };

const oklchValue = (color: string): DtcgOklchValue => {
  const { hex, alpha } = splitAlpha(color);
  const components = oklchComponents(hex);
  return alpha < 1 ? { colorSpace: "oklch", components, alpha, hex } : { colorSpace: "oklch", components, hex };
};

const srgbValue = (color: string): DtcgSrgbValue => {
  const { hex, alpha } = splitAlpha(color);
  const [r, g, b] = hexToRgb(hex).map((v) => Number((v / 255).toFixed(5))) as [number, number, number];
  return { colorSpace: "srgb", components: [r, g, b], alpha, hex };
};

/**
 * DTCG 2025.10 tokens. Colors use `{ colorSpace: 'oklch', components, hex }`, plus `alpha` when a
 * pinned role is translucent.
 * Modes: one document. Each semantic token's `$value` is its light value, and both modes live in
 * `$extensions["design.dialmade"].modes`. Tools that need one file per mode (Figma) use
 * `toFigmaTokens(theme, mode)`.
 */
export function toDTCG(theme: Theme): DtcgDocument {
  const primitives = Object.fromEntries(
    scaleGroups(theme).map(([name, steps]) => [
      name,
      Object.fromEntries(steps.map((s) => [String(s.step), { $type: "color", $value: oklchValue(s.hex) }])),
    ]),
  ) as DtcgDocument["primitives"];

  const semantic: DtcgDocument["semantic"] = Object.fromEntries(
    ROLE_KEYS.map((key) => [
      cssVarName(key),
      {
        $type: "color",
        $value: oklchValue(theme.light[key]),
        $extensions: {
          [DTCG_EXTENSION]: { modes: { light: oklchValue(theme.light[key]), dark: oklchValue(theme.dark[key]) } },
        },
      },
    ]),
  );

  return {
    $description: `Dialmade palette · ${theme.styleId}`,
    $extensions: {
      [DTCG_EXTENSION]: {
        styleId: theme.styleId,
        seeds: theme.seeds,
        achromatic: theme.achromatic,
        modes: ["light", "dark"],
        defaultMode: theme.defaultMode,
      },
    },
    primitives,
    semantic,
  };
}

/**
 * One DTCG file per mode for Figma's native Variables import: sRGB only (components 0..1), the real
 * `alpha` and the opaque hex.
 * Tokens sit under `color`, so they import as `color/primary`, `color/brand-500`… matching
 * Tailwind's `--color-primary` / `--color-brand-500`.
 */
export function toFigmaTokens(theme: Theme, mode: ColorMode): FigmaTokensDocument {
  const roles = mode === "light" ? theme.light : theme.dark;
  const color: TokenGroup<DtcgSrgbValue> = {};
  for (const key of ROLE_KEYS) color[cssVarName(key)] = { $type: "color", $value: srgbValue(roles[key]) };
  for (const [name, steps] of scaleGroups(theme)) {
    for (const s of steps) color[`${name}-${s.step}`] = { $type: "color", $value: srgbValue(s.hex) };
  }
  return { color };
}
