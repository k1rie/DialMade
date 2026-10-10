import { DTCG_EXTENSION, ROLE_KEYS, cssVarName, toDTCG, type DtcgDocument, type RoleKey, type Theme } from "@dialmade/palette";
import type { DesignDoc } from "../schema";
import {
  FONT_SIZE_NAMES,
  RADIUS_NAMES,
  SHADOW_NAMES,
  hexToRgb,
  type DimensionRef,
  type ResolvedTokens,
  type ShadowLayer,
  type ShadowRef,
} from "../tokens";
import { resolveExport, splitFontStack, type ExportOptions } from "./shared";

export interface DtcgToken {
  $type: string;
  $value: unknown;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

export interface DtcgGroup {
  [name: string]: DtcgToken | DtcgGroup;
}

export interface DtcgFullDocument {
  $description: string;
  $extensions: Record<string, unknown>;
  primitives: DtcgDocument["primitives"];
  semantic: DtcgDocument["semantic"];
  font: DtcgGroup;
  "font-weight": DtcgGroup;
  typography: DtcgGroup;
  dimension: DtcgGroup;
  shadow: DtcgGroup;
  duration: DtcgGroup;
  "cubic-bezier": DtcgGroup;
  component: DtcgGroup;
}

const ROLE_BY_NAME = new Map<string, RoleKey>(ROLE_KEYS.map((key) => [cssVarName(key), key]));

/** The theme with the doc's per-mode color overrides applied to its roles. */
export function themeWithOverrides(doc: DesignDoc, theme: Theme): Theme {
  const apply = (roles: Theme["light"], overrides: Record<string, string | undefined>) => {
    const out = { ...roles };
    for (const [name, hex] of Object.entries(overrides)) {
      const key = ROLE_BY_NAME.get(name);
      if (key && hex) out[key] = hex.toLowerCase();
    }
    return out;
  };
  return { ...theme, light: apply(theme.light, doc.tokens.color.light), dark: apply(theme.dark, doc.tokens.color.dark) };
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const dim = (px: number) => ({ value: px, unit: "px" });
const dimension = (px: number, extensions?: Record<string, unknown>): DtcgToken => ({
  $type: "dimension",
  $value: dim(px),
  ...(extensions && { $extensions: extensions }),
});

const srgb = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex).map((v) => round(v / 255, 5)) as [number, number, number];
  return { colorSpace: "srgb", components: [r, g, b], alpha, hex };
};

const noShadow = () => [{ color: srgb("#000000", 0), offsetX: dim(0), offsetY: dim(0), blur: dim(0), spread: dim(0) }];

const shadowValue = (layers: readonly ShadowLayer[]) =>
  layers.length === 0
    ? noShadow()
    : layers.map((l) => ({ color: srgb(l.color, l.alpha), offsetX: dim(l.x), offsetY: dim(l.y), blur: dim(l.blur), spread: dim(l.spread) }));

/** `radius.md` → `{dimension.radius.md}`, `component.button.h-md` → `{component.button.height-md}`. */
function alias(ref: string): string {
  if (ref.startsWith("component.")) return `{${ref.replace(/\.h-(sm|md|lg)$/, ".height-$1")}}`;
  return `{dimension.${ref}}`;
}

const dimensionRef = (value: DimensionRef): DtcgToken => ({ $type: "dimension", $value: value.ref ? alias(value.ref) : dim(value.px) });
const shadowRef = (ref: ShadowRef): DtcgToken => ({ $type: "shadow", $value: ref === "none" ? noShadow() : `{shadow.${ref}}` });

function typographyGroup(t: ResolvedTokens): DtcgGroup {
  const group: DtcgGroup = {};
  for (const name of FONT_SIZE_NAMES) {
    const heading = name === "display" || name.startsWith("h");
    const size = t.fontSizes[name].px;
    group[name] = {
      $type: "typography",
      $value: {
        fontFamily: heading ? "{font.heading}" : "{font.body}",
        fontSize: `{dimension.font-size.${name}}`,
        fontWeight: heading ? "{font-weight.heading}" : "{font-weight.body}",
        letterSpacing: dim(heading ? round(t.heading.tracking * size, 2) : 0),
        lineHeight: heading ? t.lineHeights.tight : t.lineHeights.body,
      },
    };
  }
  group.button = {
    $type: "typography",
    $value: {
      fontFamily: "{font.body}",
      fontSize: "{dimension.font-size.body}",
      fontWeight: "{font-weight.button}",
      letterSpacing: dim(0),
      lineHeight: 1,
    },
  };
  return group;
}

