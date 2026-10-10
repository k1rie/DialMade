import { COLUMNS } from "./constants";
import { inferStructure } from "./infer";
import { hiddenIds, prepare } from "./prepare";
import { deriveResponsive } from "./responsive";
import { sanitizeLine } from "./sanitize";
import type { BlockId, Breakpoint, GridRect, LayoutBlock, LayoutDoc, ResponsiveLayout, Structure } from "./types";

export type AsciiOptions = {
  /** Width in characters (default 64, at most 1000). */
  width?: number;
  /** Text of each box (default `block.label`). */
  label?: (block: LayoutBlock, id: BlockId) => string;
  breakpoint?: Breakpoint;
  /** Prefixes the reading order: «1. Navbar». */
  numbered?: boolean;
  /**
   * Grid rows per text line for the vertical scale (default 4). Every box keeps ≥1 interior line. It grows
   * when the row gaps would take more than 2000 lines, so huge rects never make a huge wireframe.
   */
  rowsPerLine?: number;
  structure?: Structure;
  responsive?: ResponsiveLayout;
};

/** Most text lines a wireframe gets from row gaps: past it, the vertical scale grows (2 lines per edge stay). */
const MAX_LINES = 2000;
/** Widest wireframe, in characters. */
const MAX_WIDTH = 1000;

const MARK = /[\p{M}\p{Cf}]/u;
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const EMOJI_MODIFIER = /\p{Emoji_Modifier}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;
const ZWJ = "\u200d";
const VS16 = "\ufe0f";

/** East Asian Wide and Fullwidth ranges (an approximation of `wcwidth`): CJK, kana, Hangul, fullwidth forms. */
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

const isWide = (cp: number) => WIDE.some(([from, to]) => cp >= from && cp <= to);

/**
 * Splits text into display clusters with their width in monospace columns: a base character with its
 * combining marks, variation selectors, skin tones and tags; ZWJ emoji sequences and flag pairs as one
 * cluster. Emoji and East Asian Wide/Fullwidth characters count 2, the rest 1. An approximation that is the
 * same everywhere (no `Intl.Segmenter`, whose ICU data changes between runtimes).
 */
function clusters(text: string): { text: string; width: number }[] {
  const out: { text: string; width: number; emoji: boolean }[] = [];
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const previous = out[out.length - 1];
    if (!previous && MARK.test(ch)) continue; // A mark with nothing to attach to would merge with the border.
    const joined = previous !== undefined && previous.text.endsWith(ZWJ);
    const flagPair =
      previous !== undefined &&
      REGIONAL_INDICATOR.test(ch) &&
      REGIONAL_INDICATOR.test(previous.text) &&
      Array.from(previous.text).length === 1;
    if (previous && (joined || flagPair || MARK.test(ch) || EMOJI_MODIFIER.test(ch))) {
      previous.text += ch;
      if (ch === VS16 || EMOJI_MODIFIER.test(ch) || flagPair || (joined && PICTOGRAPHIC.test(ch))) previous.emoji = true;
      previous.width = previous.emoji ? 2 : previous.width;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    const emoji = EMOJI_PRESENTATION.test(ch);
    out.push({ text: ch, width: emoji || isWide(cp) ? 2 : 1, emoji });
  }
  return out.map(({ text: t, width }) => ({ text: t, width }));
}

/** Cuts text to `max` columns, never splitting a cluster. */
function fit(text: string, max: number): { text: string; width: number }[] {
  const out: { text: string; width: number }[] = [];
  let used = 0;
  for (const cluster of clusters(text)) {
    if (used + cluster.width > max) break;
    out.push(cluster);
    used += cluster.width;
  }
  return out;
}

/**
 * ASCII wireframe of a layout (`+`, `-`, `|`): one line per row edge, so labels never get lost. Desktop
 * uses the drawn rects; tablet and mobile use the derived ones. Hidden blocks are left out. Labels are
 * measured in monospace columns (emoji and CJK count 2, accents 0) so the box borders stay aligned.
 */
