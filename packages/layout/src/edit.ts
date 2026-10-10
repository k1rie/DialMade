import { DESKTOP_COLUMNS, ROW_UNIT } from "./constants";
import { CLIP_RATIO, CONTAINMENT_RATIO } from "./infer";
import {
  area,
  bottom,
  clamp,
  clampInto,
  clampToGrid,
  clipRect,
  compareByPosition,
  contains,
  copyRect,
  coverage,
  intersection,
  intersects,
  right,
  roundRect,
  sameRect,
} from "./geometry";
import { compareStrings, isValidBlockId, newBlockId, type RandomSource } from "./ids";
import { blockDefOrFree, getBlockDef } from "./library";
import { sanitizeLabel, sanitizeNote } from "./sanitize";
import type { Adjustment, BlockId, GridRect, LayoutBlock, LayoutDoc, LayoutFix, LibraryBlockType } from "./types";

/** Share of a block that must stay inside its parent; below it, `normalizeDrop` unnests the block. */
export const UNNEST_RATIO = 0.5;
/** Row where overlays (modal) are inserted, from the top of their scope. */
export const OVERLAY_ROW = 8;
/** Max ×N stored on blocks that are not repeatable. */
const LOOSE_COUNT_MAX = 99;

/** An empty `LayoutDoc`. */
export function emptyLayout(): LayoutDoc {
  return { version: 1, columns: DESKTOP_COLUMNS, rowUnit: ROW_UNIT, blocks: {} };
}

/** Last occupied row (the bottom edge of the lowest block), 0 when empty. */
export function layoutBounds(layout: LayoutDoc): number {
  let max = 0;
  for (const block of Object.values(layout.blocks)) {
    if (block && typeof block === "object") max = Math.max(max, bottom(roundRect(block.rect)));
  }
  return max;
}

type Blocks = Record<BlockId, LayoutBlock>;

const isOverlayType = (type: unknown) => blockDefOrFree(type).overlay;

/** Effective parent id: the declared one when it exists, else root (`undefined`). */
function parentOf(blocks: Blocks, id: BlockId): BlockId | undefined {
  const parentId = blocks[id]?.parentId;
  return typeof parentId === "string" && parentId !== id && Object.prototype.hasOwnProperty.call(blocks, parentId)
    ? parentId
    : undefined;
}

/** Every descendant of `id` (children, grandchildren…), cycle-safe. */
export function descendantsOf(layout: LayoutDoc, id: BlockId): Set<BlockId> {
  const children = new Map<BlockId, BlockId[]>();
  for (const childId of Object.keys(layout.blocks)) {
    const parentId = parentOf(layout.blocks, childId);
    if (parentId === undefined) continue;
    const list = children.get(parentId);
    if (list) list.push(childId);
    else children.set(parentId, [childId]);
  }
  const out = new Set<BlockId>();
  const queue = [...(children.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (next === id || out.has(next)) continue;
    out.add(next);
    queue.push(...(children.get(next) ?? []));
  }
  return out;
}

function depthOf(blocks: Blocks, id: BlockId): number {
  let depth = 0;
  const seen = new Set<BlockId>([id]);
  let current = parentOf(blocks, id);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    depth++;
    current = parentOf(blocks, current);
  }
  return depth;
}

/** Flow siblings in a scope (same effective parent, overlays excluded), with their rects. */
function scopeSiblings(blocks: Blocks, parentId: BlockId | undefined, exclude: ReadonlySet<BlockId>) {
  return Object.keys(blocks)
    .filter((id) => !exclude.has(id) && parentOf(blocks, id) === parentId && !isOverlayType(blocks[id]!.type))
    .map((id) => ({ id, rect: clampToGrid(roundRect(blocks[id]!.rect)), z: blocks[id]!.z }))
    .sort(compareByPosition);
}

export type FreeSlotOptions = {
  /** Look inside this container instead of the root. */
  parentId?: BlockId;
  /** Overlays (modal) are not placed in the flow: centered at `OVERLAY_ROW` of the scope. */
  overlay?: boolean;
};

/** `rect` to use; `parentRect` is the parent's grown rect when nothing fit inside it. */
export type FreeSlot = { rect: GridRect; parentRect?: GridRect };

