import {
  DTCG_EXTENSION,
  ROLE_KEYS,
  cssVarName,
  formatOklch,
  toDTCG,
  type DtcgDocument,
  type RoleKey,
  type ScaleStep,
  type ScaleStepNumber,
  type Theme,
} from "@dialmade/palette";
import { normalizeTokenColor } from "../color";
import { isLocked } from "../locks";
import { pointersOverlap } from "../pointer";
import type { Confidence, DesignDoc } from "../schema";
import {
  FONT_SIZE_NAMES,
  RADIUS_NAMES,
  SHADOW_NAMES,
  fontsUrlFor,
  hexToRgb,
  scaleOverrides,
  type DimensionRef,
  type ResolvedTokens,
  type ShadowLayer,
  type ShadowRef,
} from "../tokens";
import { recipeIds, resolveExport, splitFontStack, type ExportOptions } from "./shared";

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

/**
 * The theme with the doc's colors applied: per-mode roles (alpha kept as `#rrggbbaa`, which the
 * @dialmade/palette exporters understand) and the 50–950 scales of `tokens.color.scales`.
 */
export function themeWithOverrides(doc: DesignDoc, theme: Theme): Theme {
  const apply = (roles: Theme["light"], overrides: Record<string, string | undefined>) => {
    const out = { ...roles };
    for (const [name, color] of Object.entries(overrides)) {
      const key = ROLE_BY_NAME.get(name);
      if (key && color) out[key] = normalizeTokenColor(color);
    }
    return out;
  };
  const scales = { ...theme.scales };
  for (const [name, steps] of scaleOverrides(doc)) {
    const key = name === "cta" ? "accent" : "brand";
    const byStep = new Map<number, ScaleStep>((scales[key] ?? []).map((s) => [s.step, s]));
    for (const [step, hex] of Object.entries(steps)) {
      byStep.set(Number(step), { step: Number(step) as ScaleStepNumber, hex, oklch: formatOklch(hex) });
    }
    scales[key] = [...byStep.values()].sort((a, b) => a.step - b.step);
  }
  return { ...theme, light: apply(theme.light, doc.tokens.color.light), dark: apply(theme.dark, doc.tokens.color.dark), scales };
}

/** Where an exported token's value came from (`provenance.imports[].fields` that touch its pointer). */
export interface DtcgProvenance {
  sourceId: string;
  fileName: string;
  format: string;
  locator: string;
  confidence: Confidence;
  method: string;
  /** Semantic colors only: the mode of the value. */
  mode?: "light" | "dark";
}

function provenanceAt(doc: DesignDoc, pointer: string, mode?: "light" | "dark"): DtcgProvenance[] {
  const out: DtcgProvenance[] = [];
  for (const record of doc.provenance.imports ?? []) {
    for (const field of record.fields) {
      if (!pointersOverlap(field.path, pointer)) continue;
      const { sourceId, fileName, format } = record;
      out.push({ sourceId, fileName, format, locator: field.locator, confidence: field.confidence, method: field.method, ...(mode && { mode }) });
    }
  }
  return out;
}

type Annotated = { $extensions?: Record<string, unknown> };

function annotate(token: Annotated | undefined, meta: Record<string, unknown>): void {
  if (!token || Object.keys(meta).length === 0) return;
  const current = (token.$extensions?.[DTCG_EXTENSION] as Record<string, unknown> | undefined) ?? {};
  token.$extensions = { ...token.$extensions, [DTCG_EXTENSION]: { ...current, ...meta } };
}

/** `{ locked: true }` and the token's provenance, for a token that stands for one doc pointer. */
function pointerMeta(doc: DesignDoc, pointer: string): Record<string, unknown> {
  const provenance = provenanceAt(doc, pointer);
  return { ...(isLocked(doc, pointer) && { locked: true }), ...(provenance.length > 0 && { provenance }) };
}

/** Semantic colors: `locked` lists the locked modes; provenance entries carry their mode. */
function colorMeta(doc: DesignDoc, name: string): Record<string, unknown> {
  const modes = (["light", "dark"] as const).filter((mode) => isLocked(doc, `/tokens/color/${mode}/${name}`));
  const provenance = (["light", "dark"] as const).flatMap((mode) => provenanceAt(doc, `/tokens/color/${mode}/${name}`, mode));
  return { ...(modes.length > 0 && { locked: modes }), ...(provenance.length > 0 && { provenance }) };
}

const asToken = (node: DtcgToken | DtcgGroup | undefined): DtcgToken | undefined =>
  node && "$value" in node ? (node as DtcgToken) : undefined;

