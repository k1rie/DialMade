import { DESKTOP_COLUMNS, TAU } from "./constants";
import {
  area,
  bottom,
  boundingBox,
  clamp,
  clipRect,
  compareByPosition,
  intersection,
  leavesOut,
  right,
} from "./geometry";
import { compareStrings, regionId } from "./ids";
import { prepare, type Item } from "./prepare";
import type {
  BlockNode,
  Frame,
  GridNode,
  GridRect,
  LayoutDoc,
  LayoutFix,
  LayoutWarning,
  LayoutWarningCode,
  Placement,
  RowNode,
  StackNode,
  Structure,
  StructureNode,
} from "./types";

export type InferOptions = {
  /** Cut tolerance in grid units (default `TAU` = 1). */
  tolerance?: number;
};

const WARNING_ORDER: readonly LayoutWarningCode[] = [
  "overlap",
  "implicit-containment",
  "outside-parent",
  "missing-parent",
  "cycle",
  "not-accepted",
  "out-of-bounds",
  "invalid-rect",
  "too-many-blocks",
];

/** Overlaps below this share of the smaller block can be clipped. */
export const CLIP_RATIO = 0.15;
/** A container covering at least this share of a sibling reads as an implicit parent. */
export const CONTAINMENT_RATIO = 0.9;

const AREA_NAME_RE = /^[A-Za-z_][\w-]*$/;
/**
 * Words that cannot be a grid area name in `grid-area` (any case): the CSS-wide keywords, `default` (never a
 * `<custom-ident>`), the grid-line keywords `auto` and `span`, and `none`.
 */