/**
 * First free spot (row by row, then column) where a block of `size` fits, among the scope's top/left and
 * its blocks' bottoms/rights. Inside a container with no room, the block goes to its bottom and the
 * container's grown rect comes back as `parentRect`. Overlays are never obstacles.
 */
export function findFreeSlot(layout: LayoutDoc, size: { w: number; h: number }, options: FreeSlotOptions = {}): FreeSlot {
  const blocks = layout.blocks;
  const parent = options.parentId !== undefined ? blocks[options.parentId] : undefined;
  const parentId = parent ? options.parentId : undefined;
  const parentRect = parent ? clampToGrid(roundRect(parent.rect)) : null;
  const scope: GridRect = parentRect ?? { col: 0, row: 0, w: DESKTOP_COLUMNS, h: Number.POSITIVE_INFINITY };
  const w = clamp(Math.round(size.w) || 1, 1, scope.w);
  const h = Math.max(1, Math.round(size.h) || 1);
  const grow = (rect: GridRect): FreeSlot =>
    parentRect && bottom(rect) > bottom(parentRect)
      ? { rect, parentRect: { ...parentRect, h: bottom(rect) - parentRect.row } }
      : { rect };

  if (options.overlay) {
    return grow({ col: scope.col + Math.floor((scope.w - w) / 2), row: scope.row + OVERLAY_ROW, w, h });
  }
  const siblings = scopeSiblings(blocks, parentId, new Set());
  const rows = [...new Set([scope.row, ...siblings.map((s) => bottom(s.rect))])]
    .filter((row) => row >= scope.row)
    .sort((a, b) => a - b);
  const cols = [...new Set([scope.col, ...siblings.map((s) => right(s.rect))])]
    .filter((col) => col >= scope.col && col + w <= scope.col + scope.w)
    .sort((a, b) => a - b);
  for (const row of rows) {
    if (parentRect && row + h > bottom(parentRect)) break;
    for (const col of cols) {
      const rect = { col, row, w, h };
      if (!siblings.some((s) => intersects(s.rect, rect))) return { rect };
    }
  }
  const lowest = Math.max(scope.row, ...siblings.map((s) => bottom(s.rect)));
  return grow({ col: scope.col, row: lowest, w, h });
}

export type InsertBlockOptions = {
  type: LibraryBlockType;
  label: string;
  /** Where it was dropped; the next free slot (in `parentId` if given) when omitted. */
  rect?: GridRect;
  parentId?: BlockId;
  count?: number;
  note?: string;
  /** A specific id (must be valid and free); a new `b-xxxxxx` otherwise. */
  id?: BlockId;
  random?: RandomSource;
};

export type InsertResult = {
  layout: LayoutDoc;
  id: BlockId;
  adjustments: Adjustment[];
  /** The parent container grew to make room (inserting into a full container). */
  grown?: { id: BlockId; from: GridRect; to: GridRect };
};

function clampCount(type: LibraryBlockType, count: number): number {
  const repeatable = blockDefOrFree(type).repeatable;
  const value = Number.isFinite(count) ? Math.round(count) : 1;
  return repeatable ? clamp(value, repeatable.min, repeatable.max) : clamp(value, 1, LOOSE_COUNT_MAX);
}

function maxZ(blocks: Blocks): number {
  let max = 0;
  for (const block of Object.values(blocks)) if (Number.isFinite(block?.z)) max = Math.max(max, block.z);
  return max;
}