/**
 * Adds `$extensions["design.dialmade"]` `locked` and `provenance` to the tokens that come from the
 * doc's stored values (`tokens.*`): colors, scales, fonts, type steps, sizes, radii, space, border
 * width, shadows and motion.
 */
function annotateTokens(doc: DesignDoc, out: DtcgFullDocument): void {
  for (const name of Object.keys(out.semantic)) annotate(out.semantic[name], colorMeta(doc, name));
  for (const [group, scale] of [["brand", "brand"], ["cta", "accent"]] as const) {
    for (const [step, token] of Object.entries(out.primitives[group] ?? {})) {
      annotate(token, pointerMeta(doc, `/tokens/color/scales/${scale}/${step}`));
    }
  }
  for (const role of ["heading", "body", "mono"] as const) annotate(asToken(out.font[role]), pointerMeta(doc, `/tokens/typography/${role}`));
  const dimension = out.dimension as Record<string, DtcgGroup>;
  for (const name of FONT_SIZE_NAMES) {
    annotate(asToken(out.typography[name]), pointerMeta(doc, `/tokens/typography/scale/${name}`));
    annotate(asToken(dimension["font-size"]?.[name]), pointerMeta(doc, `/tokens/fontSize/${name}`));
  }
  for (const name of RADIUS_NAMES) if (name !== "full") annotate(asToken(dimension.radius?.[name]), pointerMeta(doc, `/tokens/radius/${name}`));
  for (const step of Object.keys(dimension.space ?? {})) annotate(asToken(dimension.space?.[step]), pointerMeta(doc, `/tokens/space/${step}`));
  annotate(asToken(out.dimension["border-width"]), pointerMeta(doc, "/tokens/borderWidth"));
  for (const name of SHADOW_NAMES) annotate(asToken(out.shadow[name]), pointerMeta(doc, `/tokens/elevation/${name}`));
  for (const name of ["fast", "base", "slow"] as const) annotate(asToken(out.duration[name]), pointerMeta(doc, `/tokens/motion/${name}`));
  annotate(asToken(out["cubic-bezier"].ease), pointerMeta(doc, "/tokens/motion/ease"));
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

function typographyGroup(doc: DesignDoc, t: ResolvedTokens): DtcgGroup {
  const group: DtcgGroup = {};
  for (const name of FONT_SIZE_NAMES) {
    const heading = name === "display" || name.startsWith("h");
    const size = t.fontSizes[name].px;
    const own = doc.tokens.typography.scale[name];
    const tracking = own?.letterSpacing ?? (heading ? t.heading.tracking : 0);
    group[name] = {
      $type: "typography",
      $value: {
        fontFamily: heading ? "{font.heading}" : "{font.body}",
        fontSize: `{dimension.font-size.${name}}`,
        fontWeight: own?.weight ?? (heading ? "{font-weight.heading}" : "{font-weight.body}"),
        letterSpacing: dim(round(tracking * size, 2)),
        lineHeight: own?.lineHeight ?? (heading ? t.lineHeights.tight : t.lineHeights.body),
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
 *
 * Stored values carry `$extensions["design.dialmade"]` `locked` (`true`, or the locked modes of a
 * semantic color) and `provenance` (file, locator, confidence, method). The root extension lists
 * `locks` and the `imports` (file name, format, SHA-256, parser, ownership; never the file).
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

  const fontsUrl = fontsUrlFor(doc, inputs.pairing);
  const imports = (doc.provenance.imports ?? []).map(({ fields: _fields, dismissed: _dismissed, ...record }) => record);
  const out: DtcgFullDocument = {
    $description: `${doc.brand.name} · Dialmade design tokens (DesignDoc v${doc.version})`,
    $extensions: {
      [DTCG_EXTENSION]: {
        ...(color.$extensions[DTCG_EXTENSION] as Record<string, unknown>),
        docVersion: doc.version,
        name: doc.brand.name,
        productType: doc.brief.productType,
        focus: doc.brief.focus,
        ...recipeIds(inputs.recipe),
        pairingId: inputs.pairing.id,
        motionTier: inputs.motionTier.id,
        dials: t.dials,
        ...(fontsUrl && { googleFontsUrl: fontsUrl }),
        ...(doc.brief.locks.length > 0 && { locks: doc.brief.locks }),
        ...(imports.length > 0 && { imports }),
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
    typography: typographyGroup(doc, t),
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
  annotateTokens(doc, out);
  return out;
}
