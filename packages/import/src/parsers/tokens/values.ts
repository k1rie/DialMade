import { normalizeColor } from "../../color";
import { isJsonObject, own, type JsonObject, type JsonValue } from "../../sanitize";
import type { Dim, DimUnit, ShadowLayerValue } from "../../types";

// DTCG 2025.10 values (and their legacy / Tokens Studio / Style Dictionary spellings) → what the core
// reads: CSS color strings, `Dim`, weights, shadow layers and type metrics. No regex runs on strings
// longer than MAX_TEXT, and every pattern is linear.

const PX_PER_REM = 16;
const MAX_TEXT = 256;

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round = (v: number, digits = 4) => Number(v.toFixed(digits));

// ── numbers and arithmetic (Tokens Studio: `{space.base} * 2`, `4*1.5px`) ────────────────────────

export interface Quantity {
  value: number;
  unit?: "px" | "rem" | "em" | "%" | "ms" | "s";
}

const NUMBER_WITH_UNIT = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|rem|em|%|ms|s)?$/i;

/** `16`, `"16px"`, `"1.5rem"`, `"-2%"` → quantity. */
export function quantityOf(value: JsonValue): Quantity | null {
  if (num(value)) return { value };
  if (typeof value !== "string" || value.length > MAX_TEXT) return null;
  const text = value.trim();
  const match = NUMBER_WITH_UNIT.exec(text);
  if (match) {
    const n = Number(match[1]);
    if (!Number.isFinite(n)) return null;
    const unit = match[2]?.toLowerCase() as Quantity["unit"];
    return unit ? { value: n, unit } : { value: n };
  }
  return evalMath(text);
}

type Tok = { kind: "num"; q: Quantity } | { kind: "op"; op: string };

function tokenize(text: string): Tok[] | null {
  const out: Tok[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if ("+-*/()".includes(ch)) {
      out.push({ kind: "op", op: ch });
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && /[0-9.]/.test(text[j]!)) j++;
    if (j === i) return null;
    const n = Number(text.slice(i, j));
    if (!Number.isFinite(n)) return null;
    let k = j;
    while (k < text.length && /[a-z%]/i.test(text[k]!)) k++;
    const unit = text.slice(j, k).toLowerCase();
    if (unit && !["px", "rem", "em", "%", "ms", "s"].includes(unit)) return null;
    out.push({ kind: "num", q: unit ? { value: n, unit: unit as Quantity["unit"] } : { value: n } });
    i = k;
  }
  return out;
}

/** `+ - * /` and parentheses over numbers with one unit (never `eval`). `calc(...)` is accepted. */
export function evalMath(input: string): Quantity | null {
  let text = input.trim();
  if (text.length === 0 || text.length > MAX_TEXT) return null;
  if (text.toLowerCase().startsWith("calc(") && text.endsWith(")")) text = text.slice(5, -1);
  const toks = tokenize(text);
  if (!toks || toks.length === 0) return null;
  let pos = 0;
  let depth = 0;
  const merge = (a: Quantity, b: Quantity, op: string): Quantity | null => {
    if (op === "+" || op === "-") {
      if (a.unit && b.unit && a.unit !== b.unit) return null;
      return { value: op === "+" ? a.value + b.value : a.value - b.value, ...((a.unit ?? b.unit) && { unit: a.unit ?? b.unit }) };
    }
    if (op === "*") {
      if (a.unit && b.unit) return null;
      return { value: a.value * b.value, ...((a.unit ?? b.unit) && { unit: a.unit ?? b.unit }) };
    }
    if (b.value === 0 || b.unit) return null;
    return { value: a.value / b.value, ...(a.unit && { unit: a.unit }) };
  };
  const factor = (): Quantity | null => {
    const t = toks[pos];
    if (!t) return null;
    if (t.kind === "op" && t.op === "-") {
      pos++;
      const inner = factor();
      return inner && { ...inner, value: -inner.value };
    }
    if (t.kind === "op" && t.op === "(") {
      if (++depth > 32) return null;
      pos++;
      const inner = sum();
      const close = toks[pos];
      if (!inner || !close || close.kind !== "op" || close.op !== ")") return null;
      pos++;
      depth--;
      return inner;
    }
    if (t.kind === "num") {
      pos++;
      return t.q;
    }
    return null;
  };
  const product = (): Quantity | null => {
    let left = factor();
    while (left) {
      const t = toks[pos];
      if (!t || t.kind !== "op" || (t.op !== "*" && t.op !== "/")) break;
      pos++;
      const right = factor();
      left = right && merge(left, right, t.op);
    }
    return left;
  };
  const sum = (): Quantity | null => {
    let left = product();
    while (left) {
      const t = toks[pos];
      if (!t || t.kind !== "op" || (t.op !== "+" && t.op !== "-")) break;
      pos++;
      const right = product();
      left = right && merge(left, right, t.op);
    }
    return left;
  };
  const result = sum();
  return result && pos === toks.length && Number.isFinite(result.value) ? { ...result, value: round(result.value, 6) } : null;
}