/** Inserts a block (at the next free slot unless `rect` is given) and normalizes it like a drop. */
export function insertBlock(layout: LayoutDoc, options: InsertBlockOptions): InsertResult {
  const def = getBlockDef(options.type);
  const blocks: Blocks = { ...layout.blocks };
  if (options.parentId !== undefined && !blocks[options.parentId]) {
    throw new Error(`insertBlock: parent ${JSON.stringify(options.parentId)} does not exist`);
  }
  let id: BlockId;
  if (options.id !== undefined) {
    if (!isValidBlockId(options.id) || blocks[options.id]) {
      throw new Error(`insertBlock: id ${JSON.stringify(options.id)} is invalid or taken`);
    }
    id = options.id;
  } else {
    id = newBlockId(blocks, options.random);
  }
  let grown: InsertResult["grown"];
  let rect: GridRect;
  if (options.rect) {
    rect = roundRect(options.rect);
  } else {
    const slot = findFreeSlot(layout, def.defaultSize, { parentId: options.parentId, overlay: def.overlay });
    rect = slot.rect;
    if (slot.parentRect && options.parentId !== undefined) {
      const parent = blocks[options.parentId]!;
      grown = { id: options.parentId, from: copyRect(parent.rect), to: slot.parentRect };
      blocks[options.parentId] = { ...parent, rect: slot.parentRect };
    }
  }
  const block: LayoutBlock = { type: options.type, label: sanitizeLabel(options.label), rect, z: maxZ(blocks) + 1 };
  if (options.parentId !== undefined) block.parentId = options.parentId;
  if (options.count !== undefined) block.count = clampCount(options.type, options.count);
  if (options.note !== undefined) {
    const note = sanitizeNote(options.note);
    if (note) block.note = note;
  }
  blocks[id] = block;
  const normalized = normalizeDrop({ ...layout, blocks }, id);
  return grown ? { ...normalized, id, grown } : { ...normalized, id };
}

/**
 * Sets a rect. On a move (same size) the block's descendants shift by the same offset; on a resize they
 * stay where they are (resizing a container from its left edge must not drag its content).
 */
function setRectWithDescendants(layout: LayoutDoc, blocks: Blocks, id: BlockId, rect: GridRect): void {
  const block = blocks[id]!;
  const from = roundRect(block.rect);
  blocks[id] = { ...block, rect: copyRect(rect) };
  if (from.w !== rect.w || from.h !== rect.h) return;
  const dx = rect.col - from.col;
  const dy = rect.row - from.row;
  if (dx === 0 && dy === 0) return;
  for (const descendant of descendantsOf({ ...layout, blocks }, id)) {
    const child = blocks[descendant]!;
    const r = roundRect(child.rect);
    blocks[descendant] = { ...child, rect: { ...r, col: r.col + dx, row: r.row + dy } };
  }
}

/** Changes a block's rect. On a move (same size) its descendants follow with the same offset; a resize leaves them. */
export function moveBlock(layout: LayoutDoc, id: BlockId, rect: GridRect): LayoutDoc {
  if (!layout.blocks[id]) return layout;
  const blocks: Blocks = { ...layout.blocks };
  setRectWithDescendants(layout, blocks, id, rect);
  return { ...layout, blocks };
}

/**
 * After a move, resize or insert, in this order: `clamp` the rect (and any descendant pushed out) into the
 * grid; nest into the smallest
 * container that holds ≥90 % of it (`nest`, then `clamp` into it); `unnest` when <50 % stays in its
 * parent; `clip` overlaps <15 % with its siblings by shrinking the block with the lower z. Returns every
 * change so the canvas can animate it and offer «Ajustado · Deshacer».
 */
