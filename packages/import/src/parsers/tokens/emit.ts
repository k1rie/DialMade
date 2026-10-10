import { normalizeColor } from "../../color";
import { worseConfidence } from "../../merge";
import { detectVocabulary, mapRoleName, normalizeTokenName, parseScaleName, type RoleMatch } from "../../roles";
import { cleanText, isJsonObject, nullRecord, own, type JsonValue } from "../../sanitize";
import type { Confidence, FontCandidate, FontRole, Mode, ParsedColor, ParsedDim, ParseOutput, ProvInput, Shadow, TypeStyle } from "../../types";
import type { TokenNode } from "./tree";
import { colorToCss, dimOf, firstFamily, fontStackOf, fontWeightOf, letterSpacingOf, lineHeightOf, shadowLayersOf, typographyOf } from "./values";

/** One resolved value of a token in one scenario (mode, or an alternative context of a modifier). */
export interface Observation {
  node: TokenNode;
  /** Resolved (no references left). */
  value: JsonValue;
  /** Declared, inherited or taken from the alias target. */
  type?: string;
  mode?: Mode;
  /** `brand=night`: an alternative the user may pick instead of the default context. */
  alt?: string;
  /** From a Tokens Studio «source» set: no role colors (those come from the enabled sets). */
  reference?: boolean;
}

type Kind =
  | "color"
  | "radius"
  | "space"
  | "border-width"
  | "font-size"
  | "font-family"
  | "font-weight"
  | "line-height"
  | "letter-spacing"
  | "shadow"
  | "typography"
  | "ignore";

export type Emitted = Pick<ParseOutput, "colors" | "fonts" | "shape" | "spacing" | "typeScale"> & { warnings: { code: string; detail?: string }[] };

/** Leading groups that only organize a file (`primitives.brand.500` is the `brand` scale). */
const CONTAINERS = new Set([
  "primitives",
  "primitive",
  "core",
  "ref",
  "reference",
  "references",
  "global",
  "globals",
  "alias",
  "aliases",
  "semantic",
  "semantics",
  "sys",
  "system",
  "tokens",
  "token",
  "foundation",
  "foundations",
  "theme",
  "themes",
  "palette",
  "color",
  "colors",
  "colour",
  "colours",
  "dimension",
  "dimensions",
]);
const COMPONENT_WORDS = new Set(["component", "components", "comp", "comps"]);

const TYPE_KINDS: Readonly<Record<string, Kind>> = {
  color: "color",
  borderradius: "radius",
  radius: "radius",
  spacing: "space",
  space: "space",
  borderwidth: "border-width",
  fontsize: "font-size",
  fontsizes: "font-size",
  fontfamily: "font-family",
  fontfamilies: "font-family",
  fontweight: "font-weight",
  fontweights: "font-weight",
  lineheight: "line-height",
  lineheights: "line-height",
  letterspacing: "letter-spacing",
  shadow: "shadow",
  boxshadow: "shadow",
  typography: "typography",
};
/** Types that say nothing about the role: the path and the value decide. */
const PATH_TYPES = new Set(["", "dimension", "dimensions", "sizing", "size", "number", "float", "other", "string"]);

const FIGMA_SCOPES: Readonly<Record<string, Kind>> = {
  CORNER_RADIUS: "radius",
  GAP: "space",
  FONT_SIZE: "font-size",
  FONT_WEIGHT: "font-weight",
  STROKE_FLOAT: "border-width",
  LINE_HEIGHT: "line-height",
  LETTER_SPACING: "letter-spacing",
  FONT_FAMILY: "font-family",
};

/** Words that end the «kind» part of a path; what follows is the key (`radius.md` → `md`). */
const ANCHORS: Readonly<Partial<Record<Kind, readonly string[]>>> = {
  radius: ["radius", "radii", "rounded", "corner", "corners"],
  space: ["space", "spacing", "spacer", "spacers", "gap"],
  "border-width": ["width", "widths", "borderwidth"],
  "font-size": ["size", "sizes", "fontsize", "fontsizes", "font"],
  "line-height": ["height", "heights", "leading"],
  "letter-spacing": ["spacing", "tracking"],
  "font-weight": ["weight", "weights"],
  "font-family": ["family", "families", "typeface", "font", "fonts"],
  shadow: ["shadow", "shadows", "elevation", "elevations"],
  typography: ["typography", "style", "styles", "textstyle", "textstyles"],
};

