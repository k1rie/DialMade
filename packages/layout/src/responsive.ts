import { COLUMNS, DERIVED_GAP_ROWS, DESKTOP_COLUMNS } from "./constants";
import { bottom, clamp, right } from "./geometry";
import { inferStructure } from "./infer";
import { parseNote } from "./note";
import { hiddenIds, prepare, type Item } from "./prepare";
import type {
  BlockId,
  BlockNode,
  BreakpointLayout,
  DerivedBlock,
  DerivedBreakpoint,
  GridNode,
  GridRect,
  LayoutBlock,
  LayoutDoc,
  LibraryBlockDef,
  MobileBehavior,
  NodePlan,
  Placement,
  ResponsiveLayout,
  RowNode,
  StackNode,
  Structure,
  StructureNode,
} from "./types";

const BEHAVIORS: ReadonlySet<string> = new Set<MobileBehavior>([
  "stack",
  "hamburger",
  "drawer",
  "tabbar",
  "grid-2x2",
  "one-column",
  "carousel",
  "card-list",
  "agenda",
  "text-first",
  "sheet",
  "accordion",
  "scroll-x",
  "hide",
]);

export function isMobileBehavior(value: unknown): value is MobileBehavior {
  return typeof value === "string" && BEHAVIORS.has(value);
}

/**
 * Splits `total` proportionally to `weights` with integers (largest remainder; ties go left first).
 * All-zero weights split evenly.
 */
export function distribute(weights: readonly number[], total: number): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  const safe = sum > 0 ? weights : weights.map(() => 1);
  const safeSum = sum > 0 ? sum : weights.length;
  const exact = safe.map((w) => (w * total) / safeSum);
  const result = exact.map(Math.floor);
  let rest = total - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (let k = 0; rest > 0 && order.length > 0; k = (k + 1) % order.length, rest--) result[order[k]!.index]! += 1;
  return result;
}

type Sized = { block: LayoutBlock; def: LibraryBlockDef; rect: GridRect };

/** ×N used for responsive heights and estimates: `count`, else the note's number, else the library default. */
export function effectiveCount(item: Pick<Sized, "block" | "def">): number {
  const raw = item.block.count ?? parseNote(item.block.note).count ?? item.def.repeatable?.default ?? 1;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
}

/** Rows per desktop line of a repeatable block: ~4 columns per item, at least one item per line. */
function desktopRows(w: number, count: number): number {
  const perRow = clamp(Math.round(w / 4), 1, count);
  return Math.ceil(count / perRow);
}

/** Approximate mobile height (rows) of a block by its behavior. */
export function mobileHeight(item: Sized, behavior: MobileBehavior): number {
  const { h, w } = item.rect;
  const count = effectiveCount(item);
  switch (behavior) {
    case "hamburger":
    case "drawer":
      return Math.min(h, 8);
    case "tabbar":
      return 8;
    case "grid-2x2":
      return count > 2 ? h * Math.ceil(count / 2) : h;
    case "one-column":
      return Math.max(1, Math.round((h / desktopRows(w, count)) * count));
    case "carousel":
      return Math.max(1, Math.round(h / desktopRows(w, count)));
    default:
      return h;
  }
}