export function normalizeDrop(layout: LayoutDoc, id: BlockId): { layout: LayoutDoc; adjustments: Adjustment[] } {
  const original = layout.blocks[id];
  if (!original) return { layout, adjustments: [] };
  const blocks: Blocks = { ...layout.blocks };
  const adjustments: Adjustment[] = [];
  const current = () => blocks[id]!;

  // 1. Into the grid: the block, then any descendant it pushed out.
  const clamped = clampToGrid(roundRect(original.rect));
  if (!sameRect(original.rect, clamped)) {
    adjustments.push({ kind: "clamp", id, from: copyRect(original.rect), to: clamped });
    setRectWithDescendants(layout, blocks, id, clamped);
  }
  for (const descendant of [...descendantsOf({ ...layout, blocks }, id)].sort(compareStrings)) {
    const rect = blocks[descendant]!.rect;
    const inside = clampToGrid(roundRect(rect));
    if (sameRect(rect, inside)) continue;
    adjustments.push({ kind: "clamp", id: descendant, from: copyRect(rect), to: inside });
    blocks[descendant] = { ...blocks[descendant]!, rect: inside };
  }

  const overlay = isOverlayType(original.type);
  if (!overlay) {
    // 2. Containment: the smallest container (or the current parent) holding ≥90 % of the block.
    const descendants = descendantsOf({ ...layout, blocks }, id);
    const rect = current().rect;
    const currentParent = parentOf(blocks, id);
    let chosen: { id: BlockId; rect: GridRect; depth: number } | null = null;
    for (const candidateId of Object.keys(blocks).sort(compareStrings)) {
      if (candidateId === id || descendants.has(candidateId)) continue;
      const candidate = blocks[candidateId]!;
      if (!blockDefOrFree(candidate.type).container && candidateId !== currentParent) continue;
      const candidateRect = clampToGrid(roundRect(candidate.rect));
      if (coverage(candidateRect, rect) < CONTAINMENT_RATIO) continue;
      const depth = depthOf(blocks, candidateId);
      if (
        !chosen ||
        area(candidateRect) < area(chosen.rect) ||
        (area(candidateRect) === area(chosen.rect) && depth > chosen.depth)
      ) {
        chosen = { id: candidateId, rect: candidateRect, depth };
      }
    }
    if (chosen) {
      if (chosen.id !== currentParent) {
        blocks[id] = { ...current(), parentId: chosen.id };
        adjustments.push({ kind: "nest", id, parentId: chosen.id });
      }
      if (!contains(chosen.rect, rect)) {
        const inside = clampInto(rect, chosen.rect);
        adjustments.push({ kind: "clamp", id, from: copyRect(rect), to: inside });
        setRectWithDescendants(layout, blocks, id, inside);
      }
    } else if (currentParent !== undefined) {
      // 3. Out of its parent: move up to the nearest ancestor that still holds half of it (or the root).
      const parentRect = clampToGrid(roundRect(blocks[currentParent]!.rect));
      if (coverage(parentRect, rect) < UNNEST_RATIO) {
        let target: BlockId | undefined;
        let ancestor = parentOf(blocks, currentParent);
        const seen = new Set<BlockId>([id, currentParent]);
        while (ancestor !== undefined && !seen.has(ancestor)) {
          seen.add(ancestor);
          if (coverage(clampToGrid(roundRect(blocks[ancestor]!.rect)), rect) >= UNNEST_RATIO) {
            target = ancestor;
            break;
          }
          ancestor = parentOf(blocks, ancestor);
        }
        const { parentId: _dropped, ...rest } = current();
        blocks[id] = target !== undefined ? { ...rest, parentId: target } : rest;
        adjustments.push({ kind: "unnest", id, parentId: currentParent });
      }
    }

    // 4. Small overlaps with siblings: shrink the lower-z block.
    const parentId = parentOf(blocks, id);
    for (const sibling of scopeSiblings(blocks, parentId, new Set([id]))) {
      const me = { id, rect: current().rect, z: current().z };
      const other = { id: sibling.id, rect: clampToGrid(roundRect(blocks[sibling.id]!.rect)), z: blocks[sibling.id]!.z };
      const shared = intersection(me.rect, other.rect);
      if (!shared) continue;
      if (area(shared) / Math.min(area(me.rect), area(other.rect)) >= CLIP_RATIO) continue;
      const [target, by] =
        me.z !== other.z ? (me.z < other.z ? [me, other] : [other, me]) : compareByPosition(me, other) > 0 ? [me, other] : [other, me];
      const to = clipRect(target.rect, by.rect);
      if (!to) continue;
      adjustments.push({ kind: "clip", id: target.id, from: copyRect(target.rect), to });
      blocks[target.id] = { ...blocks[target.id]!, rect: to };
    }
  }

  return adjustments.length === 0 ? { layout, adjustments } : { layout: { ...layout, blocks }, adjustments };
}

/** Removes blocks and all their descendants. */
export function removeBlocks(layout: LayoutDoc, ids: readonly BlockId[]): LayoutDoc {
  const doomed = new Set<BlockId>();
  for (const id of ids) {
    if (!layout.blocks[id]) continue;
    doomed.add(id);
    for (const descendant of descendantsOf(layout, id)) doomed.add(descendant);
  }
  if (doomed.size === 0) return layout;
  const blocks: Blocks = {};
  for (const [id, block] of Object.entries(layout.blocks)) if (!doomed.has(id)) blocks[id] = block;
  return { ...layout, blocks };
}

export type DuplicateOptions = { newId?: BlockId; random?: RandomSource };
export type DuplicateResult = {
  layout: LayoutDoc;
  id: BlockId;
  /** Original id → copy id, for the block and each descendant. */
  idMap: Record<BlockId, BlockId>;
};

