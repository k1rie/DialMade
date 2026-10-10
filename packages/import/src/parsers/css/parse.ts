import type { FontSizeName } from "@dialmade/doc";
import { parseColorWithAlpha } from "@dialmade/palette";
import valueParser from "postcss-value-parser";
import { TAILWIND_THEME_VARS, isTailwindDefaultVar } from "../../defaults";
import { readNextFonts, splitFontStack } from "../../fonts";
import { IMPORT_LIMITS } from "../../limits";
import type { BatchFile, ParserContext, ParserInput } from "../../registry";
import { detectVocabulary, mapRoleName, parseScaleName, type RoleMatch, type Vocabulary } from "../../roles";
import { normalizeColor } from "../../color";
import { decodeText } from "../../sanitize";
import type {
  Confidence,
  Dim,
  FontCandidate,
  FontRole,
  Mode,
  ParsedColor,
  ParsedDim,
  ParseOutput,
  ProvInput,
  Shadow,
  TypeStyle,
} from "../../types";
import { createResolver, type Resolution } from "./resolve";
import { readSheet, type Sheet, type VarDef } from "./sheet";
import {
  clampMax,
  isColor,
  isHslChannels,
  isNonColorKeyword,
  parseDim,
  parseLetterSpacing,
  parseLineHeight,
  parseShadow,
  parseWeight,
  unevaluatedColor,
  wrapHslChannels,
} from "./values";

type Warning = NonNullable<ParseOutput["warnings"]>[number];
type UnresolvedItem = NonNullable<ParseOutput["unresolved"]>[number];

const CONFIDENCE_RANK: Readonly<Record<Confidence, number>> = { exact: 0, high: 1, medium: 2, low: 3 };
const worse = (a: Confidence, b: Confidence): Confidence => (CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b);

const MAX_UNRESOLVED = 200;
const MAX_LITERAL_COLORS = 12;
/** DesignDoc spacing steps 1–10 (`--dl-space-*`) as Tailwind keys, the way `applyImport` reads them back. */
const DL_SPACE_KEYS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const STEPS: ReadonlySet<string> = new Set(["display", "h1", "h2", "h3", "body", "small", "caption"]);
/** First segments that are words, not a project namespace (`--app-bg` has one; `--color-bg` does not). */
const NAMESPACE_STOP: ReadonlySet<string> = new Set([
  "color", "colors", "bg", "background", "text", "fg", "foreground", "border", "brand", "primary", "secondary", "accent",
  "surface", "gray", "grey", "neutral", "slate", "zinc", "stone", "ui", "theme", "sidebar", "chart", "tw", "radius",
  "font", "shadow", "spacing", "space", "card", "popover", "muted", "destructive", "input", "ring", "success", "warning",
  "danger", "info", "error", "base", "light", "dark", "sys", "ref", "dl", "bs", "on", "link", "icon",
]);
const TEXT_NOT_SIZE = /^(?:color|shadow|decoration|underline|indent|opacity|wrap|align|transform|overflow|stroke|fill)(?:-|$)/;
const FONT_NOT_FAMILY = /^(?:weight|size|feature-settings|variation-settings|smoothing|stretch|style|optical-sizing|color|synthesis|kerning|variant|display-swap)(?:-|$)/;
const FRAMEWORK_STACKS = ["--font-sans", "--font-serif", "--font-mono"];
/** tweakcn-style shadow parts (`--shadow-opacity`, `--shadow-offset-x`), not shadows. */
const SHADOW_PARTS = /^(?:color|opacity|blur|spread|offset(?:-[xy])?|[xy])$/;
const COLOR_FN = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/;

type FontSlot = { role: FontRole; rank: number; confidence: Confidence };