function deriveBreakpoint(
  layout: LayoutDoc,
  structure: Structure,
  bp: DerivedBreakpoint,
): BreakpointLayout {
  const columns = COLUMNS[bp] as 8 | 4;
  const prepared = prepare(layout);
  const { items, ids } = prepared;
  const behaviorOf = (item: Item): MobileBehavior => {
    const chosen = item.block.responsive?.[bp]?.behavior;
    return isMobileBehavior(chosen) ? chosen : bp === "mobile" ? item.def.mobile : "stack";
  };
  // Hidden by its own settings, or inside a hidden block.
  const hidden = hiddenIds(
    prepared,
    (item) => item.block.responsive?.[bp]?.hidden === true || item.block.hidden === true || behaviorOf(item) === "hide",
  );
  const blocks: Record<BlockId, DerivedBlock> = {};
  for (const id of ids) blocks[id] = { rect: null, behavior: behaviorOf(items.get(id)!), hidden: hidden.has(id) };
  const nodes: Record<string, NodePlan> = {};
  const order: BlockId[] = [];
  const deferred: BlockNode[] = [];

  const visibleMemo = new Map<StructureNode, boolean>();
  const isVisible = (node: StructureNode): boolean => {
    const known = visibleMemo.get(node);
    if (known !== undefined) return known;
    let value: boolean;
    switch (node.kind) {
      case "block":
        value = blocks[node.id] ? !blocks[node.id]!.hidden : false;
        break;
      case "stack":
      case "row":
        value = node.children.some((c) => isVisible(c.node));
        break;
      case "grid":
        value = node.items.some((i) => isVisible(i.node));
        break;
    }
    visibleMemo.set(node, value);
    return value;
  };

  const minMemo = new Map<StructureNode, number>();
  const minColsOf = (node: StructureNode): number => {
    const known = minMemo.get(node);
    if (known !== undefined) return known;
    let value = 0;
    if (isVisible(node)) {
      switch (node.kind) {
        case "block": {
          const item = items.get(node.id);
          value = item ? item.def.minCols[bp] : 1;
          if (node.content) value = Math.max(value, minColsOf(node.content));
          break;
        }
        case "stack":
          value = Math.max(0, ...node.children.map((c) => minColsOf(c.node)));
          break;
        case "row":
          value = node.children.reduce((sum, c) => sum + minColsOf(c.node), 0);
          break;
        case "grid":
          value = Math.max(0, ...node.items.map((i) => minColsOf(i.node)));
          break;
      }
    }
    minMemo.set(node, value);
    return value;
  };

  const scaledSpan = (node: StructureNode, span: number, scale: number, w: number) =>
    Math.min(w, Math.max(Math.min(minColsOf(node), w), Math.round(span * scale)));

  /** Places nodes one under another at full width, `gap` rows apart. */
  const placeStacked = (list: StructureNode[], col: number, w: number, top: number, gap: number): number | null => {
    let cursor: number | null = null;
    for (const node of list) {
      if (!isVisible(node)) continue;
      const placed = place(node, col, w, cursor === null ? top : cursor + gap);
      if (placed !== null) cursor = placed;
    }
    return cursor;
  };

  /** A stack, or a block's single child (a one-child stack): kept with scaled columns or fully stacked. */
  const placeStackLike = (
    children: readonly Placement[],
    gaps: readonly number[],
    frameW: number,
    col: number,
    w: number,
    top: number,
    keys: readonly string[],
  ): number | null => {
    const visible = children.map((c) => isVisible(c.node));
    let plan: NodePlan = { mode: "stack" };
    if (bp === "tablet") {
      const scale = w / frameW;
      const spans: number[] = [];
      const starts: number[] = [];
      let allFull = true;
      children.forEach((c, i) => {
        if (!visible[i]) {
          spans.push(0);
          starts.push(0);
          return;
        }
        const span = scaledSpan(c.node, c.span, scale, w);
        const start = clamp(Math.round(c.start * scale), 0, w - span);
        spans.push(span);
        starts.push(start);
        if (start !== 0 || span !== w) allFull = false;
      });
      if (!allFull) plan = { mode: "keep", spans, starts };
    }
    for (const key of keys) nodes[key] = plan;
    let cursor: number | null = null;
    let lastVisible = -1;
    children.forEach((c, i) => {
      if (!visible[i]) return;
      const childTop = cursor === null ? top : cursor + (gaps[lastVisible] ?? 0);
      const placed =
        plan.mode === "keep"
          ? place(c.node, col + plan.starts[i]!, plan.spans[i]!, childTop)
          : place(c.node, col, w, childTop);
      if (placed === null) return;
      cursor = placed;
      lastVisible = i;
    });
    return cursor;
  };

  const placeRow = (node: RowNode, col: number, w: number, top: number, keys: readonly string[]): number | null => {
    if (bp === "mobile") {
      for (const key of keys) nodes[key] = { mode: "stack" };
      return placeStacked(
        node.children.map((c) => c.node),
        col,
        w,
        top,
        DERIVED_GAP_ROWS,
      );
    }
    const scale = w / node.frame.w;
    const visibleIdx = node.children.flatMap((c, i) => (isVisible(c.node) ? [i] : []));
    const spans = node.children.map((c) => (isVisible(c.node) ? scaledSpan(c.node, c.span, scale, w) : 0));
    const total = spans.reduce((a, b) => a + b, 0);
    if (total <= w) {
      // Keep: the remaining columns go back to the gaps, proportional to the original ones.
      const gaps: number[] = [];
      let previousEnd = 0;
      for (const i of visibleIdx) {
        const c = node.children[i]!;
        gaps.push(Math.max(0, c.start - previousEnd));
        previousEnd = c.start + c.span;
      }
      gaps.push(Math.max(0, node.frame.w - previousEnd));
      let rest = w - total;
      let gapRest = gaps.reduce((a, b) => a + b, 0);
      const newGaps = gaps.map(() => 0);
      if (gapRest === 0 && rest > 0) {
        const grown = distribute(
          visibleIdx.map((i) => spans[i]!),
          w,
        );
        visibleIdx.forEach((i, k) => (spans[i] = grown[k]!));
      } else {
        gaps.forEach((g, k) => {
          const share = gapRest === 0 ? 0 : Math.round((rest * g) / gapRest);
          newGaps[k] = share;
          rest -= share;
          gapRest -= g;
        });
      }
      const starts = node.children.map(() => 0);
      let cursorCol = 0;
      visibleIdx.forEach((i, k) => {
        cursorCol += newGaps[k]!;
        starts[i] = cursorCol;
        cursorCol += spans[i]!;
      });
      for (const key of keys) nodes[key] = { mode: "keep", spans, starts };
      let maxBottom: number | null = null;
      for (const i of visibleIdx) {
        const c = node.children[i]!;
        const placed = place(c.node, col + starts[i]!, spans[i]!, top + Math.max(0, c.node.rect.row - node.rect.row));
        if (placed !== null) maxBottom = Math.max(maxBottom ?? placed, placed);
      }
      return maxBottom;
    }
    // Wrap: greedy lines in reading order, each line stretched to fill the frame.
    const lines: number[][] = [];
    let line: number[] = [];
    let used = 0;
    for (const i of visibleIdx) {
      if (line.length > 0 && used + spans[i]! > w) {
        lines.push(line);
        line = [];
        used = 0;
      }
      line.push(i);
      used += spans[i]!;
    }
    if (line.length > 0) lines.push(line);
    for (const current of lines) {
      const grown = distribute(
        current.map((i) => spans[i]!),
        w,
      );
      current.forEach((i, k) => (spans[i] = grown[k]!));
    }
    for (const key of keys) nodes[key] = { mode: "wrap", spans };
    let lineTop = top;
    let cursor: number | null = null;
    for (const current of lines) {
      const minRow = Math.min(...current.map((i) => node.children[i]!.node.rect.row));
      let offset = 0;
      let lineBottom: number | null = null;
      for (const i of current) {
        const c = node.children[i]!;
        const placed = place(c.node, col + offset, spans[i]!, lineTop + (c.node.rect.row - minRow));
        offset += spans[i]!;
        if (placed !== null) lineBottom = Math.max(lineBottom ?? placed, placed);
      }
      if (lineBottom !== null) {
        cursor = lineBottom;
        lineTop = lineBottom + DERIVED_GAP_ROWS;
      }
    }
    return cursor;
  };

  const placeGrid = (node: GridNode, col: number, w: number, top: number, keys: readonly string[]): number | null => {
    const stacked = () => {
      for (const key of keys) nodes[key] = { mode: "stack" };
      return placeStacked(
        node.items.map((i) => i.node),
        col,
        w,
        top,
        DERIVED_GAP_ROWS,
      );
    };
    if (bp === "mobile") return stacked();
    const tracks = distribute(node.columns, w);
    const sum = (from: number, to: number) => tracks.slice(from, to).reduce((a, b) => a + b, 0);
    const spans: number[] = [];
    const starts: number[] = [];
    let fits = true;
    for (const item of node.items) {
      if (!isVisible(item.node)) {
        spans.push(0);
        starts.push(0);
        continue;
      }
      const span = sum(item.colStart - 1, item.colEnd - 1);
      starts.push(sum(0, item.colStart - 1));
      spans.push(span);
      if (span < Math.max(1, Math.min(minColsOf(item.node), w))) fits = false;
    }
    if (!fits) return stacked();
    for (const key of keys) nodes[key] = { mode: "keep", spans, starts };
    const rowEdge = (line: number) => node.rect.row + node.rows.slice(0, line - 1).reduce((a, b) => a + b, 0);
    let maxBottom: number | null = null;
    node.items.forEach((item, k) => {
      if (!isVisible(item.node)) return;
      const placed = place(item.node, col + starts[k]!, spans[k]!, top + rowEdge(item.rowStart) - node.rect.row);
      if (placed !== null) maxBottom = Math.max(maxBottom ?? placed, placed);
    });
    return maxBottom;
  };

  const placeRegion = (
    node: StackNode | RowNode | GridNode,
    col: number,
    w: number,
    top: number,
    keys: readonly string[],
  ): number | null => {
    switch (node.kind) {
      case "stack":
        return placeStackLike(node.children, node.gaps, node.frame.w, col, w, top, keys);
      case "row":
        return placeRow(node, col, w, top, keys);
      case "grid":
        return placeGrid(node, col, w, top, keys);
    }
  };

  const placeBlock = (node: BlockNode, col: number, w: number, top: number, deferTabbar: boolean): number | null => {
    const derived = blocks[node.id];
    if (!derived || derived.hidden) return null;
    if (bp === "mobile" && derived.behavior === "tabbar" && deferTabbar) {
      deferred.push(node);
      return null;
    }
    order.push(node.id);
    const item = items.get(node.id)!;
    const baseH = bp === "tablet" ? node.rect.h : mobileHeight(item, derived.behavior);
    let h = baseH;
    const content = node.content;
    if (content) {
      const innerTop = top + Math.max(0, content.rect.row - node.rect.row);
      const contentBottom =
        content.kind === "block"
          ? placeStackLike(
              [{ node: content, ...placementIn(content, node) }],
              [],
              node.frame.w,
              col,
              w,
              innerTop,
              [node.id],
            )
          : placeRegion(content, col, w, innerTop, [content.id, node.id]);
      if (contentBottom !== null) {
        const pad = Math.max(0, bottom(node.rect) - bottom(content.rect));
        h = Math.max(baseH, contentBottom + pad - top);
      }
    }
    derived.rect = { col, row: top, w, h };
    return top + h;
  };

  function place(node: StructureNode, col: number, w: number, top: number): number | null {
    return node.kind === "block" ? placeBlock(node, col, w, top, true) : placeRegion(node, col, w, top, [node.id]);
  }

  // Flow.
  let cursor: number | null = null;
  const root = structure.root;
  if (root) {
    cursor =
      root.kind === "block"
        ? placeStackLike(
            [{ node: root, ...placementIn(root, null) }],
            [],
            DESKTOP_COLUMNS,
            0,
            columns,
            0,
            [],
          )
        : placeRegion(root, 0, columns, 0, [root.id]);
  }
  // Mobile tab bars go after the flow.
  for (const node of deferred) {
    const placed = placeBlock(node, 0, columns, cursor ?? 0, false);
    if (placed !== null) cursor = placed;
  }
  // Overlays: scaled on tablet, full width (sheet) on mobile; same top as desktop.
  for (const overlay of structure.overlays) {
    const derived = blocks[overlay.id];
    if (!derived || derived.hidden) continue;
    if (bp === "mobile") {
      placeBlock(overlay, 0, columns, overlay.rect.row, false);
      continue;
    }
    const item = items.get(overlay.id)!;
    const scale = columns / DESKTOP_COLUMNS;
    const w = Math.min(columns, Math.max(Math.min(item.def.minCols.tablet, columns), Math.round(overlay.rect.w * scale)));
    const col = clamp(Math.round(overlay.rect.col * scale), 0, columns - w);
    placeBlock(overlay, col, w, overlay.rect.row, false);
  }

  return { breakpoint: bp, columns, blocks, nodes, order };
}

/** start/span of a block inside its parent block's frame (or the root frame). */
function placementIn(node: BlockNode, parent: BlockNode | null): { start: number; span: number } {
  const frame = parent ? parent.frame : { col: 0, w: DESKTOP_COLUMNS };
  const start = clamp(node.rect.col - frame.col, 0, frame.w - 1);
  const end = clamp(right(node.rect) - frame.col, start + 1, frame.w);
  return { start, span: end - start };
}

/**
 * Derives tablet (8 columns) and mobile (4 columns) from the desktop structure: per-region plans for
 * `toCss` and a rect per block for the canvas preview (heights on mobile are an approximation by behavior).
 */
export function deriveResponsive(layout: LayoutDoc, structure?: Structure): ResponsiveLayout {
  const resolved = structure ?? inferStructure(layout);
  return {
    tablet: deriveBreakpoint(layout, resolved, "tablet"),
    mobile: deriveBreakpoint(layout, resolved, "mobile"),
  };
}

export { placementIn };