/**
 * Copies a block and its descendants just below the original (or at the next free slot when that spot is
 * taken). Copies get new ids, z above everything, and no `generated` fingerprint (nothing was generated yet).
 */
export function duplicateBlock(layout: LayoutDoc, id: BlockId, options: DuplicateOptions = {}): DuplicateResult {
  const source = layout.blocks[id];
  if (!source) throw new Error(`duplicateBlock: block ${JSON.stringify(id)} does not exist`);
  const blocks: Blocks = { ...layout.blocks };
  const descendants = descendantsOf(layout, id);
  const subtree = [id, ...[...descendants].sort(compareStrings)];
  const parentId = parentOf(blocks, id);
  const from = clampToGrid(roundRect(source.rect));

  let target: GridRect = { ...from, row: bottom(from) };
  const exclude = new Set(subtree);
  const parentRect = parentId !== undefined ? clampToGrid(roundRect(blocks[parentId]!.rect)) : null;
  const blocked =
    scopeSiblings(blocks, parentId, exclude).some((s) => intersects(s.rect, target)) ||
    (parentRect !== null && bottom(target) > bottom(parentRect));
  if (blocked) {
    const slot = findFreeSlot(layout, from, { parentId, overlay: isOverlayType(source.type) });
    target = slot.rect;
    if (slot.parentRect && parentId !== undefined) blocks[parentId] = { ...blocks[parentId]!, rect: slot.parentRect };
  }
  const dx = target.col - from.col;
  const dy = target.row - from.row;

  if (options.newId !== undefined && (!isValidBlockId(options.newId) || blocks[options.newId])) {
    throw new Error(`duplicateBlock: id ${JSON.stringify(options.newId)} is invalid or taken`);
  }
  const taken = new Set(Object.keys(blocks));
  const idMap: Record<BlockId, BlockId> = {};
  for (const oldId of subtree) {
    const newId = oldId === id && options.newId !== undefined ? options.newId : newBlockId(taken, options.random);
    taken.add(newId);
    idMap[oldId] = newId;
  }
  const byZ = [...subtree].sort((a, b) => blocks[a]!.z - blocks[b]!.z || compareStrings(a, b));
  const baseZ = maxZ(blocks);
  byZ.forEach((oldId, rank) => {
    const copy = JSON.parse(JSON.stringify(blocks[oldId])) as LayoutBlock;
    delete copy.generated;
    const r = oldId === id ? from : roundRect(copy.rect);
    copy.rect = { ...r, col: r.col + dx, row: r.row + dy };
    copy.z = baseZ + 1 + rank;
    if (oldId === id) {
      if (parentId !== undefined) copy.parentId = parentId;
      else delete copy.parentId;
    } else if (copy.parentId !== undefined) {
      copy.parentId = idMap[copy.parentId] ?? copy.parentId;
    }
    blocks[idMap[oldId]!] = copy;
  });
  return { layout: { ...layout, blocks }, id: idMap[id]!, idMap };
}

/** Applies a warning's one-click fix. Returns the same layout when the fix no longer applies. */
export function applyFix(layout: LayoutDoc, fix: LayoutFix): LayoutDoc {
  const block = layout.blocks[fix.id];
  if (!block) return layout;
  switch (fix.kind) {
    case "nest": {
      if (!layout.blocks[fix.parentId] || fix.parentId === fix.id) return layout;
      if (descendantsOf(layout, fix.id).has(fix.parentId)) return layout;
      return { ...layout, blocks: { ...layout.blocks, [fix.id]: { ...block, parentId: fix.parentId } } };
    }
    case "unparent": {
      if (block.parentId === undefined) return layout;
      const { parentId: _parent, ...rest } = block;
      return { ...layout, blocks: { ...layout.blocks, [fix.id]: rest } };
    }
    case "move-below": {
      const below = layout.blocks[fix.below];
      if (!below) return layout;
      const rect = roundRect(block.rect);
      return moveBlock(layout, fix.id, { ...rect, row: bottom(roundRect(below.rect)) });
    }
    case "clip":
      return { ...layout, blocks: { ...layout.blocks, [fix.id]: { ...block, rect: copyRect(fix.rect) } } };
    case "fit-inside":
      return moveBlock(layout, fix.id, fix.rect);
  }
}