/**
 * DTCG 2025.10 with the whole design: color (`primitives`, `semantic` with light/dark modes, from
 * @dialmade/palette plus the doc's overrides), `font`, `font-weight`, `typography`, `dimension`
 * (font sizes, radius, space, layout), `shadow`, `duration`, `cubic-bezier` and `component.*`, whose
 * tokens alias the global ones (`{dimension.radius.md}`). Mode-dependent shadows keep both modes in
 * `$extensions["design.dialmade"].modes`, like the semantic colors.
 */
export function toDTCGFull(doc: DesignDoc, options: ExportOptions = {}): DtcgFullDocument {
  const { inputs, light, dark } = resolveExport(doc, options);
  const color = toDTCG(themeWithOverrides(doc, inputs.theme));
  const t = light;

  const fontSize: DtcgGroup = {};
  for (const name of FONT_SIZE_NAMES) {
    const size = t.fontSizes[name];
    fontSize[name] = dimension(size.px, size.minPx < size.px ? { [DTCG_EXTENSION]: { fluid: { min: dim(size.minPx), max: dim(size.px) } } } : undefined);
  }
  const radius: DtcgGroup = {};
  for (const name of RADIUS_NAMES) radius[name] = dimension(t.radius[name]);
  const space: DtcgGroup = {};
  t.space.forEach((px, i) => (space[String(i + 1)] = dimension(px)));

  const shadow: DtcgGroup = {};
  for (const name of SHADOW_NAMES) {
    shadow[name] = {
      $type: "shadow",
      $value: shadowValue(light.shadows[name]),
      $extensions: { [DTCG_EXTENSION]: { modes: { light: shadowValue(light.shadows[name]), dark: shadowValue(dark.shadows[name]) } } },
    };
  }

  const { button, card, input, badge, nav, table, sidebar } = t.components;
  const component: DtcgGroup = {
    button: {
      radius: dimensionRef(button.radius),
      "height-sm": dimension(button.hSm),
      "height-md": dimension(button.hMd),
      "height-lg": dimension(button.hLg),
      "padding-x": dimensionRef(button.px),
      "font-weight": { $type: "fontWeight", $value: "{font-weight.button}" },
      shadow: shadowRef(button.shadow),
    },
    card: {
      radius: dimensionRef(card.radius),
      padding: dimensionRef(card.padding),
      shadow: shadowRef(card.shadow),
      border: {
        $type: "border",
        $value: card.border
          ? { color: `{semantic.${card.border.color}}`, width: "{dimension.border-width}", style: "solid" }
          : { color: "{semantic.border}", width: dim(0), style: "solid" },
      },
    },
    input: { radius: dimensionRef(input.radius), height: dimensionRef(input.h) },
    badge: { radius: dimensionRef(badge.radius) },
    nav: { height: dimension(nav.h) },
    table: { "row-height": dimension(table.rowH) },
    sidebar: { width: dimension(sidebar.w) },
  };

  const motion: DtcgGroup = {};
  if (t.motion.bezier) motion.ease = { $type: "cubicBezier", $value: t.motion.bezier };

  return {
    $description: `${doc.brand.name} · Dialmade design tokens (DesignDoc v${doc.version})`,
    $extensions: {
      [DTCG_EXTENSION]: {
        ...(color.$extensions[DTCG_EXTENSION] as Record<string, unknown>),
        docVersion: doc.version,
        name: doc.brand.name,
        productType: doc.brief.productType,
        focus: doc.brief.focus,
        recipeId: inputs.recipe.id,
        pairingId: inputs.pairing.id,
        motionTier: inputs.motionTier.id,
        dials: t.dials,
        googleFontsUrl: inputs.pairing.googleFontsUrl,
      },
    },
    primitives: color.primitives,
    semantic: color.semantic,
    font: {
      heading: { $type: "fontFamily", $value: splitFontStack(t.fonts.heading.stack) },
      body: { $type: "fontFamily", $value: splitFontStack(t.fonts.body.stack) },
      mono: { $type: "fontFamily", $value: splitFontStack(t.fonts.mono.stack) },
    },
    "font-weight": {
      heading: { $type: "fontWeight", $value: t.heading.weight },
      body: { $type: "fontWeight", $value: t.bodyWeight },
      button: { $type: "fontWeight", $value: button.weight },
    },
    typography: typographyGroup(t),
    dimension: {
      "font-size": fontSize,
      radius,
      space,
      "border-width": dimension(t.borderWidth),
      "section-py": dimension(t.layout.sectionPy),
      container: dimension(t.layout.container),
    },
    shadow,
    duration: {
      fast: { $type: "duration", $value: { value: t.motion.fast, unit: "ms" } },
      base: { $type: "duration", $value: { value: t.motion.base, unit: "ms" } },
      slow: { $type: "duration", $value: { value: t.motion.slow, unit: "ms" } },
    },
    "cubic-bezier": motion,
    component,
  };
}