// ── dimensions ─────────────────────────────────────────────────────────────────────────────────

/**
 * DTCG `{ value, unit }`, `"16px"`, `"1rem"`, math, or a bare number. A bare number is px: exact for
 * Figma (its numbers are px), `assumed` otherwise.
 */
export function dimOf(value: JsonValue, options: { bareIsPx?: boolean } = {}): Dim | null {
  const q = anyQuantityOf(value);
  if (!q) return null;
  const unit = q.unit;
  if (unit === "%" || unit === "ms" || unit === "s") return null;
  if (!unit) return { value: round(q.value), unit: "px", px: round(q.value), ...(!options.bareIsPx && { assumed: true }) };
  const px = unit === "px" ? q.value : q.value * PX_PER_REM;
  return { value: round(q.value), unit: unit as DimUnit, px: round(px), ...(unit !== "px" && { assumed: true }) };
}

/** `quantityOf` that also reads DTCG `{ value, unit }` objects. */
export function anyQuantityOf(value: JsonValue): Quantity | null {
  if (!isJsonObject(value)) return quantityOf(value);
  const v = own(value, "value");
  const unit = own(value, "unit");
  if (!num(v)) return null;
  if (unit === undefined) return { value: v };
  return typeof unit === "string" ? quantityOf(`${v}${unit}`) : null;
}

// ── colors ─────────────────────────────────────────────────────────────────────────────────────

