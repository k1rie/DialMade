import { COLUMNS } from "./constants";
import { inferStructure } from "./infer";
import { hiddenIds, prepare } from "./prepare";
import { deriveResponsive } from "./responsive";
import { sanitizeLine } from "./sanitize";
import type { BlockId, Breakpoint, GridRect, LayoutBlock, LayoutDoc, ResponsiveLayout, Structure } from "./types";

export type AsciiOptions = {
  /** Width in characters (default 64). */
  width?: number;
  /** Text of each box (default `block.label`). */
  label?: (block: LayoutBlock, id: BlockId) => string;
  breakpoint?: Breakpoint;
  /** Prefixes the reading order: «1. Navbar». */
  numbered?: boolean;
  /** Grid rows per text line for the vertical scale (default 4). Every box keeps ≥1 interior line. */
  rowsPerLine?: number;
  structure?: Structure;
  responsive?: ResponsiveLayout;
};

/** Cuts a string to `max` code points (never splits a surrogate pair). */
function fit(text: string, max: number): string {
  if (max <= 0) return "";
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max).join("");
}

/**
 * ASCII wireframe of a layout (`+`, `-`, `|`): one line per row edge, so labels never get lost. Desktop
 * uses the drawn rects; tablet and mobile use the derived ones. Hidden blocks are left out.
 */
export function toAsciiWireframe(layout: LayoutDoc, options: AsciiOptions = {}): string {
  const width = Math.max(8, Math.floor(options.width ?? 64));
  const bp = options.breakpoint ?? "desktop";
  const rowsPerLine = Math.max(1, options.rowsPerLine ?? 4);
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
  const lineOf = new Map<number, number>();
  edges.forEach((edge, k) => {
    lineOf.set(edge, k === 0 ? 0 : lineOf.get(edges[k - 1]!)! + Math.max(2, Math.round((edge - edges[k - 1]!) / rowsPerLine)));
  });
  const height = lineOf.get(edges[edges.length - 1]!)! + 1;
  const canvas: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => " "));

  const index = new Map(order.map((id, i) => [id, i]));
  const drawOrder = [...order].sort((a, b) => {
    const ia = items.get(a)!;
    const ib = items.get(b)!;
    return (
      Number(ia.inOverlay) - Number(ib.inOverlay) || ia.depth - ib.depth || ia.z - ib.z || index.get(a)! - index.get(b)!
    );
  });

  const write = (y: number, x: number, text: string) => {
    Array.from(text).forEach((ch, k) => {
      if (x + k < width) canvas[y]![x + k] = ch;
    });
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
        canvas[y]![x] = edgeY && edgeX ? "+" : edgeY ? "-" : edgeX ? "|" : " ";
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
