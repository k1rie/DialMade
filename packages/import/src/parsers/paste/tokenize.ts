import { parseColorWithAlpha } from "@dialmade/palette";

/** A color found in a line: its CSS text and where it sits (for labels before or after it). */
export interface ColorToken {
  value: string;
  start: number;
  end: number;
}

/** Something that looks like a color but is not evaluated (`var()`, `color-mix()`, `rgb(var(--x))`). */
export interface UnevaluatedToken {
  text: string;
  start: number;
  end: number;
}

export interface Segment {
  text: string;
  /** Offset of the segment in its line. */
  offset: number;
}

const COLOR_FUNCTIONS = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/;
const UNEVALUATED_FUNCTIONS = /^(?:var|color-mix|light-dark|env)$/;
/** culori reads `bad` or `600` as hex without `#`: bare hex words are never colors here. */
const BARE_HEX = /^[0-9a-f]+$/i;
const HEX_LENGTHS = new Set([3, 4, 6, 8]);
const MAX_FUNCTION = 300;

const isWordChar = (ch: string | undefined) => ch !== undefined && /[0-9A-Za-z_-]/.test(ch);

export const isColorValue = (text: string): boolean => {
  const v = text.trim();
  return v.length > 0 && v.length <= MAX_FUNCTION && !BARE_HEX.test(v) && parseColorWithAlpha(v) !== null;
};

/** End (exclusive) of the parenthesized group opening at `open`, or -1. */
function closeParen(line: string, open: number): number {
  let depth = 0;
  const end = Math.min(line.length, open + MAX_FUNCTION);
  for (let i = open; i < end; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")" && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * Hex (`#rgb`, `#rrggbb`, `#rrggbbaa`) and color functions (`rgb()`, `hsl()`, `oklch()`, `lab()`,
 * `color()`…) in a line, left to right, in one pass. Named colors are not scanned here: a word such as
 * «red» or «navy» only counts as the whole value of a labeled line (see `namedValue`).
 */
export function scanColors(line: string): { colors: ColorToken[]; unevaluated: UnevaluatedToken[] } {
  const colors: ColorToken[] = [];
  const unevaluated: UnevaluatedToken[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (ch === "#" && !isWordChar(line[i - 1]) && line[i - 1] !== "&") {
      let j = i + 1;
      while (j < line.length && j - i <= 9 && /[0-9a-fA-F]/.test(line[j]!)) j++;
      const length = j - i - 1;
      if (HEX_LENGTHS.has(length) && !isWordChar(line[j])) {
        colors.push({ value: line.slice(i, j).toLowerCase(), start: i, end: j });
        i = j;
        continue;
      }
      i = j > i + 1 ? j : i + 1;
      continue;
    }
    if (/[A-Za-z-]/.test(ch) && !isWordChar(line[i - 1])) {
      let j = i;
      while (j < line.length && /[A-Za-z-]/.test(line[j]!)) j++;
      const name = line.slice(i, j).toLowerCase();
      if (line[j] === "(" && (COLOR_FUNCTIONS.test(name) || UNEVALUATED_FUNCTIONS.test(name))) {
        const end = closeParen(line, j);
        if (end > 0) {
          const text = line.slice(i, end);
          if (COLOR_FUNCTIONS.test(name) && !/\bvar\(|\bfrom\s/i.test(text) && isColorValue(text)) colors.push({ value: text, start: i, end });
          else unevaluated.push({ text, start: i, end });
          i = end;
          continue;
        }
      }
      i = j;
      continue;
    }
    i++;
  }
  return { colors, unevaluated };
}

/** Splits a line on top-level `,` `;` `|` and tabs (commas inside `rgb(…)` or quotes stay). */
export function splitSegments(line: string): Segment[] {
  const out: Segment[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === "," || ch === ";" || ch === "|" || ch === "\t")) {
      out.push({ text: line.slice(start, i), offset: start });
      start = i + 1;
    }
  }
  out.push({ text: line.slice(start), offset: start });
  return out.filter((s) => s.text.trim().length > 0);
}

/**
 * A label as written around a color (`Primary`, `--brand`, `$brand-primary`, `Fondo oscuro`), without
 * bullets, quotes and separators; `undefined` when it reads like prose (more than 5 words or 48 characters).
 */
export function cleanLabel(raw: string): string | undefined {
  if (raw.length > 200) return undefined;
  let text = raw.replace(/^\s*(?:[-*•·>]+|\d{1,3}[.)]|#{1,6})\s+/, "").trim();
  text = text.replace(/^["'`]+|["'`]+$/g, "").trim();
  text = text.replace(/\s*[:=]\s*["'`]?\s*$/, "").replace(/^\s*["'`]?\s*[:=]\s*/, "");
  text = text.replace(/[\s,;:=–—"'`()[\]{}]+$/, "").replace(/^[\s,;:=–—"'`()[\]{}]+/, "");
  text = text.replace(/\s+-+$/, "").replace(/\s+/g, " ").trim();
  if (!text || text.length > 48 || text.split(" ").length > 5) return undefined;
  if (!/[\p{L}]/u.test(text)) return undefined;
  return text;
}

/** The value of `label: value` / `label = value`, or the whole segment, as a named color (`white`, `rebeccapurple`). */
export function namedValue(segment: string): { value: string; label?: string } | null {
  const sep = /[:=]/.exec(segment);
  const value = (sep ? segment.slice(sep.index + 1) : segment).trim().replace(/^["'`]|["'`]?[;,]?$/g, "").replace(/["'`]$/, "").trim();
  const label = sep ? cleanLabel(segment.slice(0, sep.index)) : undefined;
  if (!/^[a-z]+$/i.test(value)) {
    const quoted = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
    return sep && quoted && /["'`]/.test(segment.slice(sep.index + 1)) ? { value: `#${quoted[1]!.toLowerCase()}`, ...(label && { label }) } : null;
  }
  const lower = value.toLowerCase();
  if (lower === "transparent" || lower === "currentcolor") return sep ? { value: lower, ...(label && { label }) } : null;
  return isColorValue(lower) ? { value: lower, ...(label && { label }) } : null;
}
