import { parseColorWithAlpha } from "@dialmade/palette";
import valueParser from "postcss-value-parser";
import type { Dim, DimUnit, ShadowLayerValue } from "../../types";

export type ValueResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(value: T): ValueResult<T> => ({ ok: true, value });
const fail = <T>(reason: string): ValueResult<T> => ({ ok: false, reason });

const REM_PX = 16;
const MAX_TOKENS = 256;

/** Legacy shadcn channels: `222.2 84% 4.9%` (optionally `/ 0.5`). */
const HSL_CHANNELS = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:deg)?\s+(?:\d+(?:\.\d*)?|\.\d+)%\s+(?:\d+(?:\.\d*)?|\.\d+)%(?:\s*\/\s*(?:\d+(?:\.\d*)?|\.\d+)%?)?$/;

export const isHslChannels = (value: string): boolean => value.length <= 200 && HSL_CHANNELS.test(value.trim());

/** `222.2 84% 4.9%` → `hsl(222.2 84% 4.9%)`; any other value unchanged. */
export const wrapHslChannels = (value: string): string => (isHslChannels(value) ? `hsl(${value.trim()})` : value);

const NON_COLOR_KEYWORDS = new Set(["transparent", "currentcolor", "inherit", "initial", "unset", "revert", "revert-layer"]);

export const isNonColorKeyword = (value: string): boolean => NON_COLOR_KEYWORDS.has(value.trim().toLowerCase());

/** culori also reads `600` or `fade` as hex without `#`: a bare hex word is never taken as a color here. */
const BARE_HEX = /^[0-9a-f]+$/i;

export const isColor = (value: string): boolean => {
  const v = value.trim();
  return v.length > 0 && v.length <= 256 && !BARE_HEX.test(v) && parseColorWithAlpha(v) !== null;
};

/** `color-mix()`, `light-dark()` or a relative color (`oklch(from var(--x) l c h)`): a color the importer does not evaluate. */
export function unevaluatedColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  const fn = /^([a-z-]+)\(/.exec(v)?.[1];
  if (fn === "color-mix" || fn === "light-dark") return `${fn}()`;
  if (fn && /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/.test(fn)) {
    if (/^[a-z-]+\(\s*from\s/.test(v)) return "relative color";
    if (v.includes("calc(")) return "calc() inside a color";
  }
  return null;
}

// ── calc() and dimensions ─────────────────────────────────────────────────────────

interface Quantity {
  /** px for lengths, the number itself for plain numbers. */
  n: number;
  length: boolean;
}

type Token = { t: "num"; n: number; unit: string } | { t: "op"; v: string } | { t: "(" } | { t: ")" };

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i;

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    if (tokens.length > MAX_TOKENS) return null;
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ t: ch });
      i++;
      continue;
    }
    const prev = tokens[tokens.length - 1];
    const signAllowed = !prev || prev.t === "op" || prev.t === "(";
    if ((ch === "+" || ch === "-") && !(signAllowed && /[\d.]/.test(text[i + 1] ?? ""))) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (ch === "*" || ch === "/") {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    const lower = text.slice(i).toLowerCase();
    if (lower.startsWith("calc(")) {
      tokens.push({ t: "(" });
      i += 5;
      continue;
    }
    const num = NUMBER.exec(text.slice(i, i + 40));
    if (!num) return null;
    i += num[0].length;
    const unit = /^[a-z%]+/i.exec(text.slice(i, i + 8))?.[0]?.toLowerCase() ?? "";
    i += unit.length;
    tokens.push({ t: "num", n: Number(num[0]), unit });
  }
  return tokens;
}