const PREDEFINED = new Set(["srgb", "srgb-linear", "display-p3", "a98-rgb", "prophoto-rgb", "rec2020", "xyz-d65", "xyz-d50"]);
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const STUDIO_RGBA = /^rgba?\(\s*(#[0-9a-f]{3,8})\s*,\s*(-?\d*\.?\d+)(%?)\s*\)$/i;

const component = (c: JsonValue): number | null => (c === "none" ? 0 : num(c) ? c : null);

function withAlpha(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex.slice(0, 7);
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${full}${byte.toString(16).padStart(2, "0")}`;
}

/** A DTCG 2025.10 color object (14 spaces, `none`, `alpha`, `hex` fallback) → CSS. */
function dtcgColor(value: JsonObject): string | null {
  const space = own(value, "colorSpace");
  const comps = own(value, "components");
  const alphaRaw = own(value, "alpha");
  const alpha = num(alphaRaw) ? Math.min(1, Math.max(0, alphaRaw)) : 1;
  const hex = own(value, "hex");
  const tail = alpha < 1 ? ` / ${round(alpha, 4)}` : "";
  if (typeof space === "string" && Array.isArray(comps) && comps.length === 3) {
    const c = comps.map(component);
    if (c.every((x): x is number => x !== null)) {
      const [a, b, d] = c as [number, number, number];
      const s = space.toLowerCase();
      if (PREDEFINED.has(s) || s === "xyz") return `color(${s === "xyz" ? "xyz-d65" : s} ${a} ${b} ${d}${tail})`;
      if (s === "hsl") return `hsl(${a} ${b}% ${d}%${tail})`;
      if (s === "hwb") return `hwb(${a} ${b}% ${d}%${tail})`;
      if (s === "lab" || s === "lch" || s === "oklab" || s === "oklch") return `${s}(${a} ${b} ${d}${tail})`;
    }
  }
  if (typeof hex === "string" && HEX_COLOR.test(hex)) return withAlpha(hex.toLowerCase(), alpha);
  return null;
}

/**
 * Any token color → a CSS color string (alpha kept): DTCG objects, `{ r, g, b, a }` (0–1 or 0–255),
 * CSS strings and Tokens Studio's `rgba(#hex, 0.5)`. `null` when it is not a color at all.
 */
export function colorToCss(value: JsonValue): string | null {
  if (typeof value === "string") {
    if (value.length > MAX_TEXT) return null;
    const text = value.trim();
    const studio = STUDIO_RGBA.exec(text);
    if (studio) {
      const a = Number(studio[2]) / (studio[3] ? 100 : 1);
      return Number.isFinite(a) ? withAlpha(studio[1]!.toLowerCase(), a) : null;
    }
    return text || null;
  }
  if (!isJsonObject(value)) return null;
  if (own(value, "colorSpace") !== undefined || own(value, "components") !== undefined) return dtcgColor(value);
  const [r, g, b, a] = (["r", "g", "b", "a"] as const).map((k) => own(value, k));
  if (num(r) && num(g) && num(b)) {
    const alpha = num(a) ? Math.min(1, Math.max(0, a)) : 1;
    const tail = alpha < 1 ? ` / ${round(alpha, 4)}` : "";
    return r <= 1 && g <= 1 && b <= 1 ? `color(srgb ${r} ${g} ${b}${tail})` : `rgb(${r} ${g} ${b}${tail})`;
  }
  const hex = own(value, "hex");
  return typeof hex === "string" && HEX_COLOR.test(hex) ? hex.toLowerCase() : null;
}

/** A color with its alpha multiplied (Tokens Studio's `modify: { type: "alpha" }`). */
export function scaleAlpha(value: JsonValue, factor: number): string | null {
  const css = colorToCss(value);
  const parsed = css === null ? null : normalizeColor(css);
  if (!parsed?.ok || !Number.isFinite(factor)) return null;
  return withAlpha(parsed.color.hex, (parsed.color.alpha ?? 1) * Math.min(1, Math.max(0, factor)));
}

/** A string or number made from a resolved value, for references inside text (`rgba({c.red}, .5)`). */
export function valueToText(value: JsonValue): string | null {
  if (typeof value === "string") return value;
  if (num(value)) return String(value);
  if (!isJsonObject(value)) return null;
  const v = own(value, "value");
  const unit = own(value, "unit");
  if (num(v) && typeof unit === "string") return `${v}${unit}`;
  const color = colorToCss(value);
  if (!color) return null;
  const parsed = normalizeColor(color);
  return parsed.ok ? withAlpha(parsed.color.hex, parsed.color.alpha ?? 1) : null;
}

// ── fonts ──────────────────────────────────────────────────────────────────────────────────────

const WEIGHT_NAMES: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
  extrablack: 950,
  ultrablack: 950,
};

/** `700`, `"700"`, `"semi-bold"`, `"Semi Bold Italic"` → 1–1000. */
export function fontWeightOf(value: JsonValue): number | null {
  if (num(value)) return value >= 1 && value <= 1000 ? Math.round(value) : null;
  if (typeof value !== "string" || value.length > 64) return null;
  const text = value.trim().toLowerCase();
  if (/^\d{1,4}$/.test(text)) return fontWeightOf(Number(text));
  const key = text.replace(/italic|oblique/g, "").replace(/[\s_-]+/g, "");
  return WEIGHT_NAMES[key] ?? null;
}

/** A `fontFamily` value: a CSS stack string or its entries. */
export function fontStackOf(value: JsonValue): string | string[] | null {
  if (typeof value === "string") return value.trim() && value.length <= 2000 ? value.trim() : null;
  if (!Array.isArray(value)) return null;
  const entries = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 24);
  return entries.length > 0 ? entries.map((e) => e.trim()) : null;
}

/** First family of a stack (for `TypeStyle.family`). */
export function firstFamily(stack: string | string[]): string | undefined {
  const first = (Array.isArray(stack) ? stack[0] : stack.split(",")[0])?.trim().replace(/^["']|["']$/g, "");
  return first || undefined;
}

// ── shadows ────────────────────────────────────────────────────────────────────────────────────

/** Splits on commas outside parentheses (CSS shadow lists, legacy strings). Linear. */
function splitTopLevel(text: string, separator: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === separator && depth === 0) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

function splitSpaces(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === " " || ch === "\t") && depth === 0) {
      if (current) out.push(current);
      current = "";
    } else current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** `0 1px 2px rgb(0 0 0 / 0.05), inset 0 0 0 1px #000` → layers. */
function cssShadowLayers(text: string): ShadowLayerValue[] | null {
  if (text.length > 2000) return null;
  if (text.trim().toLowerCase() === "none") return [];
  const layers: ShadowLayerValue[] = [];
  for (const part of splitTopLevel(text, ",").slice(0, 8)) {
    let inset = false;
    let color: string | undefined;
    const lengths: number[] = [];
    for (const word of splitSpaces(part)) {
      if (word.toLowerCase() === "inset") inset = true;
      else {
        const d = dimOf(word, { bareIsPx: true });
        if (d && lengths.length < 4) lengths.push(d.px);
        else if (!color) color = word;
        else return null;
      }
    }
    if (lengths.length < 2) return null;
    const [x, y, blur = 0, spread = 0] = lengths as [number, number, number?, number?];
    layers.push({ x, y, blur, spread, color: color ?? "#000000", alpha: 1, ...(inset && { inset: true }) });
  }
  return layers;
}

function objectShadowLayer(layer: JsonObject): ShadowLayerValue | null {
  const pick = (...keys: string[]) => keys.map((k) => own(layer, k)).find((v) => v !== undefined) ?? 0;
  const px = (v: JsonValue) => dimOf(v, { bareIsPx: true })?.px;
  const [x, y, blur, spread] = [pick("offsetX", "x"), pick("offsetY", "y"), pick("blur"), pick("spread")].map(px);
  const colorRaw = own(layer, "color");
  const color = colorRaw === undefined ? "#000000" : colorToCss(colorRaw);
  if (x === undefined || y === undefined || blur === undefined || spread === undefined || !color) return null;
  const inset = own(layer, "inset") === true || own(layer, "type") === "innerShadow";
  return { x, y, blur, spread, color, alpha: 1, ...(inset && { inset: true }) };
}

/**
 * DTCG shadow (object or array), Tokens Studio boxShadow (`x`, `y`, `type`) or a CSS string → layers.
 * Fully transparent layers are dropped; a shadow made only of them is `[]` (an explicit «none»).
 */
export function shadowLayersOf(value: JsonValue): ShadowLayerValue[] | null {
  let layers: ShadowLayerValue[] | null;
  if (typeof value === "string") layers = cssShadowLayers(value);
  else if (Array.isArray(value)) {
    const list = value.slice(0, 8).map((l) => (isJsonObject(l) ? objectShadowLayer(l) : null));
    layers = list.every((l): l is ShadowLayerValue => l !== null) ? list : null;
  } else if (isJsonObject(value)) {
    const one = objectShadowLayer(value);
    layers = one && [one];
  } else layers = null;
  if (!layers) return null;
  return layers.filter((l) => {
    const parsed = normalizeColor(l.color);
    return parsed.ok || parsed.problem !== "transparent";
  });
}

// ── typography ─────────────────────────────────────────────────────────────────────────────────

export interface TypeMetrics {
  stack?: string | string[];
  fontSize?: Dim;
  lineHeight?: number;
  letterSpacing?: number;
  weight?: number;
}

/** Unitless line height: `1.2`, `"150%"`, or a length divided by the font size. */
export function lineHeightOf(value: JsonValue, fontPx?: number): number | undefined {
  const q = anyQuantityOf(value);
  if (!q || q.value <= 0) return undefined;
  if (q.unit === "%") return round(q.value / 100);
  if (q.unit === "em") return round(q.value);
  if (!q.unit) return q.value <= 3 ? round(q.value) : fontPx ? round(q.value / fontPx) : undefined;
  if (q.unit !== "px" && q.unit !== "rem") return undefined;
  const px = q.unit === "rem" ? q.value * PX_PER_REM : q.value;
  return fontPx ? round(px / fontPx) : undefined;
}

/** Letter spacing in em: `"-0.02em"`, `"-2%"`, or px divided by the font size. */
export function letterSpacingOf(value: JsonValue, fontPx?: number): number | undefined {
  const q = anyQuantityOf(value);
  if (!q) return undefined;
  if (q.unit === "em") return round(q.value);
  if (q.unit === "%") return round(q.value / 100);
  if (q.value === 0) return 0;
  if (!fontPx || (q.unit && q.unit !== "px" && q.unit !== "rem")) return undefined;
  const px = q.unit === "rem" ? q.value * PX_PER_REM : q.value;
  return round(px / fontPx);
}

/** DTCG / Tokens Studio / DESIGN.md typography object → metrics. */
export function typographyOf(value: JsonValue): TypeMetrics | null {
  if (!isJsonObject(value)) return null;
  const get = (...keys: string[]) => keys.map((k) => own(value, k)).find((v) => v !== undefined);
  const out: TypeMetrics = {};
  const family = get("fontFamily", "fontFamilies", "font-family");
  const stack = family === undefined ? null : fontStackOf(family);
  if (stack) out.stack = stack;
  const sizeRaw = get("fontSize", "fontSizes", "font-size");
  const size = sizeRaw === undefined ? null : dimOf(sizeRaw, { bareIsPx: true });
  if (size) out.fontSize = size;
  const weightRaw = get("fontWeight", "fontWeights", "font-weight");
  const weight = weightRaw === undefined ? null : fontWeightOf(weightRaw);
  if (weight) out.weight = weight;
  const lh = get("lineHeight", "lineHeights", "line-height");
  const lineHeight = lh === undefined ? undefined : lineHeightOf(lh, size?.px);
  if (lineHeight !== undefined) out.lineHeight = lineHeight;
  const ls = get("letterSpacing", "letter-spacing", "tracking");
  const letterSpacing = ls === undefined ? undefined : letterSpacingOf(ls, size?.px);
  if (letterSpacing !== undefined) out.letterSpacing = letterSpacing;
  return Object.keys(out).length > 0 ? out : null;
}