const HEADING = new Set(["heading", "headings", "display", "title", "titles", "headline", "headlines", "header", "h1", "h2", "h3", "h4", "h5", "h6", "hero"]);
const BODY = new Set(["body", "text", "base", "sans", "default", "primary", "ui", "copy", "paragraph", "interface", "regular", "content"]);
const MONO = new Set(["mono", "monospace", "code"]);
const EXACT_ROLE_WORDS = new Set(["heading", "body", "mono"]);

const NAMED_SPACE = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
const SIZE_ALIASES: Readonly<Record<string, string>> = {
  xxxs: "3xs",
  xxs: "2xs",
  "xx-small": "2xs",
  "x-small": "xs",
  xsmall: "xs",
  "extra-small": "xs",
  small: "sm",
  medium: "md",
  large: "lg",
  "x-large": "xl",
  xlarge: "xl",
  "extra-large": "xl",
  xxl: "2xl",
  "xx-large": "2xl",
  xxlarge: "2xl",
  xxxl: "3xl",
};
const BASE_KEYS = new Set(["", "base", "default", "unit"]);
const BORDER_PREFERENCE = ["default", "base", "md", "1", "thin", "sm", "hairline"];
const MAX_WARNINGS = 50;

const words = (segments: readonly string[]): string[] =>
  segments.flatMap((s) =>
    s
      .slice(0, 128)
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .split(/[\s_./\\-]+/)
      .filter(Boolean),
  );

const pathOf = (node: TokenNode) => node.path.filter((s) => s !== "$root");

/** The path without organizing groups, for role and scale names. */
function strippedPath(node: TokenNode): string[] {
  const path = pathOf(node);
  let i = 0;
  for (;;) {
    const segment = path[i]?.toLowerCase() ?? "";
    if (i < path.length - 1 && CONTAINERS.has(segment)) i++;
    else if (i < path.length - 2 && segment === "base") i++;
    else break;
  }
  return path.slice(i);
}

const normalizeType = (type: string | undefined) => (type ?? "").toLowerCase().replace(/[^a-z]/g, "");

const isColorValue = (value: JsonValue): boolean => {
  if (typeof value === "number" || typeof value === "boolean" || value === null) return false;
  const css = colorToCss(value);
  return css !== null && normalizeColor(css).ok;
};

function figmaScopes(node: TokenNode): string[] {
  const scopes = node.extensions ? own(node.extensions, "com.figma.scopes") : undefined;
  return Array.isArray(scopes) ? scopes.filter((s): s is string => typeof s === "string") : [];
}

function kindOf(o: Observation, w: readonly string[]): Kind {
  const t = normalizeType(o.type);
  const component = COMPONENT_WORDS.has(w[0] ?? "");
  const typed = TYPE_KINDS[t];
  if (typed) return component && typed !== "color" ? "ignore" : typed;
  if (!PATH_TYPES.has(t)) return "ignore";
  if (component) return t === "" && isColorValue(o.value) ? "color" : "ignore";
  for (const scope of figmaScopes(o.node)) {
    const kind = FIGMA_SCOPES[scope];
    if (kind) return kind;
  }
  const flat = `-${w.join("-")}-`;
  const has = (...parts: string[]) => parts.some((p) => flat.includes(`-${p}-`));
  if (has("radius", "radii", "rounded", "corner", "corners")) return "radius";
  if (has("border-width", "stroke-width", "borderwidth")) return "border-width";
  if (has("font-size", "font-sizes", "text-size", "type-size", "fontsize", "size-font")) return "font-size";
  if (has("line-height", "line-heights", "leading")) return "line-height";
  if (has("letter-spacing", "tracking")) return "letter-spacing";
  if (has("font-weight", "font-weights", "weight", "weights")) return "font-weight";
  if (has("font-family", "font-families", "family", "families", "typeface")) return "font-family";
  if (has("shadow", "shadows", "elevation", "box-shadow")) return "shadow";
  if (has("typography", "text-style", "text-styles", "type-style")) return "typography";
  if (has("space", "spacing", "spacer", "spacers", "gap")) return "space";
  if (has("font", "fonts") && fontStackOf(o.value) && !dimOf(o.value) && fontWeightOf(o.value) === null) return "font-family";
  if (t === "" && isColorValue(o.value)) return "color";
  return "ignore";
}