/** `--font-heading` → heading (exact); `--font-sans` → body (high); `--font-inter` → null (a family, not a role). */
function fontSlotOf(name: string): FontSlot | null {
  if (name === "--default-font-family") return { role: "body", rank: 3, confidence: "high" };
  if (name === "--default-mono-font-family") return { role: "mono", rank: 3, confidence: "high" };
  const own = /^--(heading|body|mono|code)-font(?:-family)?$/.exec(name)?.[1];
  if (own) return { role: own === "heading" ? "heading" : own === "body" ? "body" : "mono", rank: 1, confidence: "exact" };
  const m = /^--(dl-)?font(?:-family)?-([a-z0-9-]+)$/.exec(name);
  if (!m || FONT_NOT_FAMILY.test(m[2]!)) return null;
  const word = m[2]!;
  if (/^(?:heading|headings|headline|header)$/.test(word)) return { role: "heading", rank: 1, confidence: "exact" };
  if (word === "body") return { role: "body", rank: 1, confidence: "exact" };
  if (/^(?:mono|monospace|code)$/.test(word)) return { role: "mono", rank: 1, confidence: "exact" };
  if (/^(?:sans|base|text|ui|primary|copy|default|paragraph)$/.test(word)) return { role: "body", rank: 2, confidence: "high" };
  if (/^(?:display|title)$/.test(word)) return { role: "heading", rank: 2, confidence: "high" };
  if (word === "serif") return { role: "heading", rank: 4, confidence: "medium" };
  return null;
}

type Category =
  | { k: "radius-base" }
  | { k: "radius"; key: string }
  | { k: "shadow"; key: string }
  | { k: "spacing-base" }
  | { k: "spacing"; key: string }
  | { k: "border-width" }
  | { k: "text-size"; key: string; clamp: boolean }
  | { k: "text-sub"; key: string; sub: "line-height" | "letter-spacing" | "font-weight" }
  | { k: "leading"; key: string }
  | { k: "tracking"; key: string }
  | { k: "font"; slot: FontSlot | null }
  | { k: "other" };

function categoryOf(name: string): Category {
  const sub = /^--text-([a-z0-9-]+?)--(line-height|letter-spacing|font-weight)$/.exec(name);
  if (sub) return { k: "text-sub", key: sub[1]!, sub: sub[2] as "line-height" | "letter-spacing" | "font-weight" };
  if (name.indexOf("--", 2) >= 0) return { k: "other" };
  if (name === "--radius") return { k: "radius-base" };
  let m = /^--(?:dl-radius|radius|border-radius|rounded)-([a-z0-9-]+)$/.exec(name);
  if (m) return { k: "radius", key: m[1]! };
  if (name === "--shadow") return { k: "shadow", key: "DEFAULT" };
  m = /^--(?:dl-shadow|shadow|box-shadow|elevation)-([a-z0-9-]+)$/.exec(name);
  if (m && !SHADOW_PARTS.test(m[1]!)) return { k: "shadow", key: m[1]! };
  if (name === "--spacing") return { k: "spacing-base" };
  m = /^--dl-space-(\d{1,2})$/.exec(name);
  if (m) {
    const key = DL_SPACE_KEYS[Number(m[1]) - 1];
    return key === undefined ? { k: "other" } : { k: "spacing", key: String(key) };
  }
  m = /^--(?:spacing|space)-([a-z0-9.-]+)$/.exec(name);
  if (m) return { k: "spacing", key: m[1]! };
  if (/^--(?:dl-border-width|border-width|border-width-default|default-border-width)$/.test(name)) return { k: "border-width" };
  m = /^--text-([a-z0-9-]+)$/.exec(name);
  if (m && !TEXT_NOT_SIZE.test(m[1]!)) return { k: "text-size", key: m[1]!, clamp: false };
  m = /^--(?:dl-fs|fs|font-size)-([a-z0-9-]+)$/.exec(name);
  if (m) return { k: "text-size", key: m[1]!, clamp: true };
  m = /^--(?:leading|line-height)-([a-z0-9-]+)$/.exec(name);
  if (m) return { k: "leading", key: m[1]! };
  m = /^--(?:tracking|letter-spacing)-([a-z0-9-]+)$/.exec(name);
  if (m) return { k: "tracking", key: m[1]! };
  const slot = fontSlotOf(name);
  if (slot || /^--(?:dl-)?font(?:-family)?-/.test(name)) return { k: "font", slot };
  return { k: "other" };
}

