import { MAX_BLOCKS } from "./constants";
import {
  clampInto,
  clampToGrid,
  compareByPosition,
  contains,
  isInBounds,
  isIntegerRect,
  roundRect,
} from "./geometry";
import { compareStrings } from "./ids";
import { blockDefOrFree } from "./library";
import type { BlockId, GridRect, LayoutBlock, LayoutDoc, LayoutWarning, LibraryBlockDef } from "./types";

/** A block as the engine sees it: sanitized rect, effective parent and children. Internal. */
export type Item = {
  id: BlockId;
  block: LayoutBlock;
  def: LibraryBlockDef;
  /** Rounded, ≥1×1 and clamped into the 12-column grid. The input is never changed. */
  rect: GridRect;
  z: number;
  /** Effective parent: null for root-level blocks (no parent, missing parent or part of a cycle). */
  parent: BlockId | null;
  overlay: boolean;
  /** Effective children, sorted by (row, col, z, id). */
  children: Item[];
  depth: number;
  /** The block or one of its ancestors is an overlay. */
  inOverlay: boolean;
};

export type Prepared = {
  items: Map<BlockId, Item>;
  /** Every usable block id, sorted. */
  ids: BlockId[];
  /** Root-level items (overlays included), sorted by position. */
  roots: Item[];
  warnings: LayoutWarning[];
};

function blocksOf(layout: unknown): Record<string, unknown> {
  if (!layout || typeof layout !== "object") return {};
  const blocks = (layout as { blocks?: unknown }).blocks;
  return blocks && typeof blocks === "object" ? (blocks as Record<string, unknown>) : {};
}

/**
 * Normalizes a layout for the engine without touching it: rounds and clamps rects, resolves parents
 * (missing parents and cycles go to the root) and collects the geometry and nesting warnings.
 * Never throws.
 */
export function prepare(layout: LayoutDoc): Prepared {
  const raw = blocksOf(layout);
  const ids = Object.keys(raw)
    .filter((id) => raw[id] !== null && typeof raw[id] === "object")
    .sort(compareStrings);
  const warnings: LayoutWarning[] = [];
  const items = new Map<BlockId, Item>();

  for (const id of ids) {
    const block = raw[id] as LayoutBlock;
    const rounded = roundRect(block.rect);
    const rect = clampToGrid(rounded);
    if (!isIntegerRect(block.rect)) {
      warnings.push({ code: "invalid-rect", ids: [id], fixes: [{ kind: "fit-inside", id, rect }] });
    }
    if (!isInBounds(rounded)) {
      warnings.push({ code: "out-of-bounds", ids: [id], fixes: [{ kind: "fit-inside", id, rect }] });
    }
    const def = blockDefOrFree(block.type);
    items.set(id, {
      id,
      block,
      def,
      rect,
      z: typeof block.z === "number" && Number.isFinite(block.z) ? block.z : 0,
      parent: null,
      overlay: def.overlay,
      children: [],
      depth: 0,
      inOverlay: false,
    });
  }

  if (ids.length > MAX_BLOCKS) warnings.push({ code: "too-many-blocks", ids: [], fixes: [] });

  // Parents: declared → effective. Missing parents and cycles (self-parent included) go to the root.
  const declared = new Map<BlockId, BlockId>();
  for (const id of ids) {
    const parentId = (raw[id] as LayoutBlock).parentId;
    if (parentId === undefined || parentId === null) continue;
    if (typeof parentId !== "string" || !items.has(parentId)) {
      warnings.push({ code: "missing-parent", ids: [id], fixes: [{ kind: "unparent", id }] });
      continue;
    }
    declared.set(id, parentId);
  }
  const inCycle = new Set<BlockId>();
  const state = new Map<BlockId, 1 | 2>();
  for (const id of ids) {
    const path: BlockId[] = [];
    let current: BlockId | undefined = id;
    while (current !== undefined && !state.has(current)) {
      state.set(current, 1);
      path.push(current);
      current = declared.get(current);
    }
    if (current !== undefined && state.get(current) === 1) {
      const members = path.slice(path.indexOf(current)).sort(compareStrings);
      for (const member of members) inCycle.add(member);
      warnings.push({ code: "cycle", ids: members, fixes: members.map((member) => ({ kind: "unparent", id: member })) });
    }
    for (const visited of path) state.set(visited, 2);
  }

  for (const id of ids) {
    const parentId = declared.get(id);
    if (parentId === undefined || inCycle.has(id)) continue;
    const item = items.get(id)!;
    const parent = items.get(parentId)!;
    item.parent = parentId;
    parent.children.push(item);
    if (!contains(parent.rect, item.rect)) {
      const fits = item.rect.w <= parent.rect.w && item.rect.h <= parent.rect.h;
      warnings.push({
        code: "outside-parent",
        ids: [id, parentId],
        fixes: fits ? [{ kind: "fit-inside", id, rect: clampInto(item.rect, parent.rect) }] : [{ kind: "unparent", id }],
      });
    }
    const accepted =
      parent.def.container || parent.def.accepts === "any" || parent.def.accepts.includes(item.def.type);
    if (!accepted) warnings.push({ code: "not-accepted", ids: [id, parentId], fixes: [{ kind: "unparent", id }] });
  }

  const roots: Item[] = [];
  for (const item of items.values()) {
    item.children.sort(compareByPosition);
    if (item.parent === null) roots.push(item);
  }
  roots.sort(compareByPosition);
  const visit = (item: Item, depth: number, inOverlay: boolean) => {
    item.depth = depth;
    item.inOverlay = inOverlay || item.overlay;
    for (const child of item.children) visit(child, depth + 1, item.inOverlay);
  };
  for (const root of roots) visit(root, 0, false);

  return { items, ids, roots, warnings };
}

/**
 * Ids of the blocks that are hidden, by their own flag or because an ancestor is (a hidden container hides
 * everything inside it, overlays included).
 */
export function hiddenIds(prepared: Prepared, isHidden: (item: Item) => boolean): Set<BlockId> {
  const out = new Set<BlockId>();
  const byDepth = [...prepared.items.values()].sort((a, b) => a.depth - b.depth);
  for (const item of byDepth) {
    if (isHidden(item) || (item.parent !== null && out.has(item.parent))) out.add(item.id);
  }
  return out;
}