/** The part of the path after the kind's anchor word (`dimension.radius.md` → `md`); `""` = base. */
function keyAfter(node: TokenNode, kind: Kind): string {
  const path = pathOf(node);
  const last = path[path.length - 1] ?? "";
  const w = words(path);
  const anchors = ANCHORS[kind] ?? [];
  let index = -1;
  for (let i = w.length - 1; i >= 0; i--) {
    if (anchors.includes(w[i]!)) {
      index = i;
      break;
    }
  }
  if (/^\d{1,4}(?:\.\d{1,3})?$/.test(last) && (index < 0 || index < w.length - 1)) return last;
  if (index < 0) return words([last]).join("-");
  return w.slice(index + 1).join("-");
}

const sizeKey = (key: string) => SIZE_ALIASES[key] ?? key;

function radiusKey(key: string): string {
  if (BASE_KEYS.has(key)) return "";
  if (["pill", "round", "circle", "max", "rounded-full"].includes(key)) return "full";
  return sizeKey(key);
}

function spaceKey(key: string): string | null {
  if (BASE_KEYS.has(key)) return "";
  if (/^\d{1,4}(?:\.\d{1,3})?$/.test(key)) return key;
  const k = sizeKey(key);
  return /^(?:[2-9]?xs|sm|md|lg|[2-9]?xl)$/.test(k) ? k : null;
}

function shadowName(key: string, elevation: boolean): string {
  if (BASE_KEYS.has(key)) return "DEFAULT";
  if (elevation && /^[1-5]$/.test(key)) return ["sm", "md", "lg", "xl", "2xl"][Number(key) - 1]!;
  return sizeKey(key);
}

function fontRoleOf(key: string): { role: FontRole; exact: boolean } | null {
  const parts = key.split("-").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]!;
    const exact = EXACT_ROLE_WORDS.has(p);
    if (MONO.has(p)) return { role: "mono", exact };
    if (HEADING.has(p)) return { role: "heading", exact };
    if (BODY.has(p)) return { role: "body", exact };
  }
  return null;
}

const locatorOf = (o: Observation) => cleanText(`${o.node.locator ?? `${o.node.doc.name} ${o.node.pointer}`}${o.alt ? ` [${o.alt}]` : ""}`, 200);

/** The observation that stands for a token when the value is not per mode (default context, light first). */
function primary(list: readonly Observation[]): Observation {
  return list.find((o) => !o.alt && o.mode !== "dark") ?? list.find((o) => !o.alt) ?? list[0]!;
}

/** Figma's code syntax (`var(--primary)`) names the CSS variable a designer meant. */
function codeSyntaxRole(node: TokenNode): RoleMatch | null {
  const syntax = node.extensions ? own(node.extensions, "com.figma.codeSyntax") : undefined;
  const web = isJsonObject(syntax) ? own(syntax, "WEB") : undefined;
  if (typeof web !== "string" || web.length > 128) return null;
  const name = web.replace(/^var\(\s*/, "").replace(/\s*\)$/, "");
  const match = mapRoleName(name);
  return match && { ...match, confidence: worseConfidence(match.confidence, "high") };
}

/**
 * Observations → what the core reads. Colors: one per mode for roles, first (the core folds a near
 * color into the earlier one, and a declared role must keep its exact value); then scale and loose
 * colors once, plus the dark value when it differs; then the alternatives of other modifier contexts
 * with lower confidence, so the default wins and the rest stay offered. Shape, spacing, type and
 * fonts come from the default context.
 */