/** A project prefix most color variables share (`--app-bg`, `--app-text`…), to read roles behind it. */
function detectNamespace(vars: readonly VarDef[]): string | undefined {
  const counts = new Map<string, number>();
  let total = 0;
  for (const v of vars) {
    if (v.scope !== "root" || !(isColor(v.value) || v.value.startsWith("var(") || isHslChannels(v.value))) continue;
    total++;
    const seg = /^--([a-z][a-z0-9]*)-/.exec(v.name)?.[1];
    if (seg) counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }
  let best: [string, number] | undefined;
  for (const entry of counts) if (!best || entry[1] > best[1]) best = entry;
  return best && best[1] >= 3 && best[1] >= total * 0.5 && !NAMESPACE_STOP.has(best[0]) ? best[0] : undefined;
}

/** shadcn's legacy signature without the whole file: most shadcn role variables hold bare HSL channels. */
function shadcnChannels(sheet: Sheet): boolean {
  let roles = 0;
  let channels = 0;
  for (const v of sheet.vars) {
    if (v.scope !== "root" || mapRoleName(v.name)?.source !== "shadcn") continue;
    roles++;
    if (isHslChannels(v.value)) channels++;
  }
  return channels >= 3 && channels >= roles * 0.6;
}

function refineFormat(detected: string, sheet: Sheet, vocabulary: Vocabulary | undefined): string {
  if (detected === "css-compiled") return detected;
  const hsl = sheet.vars.some((v) => v.scope === "root" && isHslChannels(v.value));
  if (detected === "shadcn-hsl" || (vocabulary && hsl) || (hsl && shadcnChannels(sheet))) return "shadcn-hsl";
  if (vocabulary === "shadcn" || detected === "shadcn-oklch") return "shadcn-oklch";
  if (sheet.hasTheme && (detected === "css" || detected === "tailwind-v4")) return "tailwind-v4";
  return /^[a-z0-9][a-z0-9.+-]{0,63}$/.test(detected) ? detected : "css";
}

const batchSheets = new WeakMap<BatchFile, Sheet>();
const batchFonts = new WeakMap<BatchFile, Map<string, string>>();

/** Every font a next/font layout of the batch defines, by CSS variable (`--font-inter` → Inter). */
function nextFontVariables(ctx: ParserContext): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of ctx.batch ?? []) {
    if (file.text === undefined || !(file.format === "next-font" || (file.parserId === "fonts" && file.text.includes("next/font")))) continue;
    let vars = batchFonts.get(file);
    if (!vars) {
      vars = new Map();
      for (const font of readNextFonts(file.text)) if (font.variable && !font.deduced) vars.set(font.variable, font.family);
      batchFonts.set(file, vars);
    }
    for (const [name, family] of vars) if (!out.has(name)) out.set(name, family);
  }
  return out;
}

const quoteFamily = (family: string) => `"${family.replace(/["\\]/g, "")}"`;

/**
 * CSS: shadcn (oklch and legacy HSL channels), Tailwind v4 `@theme` / `@theme inline`, and compiled CSS.
 * Theme variables become colors (alpha kept, roles from shadcn/Dialmade names, `:root` light and `.dark`
 * dark), fonts (whole stacks for the matcher), radius, shadows, spacing and the `--text-*` type scale.
 * `var()` resolves within the batch; `color-mix()`, `light-dark()` and relative colors are reported as
 * unresolved; `@import` and `url()` are never followed.
 */