/** Recursive descent over `+ - * /` with parentheses; lengths in px (rem/em at 16 px). */
function evaluate(tokens: Token[], units: Set<string>): Quantity | null {
  let pos = 0;
  const peek = () => tokens[pos];
  function primary(depth: number): Quantity | null {
    if (depth > 32) return null;
    const tok = tokens[pos++];
    if (!tok) return null;
    if (tok.t === "(") {
      const inner = sum(depth + 1);
      return tokens[pos++]?.t === ")" ? inner : null;
    }
    if (tok.t === "op" && tok.v === "-") {
      const inner = primary(depth + 1);
      return inner && { ...inner, n: -inner.n };
    }
    if (tok.t !== "num") return null;
    if (tok.unit === "") return { n: tok.n, length: false };
    if (tok.unit === "px") {
      units.add("px");
      return { n: tok.n, length: true };
    }
    if (tok.unit === "rem" || tok.unit === "em") {
      units.add(tok.unit);
      return { n: tok.n * REM_PX, length: true };
    }
    units.add(tok.unit);
    return null;
  }
  function product(depth: number): Quantity | null {
    let left = primary(depth);
    while (left) {
      const op = peek();
      if (op?.t !== "op" || (op.v !== "*" && op.v !== "/")) break;
      pos++;
      const right = primary(depth);
      if (!right) return null;
      if (op.v === "*") {
        if (left.length && right.length) return null;
        left = { n: left.n * right.n, length: left.length || right.length };
      } else {
        if (right.length || right.n === 0) return null;
        left = { n: left.n / right.n, length: left.length };
      }
    }
    return left;
  }
  function sum(depth: number): Quantity | null {
    let left = product(depth);
    while (left) {
      const op = peek();
      if (op?.t !== "op" || (op.v !== "+" && op.v !== "-")) break;
      pos++;
      const right = product(depth);
      if (!right || right.length !== left.length) return null;
      left = { n: op.v === "+" ? left.n + right.n : left.n - right.n, length: left.length };
    }
    return left;
  }
  const result = sum(0);
  return result && pos === tokens.length && Number.isFinite(result.n) ? result : null;
}

const round = (n: number, digits = 4) => Math.round(n * 10 ** digits) / 10 ** digits;

/** A plain number (`1.5`, `calc(1 / 0.75)`), or null. */
export function parseNumber(value: string): number | null {
  const tokens = tokenize(value.trim());
  if (!tokens || tokens.length === 0) return null;
  const units = new Set<string>();
  const q = evaluate(tokens, units);
  return q && !q.length && units.size === 0 ? round(q.n) : null;
}

/**
 * A length: `0.625rem`, `10px`, `0`, `calc(var-resolved - 4px)`. rem and em assume 16 px (`assumed`).
 * One unit keeps it (`0.5rem` → 0.5 rem); mixed units give px.
 */
export function parseDim(value: string): ValueResult<Dim> {
  const v = value.trim().toLowerCase();
  if (!v) return fail("empty value");
  if (/^calc\(\s*infinity\s*\*\s*1px\s*\)$/.test(v)) return ok({ value: 9999, unit: "px", px: 9999 });
  const fn = /^([a-z-]+)\(/.exec(v)?.[1];
  if (fn && fn !== "calc") return fail(`${fn}() is not evaluated`);
  const tokens = tokenize(v);
  if (!tokens || tokens.length === 0) return fail("not a length");
  const units = new Set<string>();
  const q = evaluate(tokens, units);
  const unsupported = [...units].find((u) => u !== "px" && u !== "rem" && u !== "em");
  if (unsupported) return fail(`unit ${unsupported} is not supported`);
  if (!q) return fail(v.startsWith("calc(") ? "calc() could not be evaluated" : "not a length");
  if (!q.length && q.n !== 0) return fail("not a length");
  const px = round(q.n, 3);
  const assumed = units.has("rem") || units.has("em");
  const only = units.size === 1 ? ([...units][0] as DimUnit) : undefined;
  if (only === "rem" || only === "em") return ok({ value: round(px / REM_PX), unit: only, px, assumed: true });
  return ok({ value: px, unit: "px", px, ...(assumed && { assumed: true }) });
}

/** `clamp(min, preferred, max)` → its max (the desktop size, as the DesignDoc stores it). */
export function clampMax(value: string): string | null {
  const v = value.trim();
  if (!/^clamp\(/i.test(v)) return null;
  const nodes = valueParser(v).nodes[0];
  if (nodes?.type !== "function") return null;
  const args: string[] = [];
  let current: valueParser.Node[] = [];
  for (const node of nodes.nodes) {
    if (node.type === "div" && node.value === ",") {
      args.push(valueParser.stringify(current));
      current = [];
    } else current.push(node);
  }
  args.push(valueParser.stringify(current));
  return args.length === 3 ? args[2]!.trim() : null;
}

/** Line height → unitless: `1.1`, `110%`, `2.75rem` over a 40 px font → 1.1. */
export function parseLineHeight(value: string, fontPx?: number): number | null {
  const v = value.trim().toLowerCase();
  if (v === "normal") return null;
  if (v.endsWith("%")) {
    const n = Number(v.slice(0, -1));
    return Number.isFinite(n) ? round(n / 100, 3) : null;
  }
  const plain = parseNumber(v);
  if (plain !== null) return round(plain, 3);
  const dim = parseDim(v);
  return dim.ok && fontPx && fontPx > 0 ? round(dim.value.px / fontPx, 3) : null;
}

/** Letter spacing → em: `-0.02em`, `0`, `normal`, `-1px` over a 40 px font → -0.025. */
export function parseLetterSpacing(value: string, fontPx?: number): number | null {
  const v = value.trim().toLowerCase();
  if (v === "normal") return 0;
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)em$/.test(v)) return round(Number(v.slice(0, -2)), 4);
  const dim = parseDim(v);
  if (!dim.ok) return null;
  if (dim.value.px === 0) return 0;
  return fontPx && fontPx > 0 ? round(dim.value.px / fontPx, 4) : null;
}