export function toAsciiWireframe(layout: LayoutDoc, options: AsciiOptions = {}): string {
  const width = Math.min(MAX_WIDTH, Math.max(8, Math.floor(options.width ?? 64) || 64));
  const bp = options.breakpoint ?? "desktop";
  const askedRowsPerLine = Math.max(1, options.rowsPerLine ?? 4) || 4;
  const labelOf = options.label ?? ((block: LayoutBlock) => block.label);
  const prepared = prepare(layout);
  const { items } = prepared;
  const structure = options.structure ?? inferStructure(layout);

  const rects = new Map<BlockId, GridRect>();
  let order: BlockId[];
  if (bp === "desktop") {
    const hidden = hiddenIds(prepared, (item) => item.block.hidden === true);
    order = structure.order.filter((id) => items.has(id) && !hidden.has(id));
    for (const id of order) rects.set(id, items.get(id)!.rect);
  } else {
    const derived = (options.responsive ?? deriveResponsive(layout, structure))[bp];
    order = derived.order.filter((id) => derived.blocks[id]?.rect);
    for (const id of order) rects.set(id, derived.blocks[id]!.rect!);
  }
  if (rects.size === 0) return "";

  const columns = COLUMNS[bp];
  const xOf = (col: number) => Math.round((col * (width - 1)) / columns);
  const edges = [...new Set([...rects.values()].flatMap((r) => [r.row, r.row + r.h]))].sort((a, b) => a - b);
  // Huge rects (or a long mobile stack) must not mean a huge canvas: past `MAX_LINES`, rows per line grow.
  const span = edges[edges.length - 1]! - edges[0]!;
  const rowsPerLine = Math.max(askedRowsPerLine, span / MAX_LINES);
  const lineOf = new Map<number, number>();
  edges.forEach((edge, k) => {
    lineOf.set(edge, k === 0 ? 0 : lineOf.get(edges[k - 1]!)! + Math.max(2, Math.round((edge - edges[k - 1]!) / rowsPerLine)));
  });
  const height = lineOf.get(edges[edges.length - 1]!)! + 1;
  // Each cell holds one display column: a wide cluster fills its cell and leaves the next one "".
  const canvas: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => " "));
  const put = (y: number, x: number, text: string) => {
    const line = canvas[y]!;
    if (line[x] === "" && x > 0) line[x - 1] = " "; // Overwriting the second half of a wide cluster.
    if (line[x + 1] === "") line[x + 1] = " "; // Overwriting a wide cluster: its second half goes too.
    line[x] = text;
  };

  const index = new Map(order.map((id, i) => [id, i]));
  const drawOrder = [...order].sort((a, b) => {
    const ia = items.get(a)!;
    const ib = items.get(b)!;
    return (
      Number(ia.inOverlay) - Number(ib.inOverlay) || ia.depth - ib.depth || ia.z - ib.z || index.get(a)! - index.get(b)!
    );
  });

  const write = (y: number, x: number, text: readonly { text: string; width: number }[]) => {
    let column = x;
    for (const cluster of text) {
      if (column + cluster.width > width) break;
      put(y, column, cluster.text);
      if (cluster.width === 2) {
        if (canvas[y]![column + 2] === "") canvas[y]![column + 2] = " ";
        canvas[y]![column + 1] = "";
      }
      column += cluster.width;
    }
  };

  for (const id of drawOrder) {
    const rect = rects.get(id)!;
    const block = items.get(id)!.block;
    const x0 = xOf(rect.col);
    const x1 = Math.max(Math.min(width - 1, x0 + 1), xOf(rect.col + rect.w));
    const y0 = lineOf.get(rect.row)!;
    const y1 = lineOf.get(rect.row + rect.h)!;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edgeY = y === y0 || y === y1;
        const edgeX = x === x0 || x === x1;
        put(y, x, edgeY && edgeX ? "+" : edgeY ? "-" : edgeX ? "|" : " ");
      }
    }
    const inner = x1 - x0 - 1;
    const pad = inner >= 3 ? 1 : 0;
    const room = inner - 2 * pad;
    const count = typeof block.count === "number" ? ` \u00d7${block.count}` : "";
    const prefix = options.numbered ? `${index.get(id)! + 1}. ` : "";
    const label = sanitizeLine(labelOf(block, id), 500);
    if (y0 + 1 < y1) write(y0 + 1, x0 + 1 + pad, fit(`${prefix}${label}${count}`, room));
    const note = sanitizeLine(block.note, 500);
    if (note && y0 + 2 < y1) write(y0 + 2, x0 + 1 + pad, fit(note, room));
  }

  return canvas.map((line) => line.join("").trimEnd()).join("\n");
}