const RESERVED_AREA_NAMES: ReadonlySet<string> = new Set([
  "auto",
  "span",
  "none",
  "default",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

/**
 * `grid-template-areas` / `grid-area` name of a block: its id when it is a CSS ident that is not a reserved
 * word, else `a-` + id (`auto` → `a-auto`, `9lives` → `a-9lives`).
 */
export function areaName(id: string): string {
  return AREA_NAME_RE.test(id) && !RESERVED_AREA_NAMES.has(id.toLowerCase()) ? id : `a-${id}`;
}

type Axis = "row" | "col";

const startOf = (r: GridRect, axis: Axis) => (axis === "row" ? r.row : r.col);
const sizeOf = (r: GridRect, axis: Axis) => (axis === "row" ? r.h : r.w);
const endOf = (r: GridRect, axis: Axis) => startOf(r, axis) + sizeOf(r, axis);

function byColumn(a: Item, b: Item): number {
  return a.rect.col - b.rect.col || a.rect.row - b.rect.row || a.z - b.z || compareStrings(a.id, b.id);
}

/**
 * Splits items along an axis (one sweep with the running end). A cut also happens with a small overlap:
 * ≤ τ units and less than half of the smaller of the two blocks involved, and only when the next group
 * starts after the current one. Items that would break that rule merge the groups back.
 */
function sweep(items: readonly Item[], axis: Axis, tau: number): Item[][] {
  const sorted = axis === "row" ? items : [...items].sort(byColumn);
  const groups: Item[][] = [];
  let current: Item[] = [];
  let currentStart = 0;
  let currentEnd = -Infinity;

  const toleranceCut = (group: readonly Item[], next: Item): boolean => {
    const s = startOf(next.rect, axis);
    for (const g of group) {
      const overlap = endOf(g.rect, axis) - s;
      if (overlap <= 0) continue;
      if (overlap > tau || overlap >= Math.min(sizeOf(g.rect, axis), sizeOf(next.rect, axis)) / 2) return false;
    }
    return true;
  };

  for (const item of sorted) {
    const s = startOf(item.rect, axis);
    const e = endOf(item.rect, axis);
    if (current.length === 0) {
      current = [item];
      currentStart = s;
      currentEnd = e;
      continue;
    }
    if (s >= currentEnd || (s > currentStart && toleranceCut(current, item))) {
      groups.push(current);
      current = [item];
      currentStart = s;
      currentEnd = e;
      continue;
    }
    const previous = groups.at(-1);
    if (previous) {
      const previousEnd = Math.max(...previous.map((g) => endOf(g.rect, axis)));
      if (s < previousEnd && !toleranceCut(previous, item)) {
        groups.pop();
        current = [...previous, ...current];
        currentStart = Math.min(...current.map((g) => startOf(g.rect, axis)));
        currentEnd = Math.max(currentEnd, previousEnd);
      }
    }
    current.push(item);
    currentEnd = Math.max(currentEnd, e);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** start/span of a column band inside a frame (clamped to it, span ≥ 1). */
function placeInFrame(col: number, end: number, frame: Frame): { start: number; span: number } {
  const start = clamp(col - frame.col, 0, frame.w - 1);
  const last = clamp(end - frame.col, start + 1, frame.w);
  return { start, span: last - start };
}

type Ctx = { tau: number; blockNode: (item: Item) => BlockNode };

function regionRect(items: readonly Item[], frame: Frame, isRoot: boolean): GridRect {
  const box = boundingBox(items.map((i) => i.rect));
  return isRoot ? { col: frame.col, row: box.row, w: frame.w, h: box.h } : box;
}

function cut(input: readonly Item[], frame: Frame, ctx: Ctx, isRoot: boolean): StructureNode | null {
  if (input.length === 0) return null;
  const items = [...input].sort(compareByPosition);
  if (items.length === 1) return ctx.blockNode(items[0]!);
  const rows = sweep(items, "row", ctx.tau);
  if (rows.length > 1) return stackNode(items, rows, frame, ctx, isRoot);
  const cols = sweep(items, "col", ctx.tau);
  if (cols.length > 1) return rowNode(items, cols, frame, ctx, isRoot);
  return gridNode(items, frame, ctx, isRoot);
}

function stackNode(items: Item[], groups: Item[][], frame: Frame, ctx: Ctx, isRoot: boolean): StackNode {
  const children: Placement[] = [];
  const gaps: number[] = [];
  let previousBottom = 0;
  groups.forEach((group, i) => {
    const box = boundingBox(group.map((g) => g.rect));
    if (group.length === 1) {
      const only = group[0]!;
      children.push({ node: ctx.blockNode(only), ...placeInFrame(only.rect.col, right(only.rect), frame) });
    } else {
      children.push({ node: cut(group, frame, ctx, false)!, start: 0, span: frame.w });
    }
    if (i > 0) gaps.push(Math.max(0, box.row - previousBottom));
    previousBottom = bottom(box);
  });
  return {
    kind: "stack",
    id: regionId(
      items.map((i) => i.id),
      "stack",
    ),
    rect: regionRect(items, frame, isRoot),
    frame,
    children,
    gaps,
  };
}

function rowNode(items: Item[], groups: Item[][], frame: Frame, ctx: Ctx, isRoot: boolean): RowNode {
  const starts = groups.map((group) => Math.min(...group.map((g) => g.rect.col)));
  const children: Placement[] = groups.map((group, i) => {
    let end = Math.max(...group.map((g) => right(g.rect)));
    // On a tolerance cut, bands never overlap: the left band ends where the next one starts.
    if (i < groups.length - 1) end = Math.min(end, starts[i + 1]!);
    const { start, span } = placeInFrame(starts[i]!, end, frame);
    const node =
      group.length === 1 ? ctx.blockNode(group[0]!) : cut(group, { col: frame.col + start, w: span }, ctx, false)!;
    return { node, start, span };
  });
  return {
    kind: "row",
    id: regionId(
      items.map((i) => i.id),
      "row",
    ),
    rect: regionRect(items, frame, isRoot),
    frame,
    children,
  };
}

function gridNode(items: Item[], frame: Frame, ctx: Ctx, isRoot: boolean): GridNode {
  const frameEnd = frame.col + frame.w;
  const clampCol = (c: number) => clamp(c, frame.col, frameEnd);
  const colEdges = [
    ...new Set([frame.col, frameEnd, ...items.flatMap((i) => [clampCol(i.rect.col), clampCol(right(i.rect))])]),
  ].sort((a, b) => a - b);
  const rowEdges = [...new Set(items.flatMap((i) => [i.rect.row, bottom(i.rect)]))].sort((a, b) => a - b);
  const columns = colEdges.slice(1).map((edge, k) => edge - colEdges[k]!);
  const rows = rowEdges.slice(1).map((edge, k) => edge - rowEdges[k]!);

  const placed = items.map((item) => {
    const colStart = colEdges.indexOf(clampCol(item.rect.col)) + 1;
    const colEnd = Math.max(colStart + 1, colEdges.indexOf(clampCol(right(item.rect))) + 1);
    const rowStart = rowEdges.indexOf(item.rect.row) + 1;
    const rowEnd = rowEdges.indexOf(bottom(item.rect)) + 1;
    return { item, colStart: Math.min(colStart, colEdges.length - 1), colEnd: Math.min(colEnd, colEdges.length), rowStart, rowEnd };
  });
  placed.sort((a, b) => a.rowStart - b.rowStart || a.colStart - b.colStart || compareByPosition(a.item, b.item));

  // Areas: one name per cell; overlapping items (or names that are not CSS idents) only allow line placement.
  let areas: string[] | null = null;
  const names = placed.map((p) => areaName(p.item.id));
  if (names.every((name) => AREA_NAME_RE.test(name)) && new Set(names).size === names.length) {
    const cells: string[][] = rows.map(() => columns.map(() => "."));
    let overlapping = false;
    placed.forEach((p, k) => {
      for (let r = p.rowStart - 1; r < p.rowEnd - 1; r++) {
        for (let c = p.colStart - 1; c < p.colEnd - 1; c++) {
          if (cells[r]![c] !== ".") overlapping = true;
          cells[r]![c] = names[k]!;
        }
      }
    });
    if (!overlapping) areas = cells.map((line) => line.join(" "));
  }

  return {
    kind: "grid",
    id: regionId(
      items.map((i) => i.id),
      "grid",
    ),
    rect: regionRect(items, frame, isRoot),
    frame,
    columns,
    rows,
    items: placed.map((p) => ({
      node: ctx.blockNode(p.item),
      colStart: p.colStart,
      colEnd: p.colEnd,
      rowStart: p.rowStart,
      rowEnd: p.rowEnd,
    })),
    areas,
  };
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** The lower of two overlapping blocks: greater row, then greater z, then the later id. */
function lowerOf(a: Item, b: Item): [lower: Item, upper: Item] {
  const aLower = a.rect.row !== b.rect.row ? a.rect.row > b.rect.row : a.z !== b.z ? a.z > b.z : a.id > b.id;
  return aLower ? [a, b] : [b, a];
}

/** Every descendant rect of an item (effective children, recursively). */
function descendantRects(item: Item): GridRect[] {
  const out: GridRect[] = [];
  const stack = [...item.children];
  while (stack.length > 0) {
    const child = stack.pop()!;
    out.push(child.rect);
    stack.push(...child.children);
  }
  return out;
}

/** «Recortar» `clipped` away from `other`, or null when no cut works or it would strand a descendant. */
function clipFix(clipped: Item, other: Item): LayoutFix | null {
  const rect = clipRect(clipped.rect, other.rect);
  if (!rect || leavesOut(clipped.rect, rect, descendantRects(clipped))) return null;
  return { kind: "clip", id: clipped.id, rect };
}

/** Overlap warnings between the siblings of one scope (overlays excluded). `items` are sorted. */
function scopeOverlaps(items: readonly Item[], warnings: LayoutWarning[]): void {
  const flow = items.filter((i) => !i.overlay);
  for (let i = 0; i < flow.length; i++) {
    const a = flow[i]!;
    for (let j = i + 1; j < flow.length; j++) {
      const b = flow[j]!;
      // Sorted by row: once b starts below a's bottom, nothing later can touch a.
      if (b.rect.row >= bottom(a.rect)) break;
      const shared = intersection(a.rect, b.rect);
      if (!shared) continue;
      const ratio = area(shared) / Math.min(area(a.rect), area(b.rect));
      const [bigger, smaller] = area(b.rect) > area(a.rect) ? [b, a] : [a, b];
      if (bigger.def.container && ratio >= CONTAINMENT_RATIO) {
        warnings.push({
          code: "implicit-containment",
          ids: [smaller.id, bigger.id],
          fixes: [{ kind: "nest", id: smaller.id, parentId: bigger.id }],
          ratio: round3(ratio),
        });
        continue;
      }
      const [lower, upper] = lowerOf(a, b);
      const fixes: LayoutFix[] = [{ kind: "move-below", id: lower.id, below: upper.id }];
      if (ratio < CLIP_RATIO) {
        // Shrink the block with the lower z (ties: the later one in reading position), or the other one when
        // that cut would leave one of its children outside it. No clip when neither cut works.
        const [first, second] = a.z < b.z ? [a, b] : [b, a];
        const clip = clipFix(first, second) ?? clipFix(second, first);
        if (clip) fixes.push(clip);
      }
      warnings.push({ code: "overlap", ids: [a.id, b.id], fixes, ratio: round3(ratio) });
    }
  }
}

function compareWarnings(a: LayoutWarning, b: LayoutWarning): number {
  const byCode = WARNING_ORDER.indexOf(a.code) - WARNING_ORDER.indexOf(b.code);
  if (byCode !== 0) return byCode;
  const n = Math.min(a.ids.length, b.ids.length);
  for (let i = 0; i < n; i++) {
    const c = compareStrings(a.ids[i]!, b.ids[i]!);
    if (c !== 0) return c;
  }
  return a.ids.length - b.ids.length;
}

function collectOrder(node: StructureNode | null, out: string[]): void {
  if (!node) return;
  switch (node.kind) {
    case "block":
      out.push(node.id);
      collectOrder(node.content, out);
      return;
    case "stack":
    case "row":
      for (const child of node.children) collectOrder(child.node, out);
      return;
    case "grid":
      for (const item of node.items) collectOrder(item.node, out);
      return;
  }
}

/**
 * Turns the blocks into a structure with a recursive XY-cut: stacks (horizontal cuts first), rows
 * (vertical cuts) and grids when there is no clean cut. Explicit nesting (`parentId`) makes scopes;
 * overlays leave the flow. Never changes the geometry and never throws: problems come back as `warnings`
 * with one-click fixes.
 */
export function inferStructure(layout: LayoutDoc, options: InferOptions = {}): Structure {
  const prepared = prepare(layout);
  const warnings = [...prepared.warnings];
  const tau = options.tolerance ?? TAU;

  const blockNode = (item: Item): BlockNode => {
    const frame = { col: item.rect.col, w: item.rect.w };
    const flow = item.children.filter((child) => !child.overlay);
    return { kind: "block", id: item.id, rect: { ...item.rect }, frame, content: cut(flow, frame, ctx, false) };
  };
  const ctx: Ctx = { tau, blockNode };

  const rootFrame: Frame = { col: 0, w: DESKTOP_COLUMNS };
  const root = cut(
    prepared.roots.filter((item) => !item.overlay),
    rootFrame,
    ctx,
    true,
  );
  const overlays = [...prepared.items.values()]
    .filter((item) => item.overlay)
    .sort(compareByPosition)
    .map(blockNode);

  scopeOverlaps(prepared.roots, warnings);
  for (const id of prepared.ids) scopeOverlaps(prepared.items.get(id)!.children, warnings);
  warnings.sort(compareWarnings);

  const order: string[] = [];
  collectOrder(root, order);
  for (const overlay of overlays) collectOrder(overlay, order);

  return { root, overlays, order, warnings };
}