export function emitTokens(observations: readonly Observation[]): Emitted {
  const warnings: Emitted["warnings"] = [];
  const warn = (code: string, detail: string) => {
    if (warnings.length < MAX_WARNINGS) warnings.push({ code, detail: cleanText(detail, 120) });
  };

  const byKey = new Map<string, { kind: Kind; list: Observation[] }>();
  for (const o of observations) {
    const entry = byKey.get(o.node.key);
    if (entry) entry.list.push(o);
    else byKey.set(o.node.key, { kind: kindOf(o, words(pathOf(o.node))), list: [o] });
  }

  const colorNames: string[] = [];
  for (const [, { kind, list }] of byKey) if (kind === "color") colorNames.push(strippedPath(list[0]!.node).join("."));
  const vocabulary = detectVocabulary(colorNames);

  const colors: ParsedColor[] = [];
  const looseColors: ParsedColor[] = [];
  const alternatives: ParsedColor[] = [];
  const radii = nullRecord<ParsedDim>();
  let radius: ParsedDim | undefined;
  const spaceScale = nullRecord<ParsedDim>();
  let spaceBase: ParsedDim | undefined;
  const borders: { key: string; dim: ParsedDim }[] = [];
  const shadows: (Shadow & ProvInput)[] = [];
  const shadowNames = new Set<string>();
  const styles = new Map<string, TypeStyle & ProvInput & { stack?: string | string[] }>();
  const lineHeights = new Map<string, number>();
  const letterSpacings = new Map<string, number>();
  const families: (FontCandidate & { exact: boolean })[] = [];
  const looseFamilies: FontCandidate[] = [];
  const roleWeights: Partial<Record<FontRole, number[]>> = {};
  const genericWeights: number[] = [];

  for (const [, { kind, list }] of byKey) {
    if (kind === "ignore") continue;
    const reference = list.every((o) => o.reference);
    const main = primary(list);
    const node = main.node;
    const typed = normalizeType(main.type) !== "" || figmaScopes(node).length > 0;
    const prov = (o: Observation, confidence: Confidence): ProvInput => ({ locator: locatorOf(o), confidence, method: "declared" });
    const name = pathOf(node).join(".");

    if (kind === "color") {
      const roleName = strippedPath(node).join(".");
      const match = mapRoleName(roleName, vocabulary ? { vocabulary } : {}) ?? codeSyntaxRole(node);
      const pathMode = match?.mode ?? normalizeTokenName(roleName).mode;
      const scale = match ? null : parseScaleName(roleName);
      const css = (o: Observation) => {
        const value = colorToCss(o.value);
        if (value === null) warn("invalid-color", name);
        return value;
      };
      const base = { name, ...(match && { role: match.role }) };
      if (reference && (match || !scale)) continue;
      if (match) {
        const seen = new Map<Mode | "none", string>();
        for (const o of list.filter((x) => !x.alt)) {
          const mode = o.mode ?? pathMode;
          const slot = mode ?? "none";
          if (seen.has(slot)) continue;
          const value = css(o);
          if (value === null) continue;
          seen.set(slot, value);
          colors.push({ ...base, value, ...(mode && { mode }), ...prov(o, match.confidence) });
        }
        for (const o of list.filter((x) => x.alt)) {
          const mode = o.mode ?? pathMode;
          const value = colorToCss(o.value);
          if (value === null || seen.get(mode ?? "none") === value) continue;
          alternatives.push({ ...base, value, ...(mode && { mode }), ...prov(o, worseConfidence(match.confidence, "medium")) });
        }
        continue;
      }
      const light = list.find((o) => !o.alt && (o.mode ?? pathMode) !== "dark");
      const dark = list.find((o) => !o.alt && (o.mode ?? pathMode) === "dark");
      const lightValue = light && css(light);
      if (light && lightValue) {
        const mode = light.mode ?? pathMode;
        looseColors.push({ name, value: lightValue, ...(mode && { mode }), ...(scale && { scale }), ...prov(light, "exact") });
      }
      if (dark) {
        const value = css(dark);
        if (value !== null && value !== lightValue) looseColors.push({ name, value, mode: "dark", ...(!light && scale && { scale }), ...prov(dark, "exact") });
      }
      continue;
    }

    const confidence: Confidence = typed ? "exact" : "high";
    const bareIsPx = figmaScopes(node).length > 0;
    const key = keyAfter(node, kind);

    if (kind === "radius" || kind === "space" || kind === "border-width") {
      const d = dimOf(main.value, { bareIsPx });
      if (!d) {
        warn("invalid-value", name);
        continue;
      }
      const dim: ParsedDim = { ...d, ...prov(main, confidence) };
      if (kind === "radius") {
        const k = radiusKey(key);
        if (k === "") radius ??= dim;
        else if (k !== "none" && !Object.hasOwn(radii, k)) radii[k] = dim;
      } else if (kind === "space") {
        const k = spaceKey(key);
        if (k === "") spaceBase ??= dim;
        else if (k !== null && !Object.hasOwn(spaceScale, k)) spaceScale[k] = dim;
      } else borders.push({ key: key || "default", dim });
      continue;
    }

    if (kind === "shadow") {
      const layers = shadowLayersOf(main.value);
      if (!layers) {
        warn("invalid-value", name);
        continue;
      }
      const shadowKey = shadowName(key, words(pathOf(node)).includes("elevation"));
      if (!shadowNames.has(shadowKey)) {
        shadowNames.add(shadowKey);
        shadows.push({ name: shadowKey, layers, ...prov(main, confidence) });
      }
      continue;
    }

    if (kind === "font-family") {
      const stack = fontStackOf(main.value);
      const role = fontRoleOf(key);
      if (!stack) warn("invalid-value", name);
      else if (role) families.push({ role: role.role, stack, ...prov(main, role.exact ? confidence : worseConfidence(confidence, "high")), exact: role.exact });
      else looseFamilies.push({ role: "body", stack, ...prov(main, "medium") });
      continue;
    }

    if (kind === "font-weight") {
      const weight = fontWeightOf(main.value);
      if (weight === null) continue;
      const role = fontRoleOf(key);
      if (role) (roleWeights[role.role] ??= []).push(weight);
      else genericWeights.push(weight);
      continue;
    }

    if (kind === "line-height" || kind === "letter-spacing") {
      const value = kind === "line-height" ? lineHeightOf(main.value) : letterSpacingOf(main.value);
      if (value !== undefined && key) (kind === "line-height" ? lineHeights : letterSpacings).set(key, value);
      continue;
    }

    if (kind === "font-size") {
      const d = dimOf(main.value, { bareIsPx: true });
      if (!d || !key) continue;
      const style = styles.get(key) ?? { name: key, ...prov(main, confidence) };
      style.fontSize ??= { value: d.value, unit: d.unit, px: d.px, ...(d.assumed && { assumed: true }) };
      styles.set(key, style);
      continue;
    }

    if (kind === "typography") {
      const metrics = typographyOf(main.value);
      if (!metrics || !key) {
        if (!metrics) warn("invalid-value", name);
        continue;
      }
      const style: TypeStyle & ProvInput & { stack?: string | string[] } = { name: key, ...prov(main, confidence) };
      if (metrics.fontSize) style.fontSize = metrics.fontSize;
      if (metrics.lineHeight !== undefined) style.lineHeight = metrics.lineHeight;
      if (metrics.letterSpacing !== undefined) style.letterSpacing = metrics.letterSpacing;
      if (metrics.weight !== undefined) style.weight = metrics.weight;
      if (metrics.stack) {
        style.stack = metrics.stack;
        const family = firstFamily(metrics.stack);
        if (family) style.family = family;
      }
      styles.set(key, { ...styles.get(key), ...style });
    }
  }

  for (const [key, style] of styles) {
    if (style.lineHeight === undefined && lineHeights.has(key)) style.lineHeight = lineHeights.get(key)!;
    if (style.letterSpacing === undefined && letterSpacings.has(key)) style.letterSpacing = letterSpacings.get(key)!;
  }

  if (looseFamilies.length === 1 && !families.some((f) => f.role === "body")) families.push({ ...looseFamilies[0]!, exact: false });
  const fonts = assembleFonts(families, [...styles.values()], roleWeights, genericWeights);
  const borderWidth = BORDER_PREFERENCE.map((k) => borders.find((b) => b.key === k)).find(Boolean) ?? borders.find((b) => b.dim.px > 0);
  const scale = positionalSpace(spaceScale);
  const shape: NonNullable<ParseOutput["shape"]> = {
    ...(radius && { radius }),
    ...(Object.keys(radii).length > 0 && { radii }),
    ...(shadows.length > 0 && { shadows }),
    ...(borderWidth && { borderWidth: borderWidth.dim }),
  };
  const typeScale = [...styles.values()].map(({ stack: _stack, ...style }) => style);
  const allColors = [...colors, ...looseColors, ...alternatives];
  return {
    ...(allColors.length > 0 && { colors: allColors }),
    ...(fonts.length > 0 && { fonts }),
    ...(Object.keys(shape).length > 0 && { shape }),
    ...((spaceBase || Object.keys(scale).length > 0) && {
      spacing: { ...(spaceBase && { base: spaceBase }), ...(Object.keys(scale).length > 0 && { scale }) },
    }),
    ...(typeScale.length > 0 && { typeScale }),
    warnings,
  };
}