export async function parse(input: ParserInput, ctx: ParserContext): Promise<ParseOutput> {
  const source = input.text ?? decodeText(input.bytes)?.text ?? "";
  if (!source.trim()) return {};
  const maxLine = ctx.limits?.maxLineLength ?? IMPORT_LIMITS.maxLineLength;
  const maxHops = ctx.limits?.maxVarHops ?? IMPORT_LIMITS.maxVarHops;
  const warnings: Warning[] = [];
  const sheet = readSheet(source, ctx.signal, maxLine);
  if (sheet.truncated > 0) warnings.push({ code: "line-truncated", detail: `${sheet.truncated}` });
  for (const issue of sheet.recovered.slice(0, 5)) warnings.push({ code: "parse-error", detail: `${issue} (recovered)` });
  if (sheet.failed) return { warnings: [...warnings, { code: "parse-error", detail: sheet.failed }] };

  let others: Sheet[] | undefined;
  const otherSheets = () => {
    others ??= (ctx.batch ?? []).flatMap((file) => {
      if (file.sourceId === input.sourceId || file.parserId !== "css" || file.text === undefined) return [];
      let read = batchSheets.get(file);
      if (!read) {
        read = readSheet(file.text, ctx.signal, maxLine);
        batchSheets.set(file, read);
      }
      return [read];
    });
    return others;
  };
  const strict = createResolver(sheet, otherSheets, { maxHops });
  const nextFonts = nextFontVariables(ctx);
  const loose = createResolver(sheet, otherSheets, {
    maxHops,
    keepUndefined: (name, raw) => {
      const family = nextFonts.get(name);
      return family ? quoteFamily(family) : raw;
    },
  });

  const fileName = input.name;
  const prov = (line: number, what: string, confidence: Confidence, method: ProvInput["method"] = "declared"): ProvInput => ({
    locator: `${fileName}:${line} ${what}`,
    confidence,
    method,
  });
  const names = sheet.vars.map((v) => v.name);
  const vocabulary = detectVocabulary(names);
  const format = refineFormat(input.format, sheet, vocabulary);
  const hsl = format === "shadcn-hsl";
  const namespace = detectNamespace(sheet.vars);

  const unresolved: UnresolvedItem[] = [];
  const unresolve = (path: string, reason: string) => {
    if (unresolved.length < MAX_UNRESOLVED && !unresolved.some((u) => u.path === path && u.reason === reason)) unresolved.push({ path, reason });
  };

  const roleOf = (name: string): RoleMatch | null => {
    const direct = mapRoleName(name, vocabulary ? { vocabulary } : {});
    if (direct) return direct;
    if (namespace && name.startsWith(`--${namespace}-`)) {
      const behind = mapRoleName(`--${name.slice(namespace.length + 3)}`, vocabulary ? { vocabulary } : {});
      if (behind) return { ...behind, confidence: worse(behind.confidence, "medium") };
    }
    return null;
  };

  // ── colors ──
  const entries: ColorEntry[] = [];
  const emitted = new Map<string, Set<string>>();
  const roleSlots = new Set<string>();
  const emitColor = (def: VarDef, value: string, mode: Mode | undefined, role: RoleMatch | null, scale: { group: string; step: number } | null) => {
    const key = `${def.name}|${value.toLowerCase()}`;
    const modes = emitted.get(key) ?? new Set<string>();
    const m = mode ?? "*";
    if (modes.has(m) || modes.has("*") || (m === "*" && modes.size > 0)) return;
    modes.add(m);
    emitted.set(key, modes);
    const finalMode = mode ?? role?.mode;
    if (role) roleSlots.add(`${finalMode ?? "light"}|${role.role}`);
    entries.push({
      color: {
        value,
        name: def.name,
        ...prov(def.line, def.name, role ? role.confidence : "exact"),
        ...(finalMode && { mode: finalMode }),
        ...(role && { role: role.role }),
        ...(scale && { scale }),
      },
      order: def.order,
      important: def.important,
    });
  };

  /** A resolved theme value as a color: `null` when it is not one (a length, a font stack…). */
  const asColor = (res: Resolution): { value: string } | { unresolved: string } | { keyword: string } | null => {
    if (res.error) return { unresolved: res.error };
    const value = hsl ? wrapHslChannels(res.text.trim()) : res.text.trim();
    const fn = unevaluatedColor(value);
    if (fn) return { unresolved: `${fn} is not evaluated` };
    if (isNonColorKeyword(value)) return { keyword: value };
    return isColor(value) ? { value } : null;
  };

  /** `--color-primary: var(--primary)` repeats a color the target already gives, in the same mode and role. */
  const redundantAlias = (res: Resolution, role: RoleMatch | null, scale: { group: string; step: number } | null, mode: Mode | undefined): boolean => {
    const target = res.aliasOf;
    if (!target) return false;
    if (!role && !scale) return true;
    if (target.mode !== mode) return false;
    const targetRole = roleOf(target.name)?.role;
    if (role) return role.role === targetRole;
    const targetScale = targetRole ? null : parseScaleName(target.name);
    return targetScale !== null && scale !== null && targetScale.group === scale.group && targetScale.step === scale.step;
  };

  const modeOfRes = (res: Resolution, scopeMode: Mode | undefined): Mode | undefined => {
    if (scopeMode) return scopeMode;
    if (res.modes.has("dark") && !res.modes.has("light")) return "dark";
    return res.modes.has("light") ? "light" : undefined;
  };

  // ── shape, spacing, type ──
  const radii: Record<string, ParsedDim> = Object.create(null);
  let radius: ParsedDim | undefined;
  let borderWidth: ParsedDim | undefined;
  let spacingBase: ParsedDim | undefined;
  const spacing: Record<string, ParsedDim> = Object.create(null);
  const shadows: (Shadow & ProvInput)[] = [];
  const shadowKeys = new Set<string>();
  const sizes = new Map<string, { def: VarDef; dim: Dim; clamped: boolean }>();
  const subs = new Map<string, Partial<Record<"line-height" | "letter-spacing" | "font-weight", { def: VarDef; value: string }>>>();
  const typeExtras: (TypeStyle & ProvInput)[] = [];
  const fontDefs: { def: VarDef; slot: FontSlot }[] = [];

  const dimOf = (def: VarDef, res: Resolution): Dim | null => {
    if (res.error) {
      unresolve(def.name, res.error);
      return null;
    }
    const dim = parseDim(res.text);
    if (!dim.ok) {
      unresolve(def.name, dim.reason);
      return null;
    }
    return dim.value;
  };

  for (const def of sheet.vars) {
    if (def.name.startsWith("--tw-")) continue;
    const res = strict.resolve(def.value, def.mode, def.name);
    const color = def.name.indexOf("--", 2) < 0 ? asColor(res) : null;
    const category = categoryOf(def.name);
    const role = roleOf(def.name);
    const scale = role ? null : parseScaleName(def.name);
    const colorish = role !== null || scale !== null || /^--color-/.test(def.name);

    if (color && "value" in color) {
      if (!role && !scale && isTailwindDefaultColor(def.name, color.value)) continue;
      const mode = def.scope === "root" ? def.mode : modeOfRes(res, def.mode);
      if (!redundantAlias(res, role, scale, mode)) emitColor(def, color.value, mode, role, scale);
      if (def.scope !== "root" && !def.mode) {
        const dark = strict.resolve(def.value, "dark", def.name);
        const darkColor = asColor(dark);
        if (darkColor && "value" in darkColor && dark.modes.has("dark") && darkColor.value !== color.value && !redundantAlias(dark, role, scale, "dark")) {
          emitColor(def, darkColor.value, "dark", role, scale);
        }
      }
      continue;
    }
    if (color && "unresolved" in color && category.k === "other") {
      if (colorish || !res.error) unresolve(def.name, color.unresolved);
      continue;
    }
    if (color && "keyword" in color) {
      if (colorish && category.k === "other") emitColor(def, color.keyword, def.mode, role, scale);
      continue;
    }
    // Shape, spacing, type and fonts have no mode in the DesignDoc: a `.dark` override is not the guide's value.
    if (def.mode === "dark" && def.conditional) continue;

    switch (category.k) {
      case "radius-base": {
        const dim = dimOf(def, res);
        if (dim) radius = { ...dim, ...prov(def.line, def.name, "exact") };
        break;
      }
      case "radius": {
        if (isTailwindDefaultVar(def.name, def.value)) break;
        const dim = dimOf(def, res);
        if (dim) radii[category.key] = { ...dim, ...prov(def.line, def.name, "exact") };
        break;
      }
      case "border-width": {
        const dim = dimOf(def, res);
        if (dim) borderWidth = { ...dim, ...prov(def.line, def.name, "exact") };
        break;
      }
      case "spacing-base": {
        const dim = dimOf(def, res);
        if (dim) spacingBase = { ...dim, ...prov(def.line, def.name, "exact") };
        break;
      }
      case "spacing": {
        const dim = dimOf(def, res);
        if (dim) spacing[category.key] = { ...dim, ...prov(def.line, def.name, "exact") };
        break;
      }
      case "shadow": {
        if (isTailwindDefaultVar(def.name, def.value)) break;
        if (res.error) {
          unresolve(def.name, res.error);
          break;
        }
        const parsed = parseShadow(res.text);
        if (!parsed.ok) {
          unresolve(def.name, parsed.reason);
          break;
        }
        const signature = JSON.stringify(parsed.value);
        if (shadowKeys.has(`${category.key}|${signature}`)) break;
        shadowKeys.add(`${category.key}|${signature}`);
        shadows.push({ name: category.key, layers: parsed.value, ...prov(def.line, def.name, "exact") });
        break;
      }
      case "text-size": {
        if (res.error) {
          unresolve(def.name, res.error);
          break;
        }
        const max = category.clamp ? clampMax(res.text) : null;
        const dim = parseDim(max ?? res.text);
        if (!dim.ok) {
          unresolve(def.name, dim.reason);
          break;
        }
        sizes.set(category.key, { def, dim: dim.value, clamped: max !== null });
        break;
      }
      case "text-sub": {
        if (res.error) break;
        const entry = subs.get(category.key) ?? {};
        entry[category.sub] = { def, value: res.text };
        subs.set(category.key, entry);
        break;
      }
      case "leading": {
        if (isTailwindDefaultVar(def.name, def.value) || res.error) break;
        const lineHeight = parseLineHeight(res.text);
        if (lineHeight !== null) typeExtras.push({ name: def.name, lineHeight, ...prov(def.line, def.name, "exact") });
        break;
      }
      case "tracking": {
        if (isTailwindDefaultVar(def.name, def.value) || res.error) break;
        const letterSpacing = parseLetterSpacing(res.text);
        if (letterSpacing !== null) typeExtras.push({ name: def.name, letterSpacing, ...prov(def.line, def.name, "exact") });
        break;
      }
      case "font":
        if (category.slot) fontDefs.push({ def, slot: category.slot });
        break;
      default:
        break;
    }
  }

  // ── type scale ──
  const typeScale: (TypeStyle & ProvInput)[] = [];
  for (const [key, { def, dim, clamped }] of sizes) {
    const extra = subs.get(key);
    const tailwindDefault =
      isTailwindDefaultVar(def.name, def.value) &&
      Object.entries(extra ?? {}).every(([sub, v]) => isTailwindDefaultVar(`${def.name}--${sub}`, v.def.value));
    if (tailwindDefault) continue;
    const style: TypeStyle & ProvInput = { name: def.name, fontSize: dim, ...prov(def.line, def.name, clamped ? "high" : "exact") };
    if (STEPS.has(key)) style.step = key as FontSizeName;
    const lineHeight = extra?.["line-height"] && parseLineHeight(extra["line-height"].value, dim.px);
    const letterSpacing = extra?.["letter-spacing"] && parseLetterSpacing(extra["letter-spacing"].value, dim.px);
    const weight = extra?.["font-weight"] && parseWeight(extra["font-weight"].value);
    if (typeof lineHeight === "number") style.lineHeight = lineHeight;
    if (typeof letterSpacing === "number") style.letterSpacing = letterSpacing;
    if (typeof weight === "number") style.weight = weight;
    typeScale.push(style);
  }
  typeScale.push(...typeExtras);

  const themeColors = entries.length;

  // ── element rules (compiled CSS): body/html colors and font stacks ──
  const elementFonts: { role: FontRole; stack: string; dark: boolean; line: number; what: string; order: number }[] = [];
  const elementWeights = new Map<FontRole, number[]>();
  for (const el of sheet.elements) {
    const what = `${el.selector} ${el.prop}`;
    if (el.prop === "font-family") {
      const role: FontRole | undefined = el.element === "root" ? "body" : el.element === "heading" ? "heading" : el.element === "mono" ? "mono" : undefined;
      if (role) elementFonts.push({ role, stack: el.value, dark: el.mode === "dark" && el.conditional, line: el.line, what, order: el.order });
      continue;
    }
    if (el.prop === "font-weight" && el.element === "heading") {
      const weight = parseWeight(el.value);
      if (weight !== null) elementWeights.set("heading", [...(elementWeights.get("heading") ?? []), weight]);
      continue;
    }
    const roleKey =
      el.element === "root" && (el.prop === "background-color" || el.prop === "background")
        ? "background"
        : el.element === "root" && el.prop === "color"
          ? "foreground"
          : el.element === "link" && el.prop === "color"
            ? "primaryText"
            : undefined;
    if (!roleKey) continue;
    const res = strict.resolve(el.value, el.mode, undefined);
    const color = asColor(res);
    if (!color || !("value" in color)) continue;
    const mode = el.mode ?? modeOfRes(res, undefined);
    if (roleSlots.has(`${mode ?? "light"}|${roleKey}`) || (res.aliasOf && roleOf(res.aliasOf.name)?.role === roleKey)) continue;
    roleSlots.add(`${mode ?? "light"}|${roleKey}`);
    entries.push({
      color: { value: color.value, ...prov(el.line, what, roleKey === "primaryText" ? "medium" : "high"), ...(mode && { mode }), role: roleKey },
      order: el.order,
      important: false,
    });
  }

  // ── fonts ──
  const fonts: FontCandidate[] = [];
  type Pick = { role: FontRole; rank: number; order: number; stack: string; line: number; what: string; confidence: Confidence };
  const picks: Pick[] = [
    ...elementFonts.filter((f) => !f.dark).map((f) => ({ role: f.role, rank: 0, order: f.order, stack: f.stack, line: f.line, what: f.what, confidence: "high" as const })),
    ...fontDefs
      .filter(({ def }) => !(def.mode === "dark" && def.conditional))
      .map(({ def, slot }) => ({ role: slot.role, rank: slot.rank, order: def.order, stack: def.value, line: def.line, what: def.name, confidence: slot.confidence })),
  ];
  const hasExplicitHeading = picks.some((p) => p.role === "heading" && p.rank < 4);
  for (const role of ["heading", "body", "mono"] as const) {
    const candidates = picks
      .filter((p) => p.role === role && !(role === "heading" && p.rank === 4 && hasExplicitHeading))
      .sort((a, b) => a.rank - b.rank || b.order - a.order);
    for (const pick of candidates) {
      const res = loose.resolve(pick.stack, undefined, pick.what.startsWith("--") ? pick.what : undefined);
      const stack = res.text.replace(/\s+/g, " ").trim();
      if (res.error || !stack || isNonColorKeyword(stack) || /^--theme\(/.test(stack)) continue;
      if (isFrameworkStack(stack)) continue;
      const weights = elementWeights.get(role);
      fonts.push({ role, stack, ...(weights && { weights }), ...prov(pick.line, pick.what, pick.confidence) });
      break;
    }
  }

  const colors = cascade(entries);
  if (inferDarkMode(colors)) warnings.push({ code: "mode-inferred", detail: "dark" });
  // ── colors used directly, when the file has no theme colors (compiled CSS of a site) ──
  if (themeColors === 0) colors.push(...literalColors(sheet, fileName, hsl, colors));

  const output: ParseOutput = { format };
  if (colors.length > 0) output.colors = colors;
  if (fonts.length > 0) output.fonts = fonts;
  const shape: NonNullable<ParseOutput["shape"]> = {};
  if (radius) shape.radius = radius;
  if (Object.keys(radii).length > 0) shape.radii = { ...radii };
  if (shadows.length > 0) shape.shadows = shadows;
  if (borderWidth) shape.borderWidth = borderWidth;
  if (Object.keys(shape).length > 0) output.shape = shape;
  if (spacingBase || Object.keys(spacing).length > 0) output.spacing = { ...(spacingBase && { base: spacingBase }), ...(Object.keys(spacing).length > 0 && { scale: { ...spacing } }) };
  if (typeScale.length > 0) output.typeScale = typeScale;
  if (warnings.length > 0) output.warnings = warnings;
  if (unresolved.length > 0) output.unresolved = unresolved;
  return output;
}

/**
 * A dark guide written in a plain `:root` (no `.dark`, no `color-scheme`): its background is dark, so
 * its roles are dark-mode values (the light mode is generated), as the DESIGN.md parser does.
 */
function inferDarkMode(colors: ParsedColor[]): boolean {
  if (colors.some((c) => c.mode === "dark")) return false;
  const background = colors.find((c) => c.role === "background");
  const parsed = background ? normalizeColor(background.value) : null;
  if (!parsed?.ok || parsed.color.oklch.l >= 0.5) return false;
  for (const c of colors) if (c.role || c.mode === "light") c.mode = "dark";
  return true;
}

interface ColorEntry {
  color: ParsedColor;
  order: number;
  important: boolean;
}

const beats = (a: ColorEntry, b: ColorEntry) => (a.important !== b.important ? a.important : a.order > b.order);

/**
 * The cascade, per mode: a variable declared twice keeps its last value (`!important` first), and when
 * two variables claim the same role the most certain (then the last) keeps it; the other stays as a
 * plain color.
 */
function cascade(entries: readonly ColorEntry[]): ParsedColor[] {
  const nameKey = (e: ColorEntry) => `${e.color.name ?? `#${e.order}`}|${e.color.mode ?? "*"}`;
  const last = new Map<string, ColorEntry>();
  for (const e of entries) {
    const prev = last.get(nameKey(e));
    if (!prev || beats(e, prev)) last.set(nameKey(e), e);
  }
  const survivors = entries.filter((e) => last.get(nameKey(e)) === e);
  const roleKey = (e: ColorEntry) => `${e.color.mode ?? "light"}|${e.color.role}`;
  const holder = new Map<string, ColorEntry>();
  for (const e of survivors) {
    if (!e.color.role) continue;
    const prev = holder.get(roleKey(e));
    const rank = CONFIDENCE_RANK[e.color.confidence] - (prev ? CONFIDENCE_RANK[prev.color.confidence] : 0);
    if (!prev || rank < 0 || (rank === 0 && beats(e, prev))) holder.set(roleKey(e), e);
  }
  return survivors.map((e) => {
    if (!e.color.role || holder.get(roleKey(e)) === e) return e.color;
    const { role: _role, ...rest } = e.color;
    return { ...rest, confidence: "exact" as const };
  });
}

const stackKey = (stack: string) => splitFontStack(stack).map((f) => f.toLowerCase()).join(",");
const FRAMEWORK_STACK_KEYS = new Set(FRAMEWORK_STACKS.flatMap((name) => (TAILWIND_THEME_VARS[name] ? [stackKey(TAILWIND_THEME_VARS[name])] : [])));

/** Tailwind's default `--font-sans` / `--font-mono` / `--font-serif` (any spacing or quotes): not the brand's. */
const isFrameworkStack = (stack: string) => FRAMEWORK_STACK_KEYS.has(stackKey(stack));

/** Tailwind's own `--color-white: #fff` and friends, redeclared as is: not the brand's. */
function isTailwindDefaultColor(name: string, value: string): boolean {
  const base = TAILWIND_THEME_VARS[name];
  return base !== undefined && parseColorWithAlpha(base) !== null && parseColorWithAlpha(base) === parseColorWithAlpha(value);
}

/** The most used literal colors of a stylesheet without theme variables (compiled CSS of a site). */
function literalColors(sheet: Sheet, fileName: string, hsl: boolean, already: readonly ParsedColor[]): ParsedColor[] {
  const seen = new Set(already.map((c) => parseColorWithAlpha(hsl ? wrapHslChannels(c.value) : c.value)).filter(Boolean));
  const counts = new Map<string, { value: string; count: number; line: number; prop: string }>();
  for (const decl of sheet.literals) {
    if (decl.value.length > 2000) continue;
    const consider = (text: string) => {
      if (isNonColorKeyword(text) || !isColor(text)) return;
      const key = parseColorWithAlpha(text)!;
      if (seen.has(key)) return;
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { value: text, count: 1, line: decl.line, prop: decl.prop });
    };
    valueParser(decl.value).walk((node) => {
      if (node.type === "function") {
        const fn = node.value.toLowerCase();
        if (COLOR_FN.test(fn)) {
          consider(valueParser.stringify(node));
          return false;
        }
        return fn === "url" || fn === "var" || fn === "image-set" ? false : undefined;
      }
      if (node.type === "word") consider(node.value);
      return undefined;
    });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.line - b.line)
    .slice(0, MAX_LITERAL_COLORS)
    .map((c) => ({ value: c.value, locator: `${fileName}:${c.line} ${c.prop}`, confidence: "low" as const, method: "declared" as const }));
}