export function parseWeight(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (v === "normal") return 400;
  if (v === "bold") return 700;
  const n = parseNumber(v);
  return n !== null && n >= 1 && n <= 1000 ? Math.round(n) : null;
}

// ── shadows ───────────────────────────────────────────────────────────────────────

/** `0 1px 3px 0 rgb(0 0 0 / 0.1), inset 0 1px 0 0 #fff` → layers (color as CSS, alpha 1: the core multiplies). */
export function parseShadow(value: string): ValueResult<ShadowLayerValue[]> {
  const v = value.trim();
  if (/^none$/i.test(v)) return ok([]);
  const root = valueParser(v);
  const layers: valueParser.Node[][] = [[]];
  for (const node of root.nodes) {
    if (node.type === "div" && node.value === ",") layers.push([]);
    else if (node.type !== "space" && node.type !== "comment") layers[layers.length - 1]!.push(node);
  }
  if (layers.length > 8) return fail("too many shadow layers");
  const out: ShadowLayerValue[] = [];
  for (const nodes of layers) {
    if (nodes.length === 0) return fail("empty shadow layer");
    let inset = false;
    let color: string | undefined;
    const lengths: number[] = [];
    for (const node of nodes) {
      const text = valueParser.stringify(node);
      if (node.type === "word" && text.toLowerCase() === "inset") inset = true;
      else if (node.type === "function" && node.value.toLowerCase() === "calc") {
        const dim = parseDim(text);
        if (!dim.ok) return fail(dim.reason);
        lengths.push(dim.value.px);
      } else if (node.type === "word" && NUMBER.test(text) && !text.startsWith("#")) {
        const dim = parseDim(text);
        if (!dim.ok) return fail(dim.reason);
        lengths.push(dim.value.px);
      } else if (color === undefined && (isColor(text) || isNonColorKeyword(text))) color = text;
      else return fail(`unexpected ${text.slice(0, 40)} in a shadow`);
    }
    if (lengths.length < 2 || lengths.length > 4) return fail("a shadow needs 2 to 4 lengths");
    const [x, y, blur = 0, spread = 0] = lengths as [number, number, number?, number?];
    if (blur < 0) return fail("negative blur");
    const resolved = color === undefined || color.toLowerCase() === "currentcolor" ? "#000000" : color;
    if (resolved.toLowerCase() === "transparent") continue;
    out.push({ x, y, blur, spread, color: resolved, alpha: 1, ...(inset && { inset: true }) });
  }
  return ok(out);
}