/**
 * Numeric spacing keys are Tailwind multipliers (`4` = 16 px) unless the values say otherwise: a run
 * `1…n` whose values are not `4 × key` is a list of steps (our own exports: `space.5` = 24 px), and
 * becomes the named steps `2xs…5xl`.
 */
function positionalSpace(scale: Record<string, ParsedDim>): Record<string, ParsedDim> {
  const keys = Object.keys(scale);
  const numeric = keys.filter((k) => /^\d+$/.test(k)).map(Number);
  if (numeric.length < 2 || numeric.length !== keys.length || numeric.length > NAMED_SPACE.length) return scale;
  const sorted = [...numeric].sort((a, b) => a - b);
  const run = sorted.every((k, i) => k === i + 1);
  const tailwind = sorted.every((k) => Math.abs(scale[String(k)]!.px - k * 4) < 0.5);
  if (!run || tailwind) return scale;
  const named = nullRecord<ParsedDim>();
  sorted.forEach((k, i) => (named[NAMED_SPACE[i]!] = scale[String(k)]!));
  return named;
}

function assembleFonts(
  families: readonly (FontCandidate & { exact: boolean })[],
  styles: readonly (TypeStyle & ProvInput & { stack?: string | string[] })[],
  roleWeights: Partial<Record<FontRole, number[]>>,
  genericWeights: readonly number[],
): FontCandidate[] {
  const styleRole = (name: string): FontRole | null => fontRoleOf(name)?.role ?? (/^(?:display|h[1-6])/.test(name) ? "heading" : null);
  const styleWeights: Partial<Record<FontRole, number[]>> = {};
  for (const s of styles) {
    const role = styleRole(s.name);
    if (role && s.weight !== undefined) (styleWeights[role] ??= []).push(s.weight);
  }
  const weightsFor = (role: FontRole) => {
    const list = roleWeights[role]?.length ? roleWeights[role]! : styleWeights[role]?.length ? styleWeights[role]! : genericWeights;
    return [...new Set(list)].sort((a, b) => a - b);
  };
  const out: FontCandidate[] = [];
  const ordered = [...families].sort((a, b) => Number(b.exact) - Number(a.exact));
  for (const { exact: _exact, ...family } of ordered) {
    const weights = weightsFor(family.role);
    out.push({ ...family, ...(weights.length > 0 && { weights }) });
  }
  for (const role of ["heading", "body", "mono"] as const) {
    if (out.some((f) => f.role === role)) continue;
    const style = styles.find((s) => s.stack && styleRole(s.name) === role);
    if (!style?.stack) continue;
    const weights = weightsFor(role);
    out.push({ role, stack: style.stack, ...(weights.length > 0 && { weights }), locator: style.locator, confidence: worseConfidence(style.confidence, "high"), method: "declared" });
  }
  return out;
}
