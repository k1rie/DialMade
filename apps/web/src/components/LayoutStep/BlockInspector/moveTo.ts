import {
  descendantsOf,
  DESKTOP_COLUMNS,
  findFreeSlot,
  getBlockDef,
  isLibraryBlockType,
  moveBlock,
  type BlockId,
  type GridRect,
  type LayoutDoc,
  type LayoutFix,
} from "@dialmade/layout";

/*
 * «Mover a…» of the inspector: the click/keyboard alternative to dragging a block to another place of the
 * reading order or into/out of a container (WCAG 2.5.7). Pure, no DOM.
 *
 * A move is planned on a copy of the layout and returned as one-click fixes (`LayoutFix`) the store applies
 * in a batch (one undo step). The plan makes room instead of overlapping: the blocks of the scope shift by
 * whole rows, a band the block leaves empty closes when nothing else sits beside it, and a container that
 * gets too short grows (pushing what is below it). Nothing goes through `normalizeDrop`, so the rest of
 * the layout keeps its geometry.
 */

/** Order and nesting moves (they make room and can touch several blocks). */
export type MoveTarget = { kind: "top" } | { kind: "bottom" } | { kind: "into"; parentId: BlockId } | { kind: "out" };

/** Horizontal placement inside the block's scope (its container, or the 12 columns). One rect, no room made. */
export type AlignTarget = "left" | "center" | "right" | "full";

/** What «Mover a…» can offer for a block. */
export type MoveOptions = {
  top: boolean;
  bottom: boolean;
  /** The block is nested and can leave its container. */
  out: boolean;
  /** Blocks it can go into, in reading position (row, column). */
  into: BlockId[];
  align: Readonly<Record<AlignTarget, boolean>>;
};

const ALIGN_TARGETS: readonly AlignTarget[] = ["left", "center", "right", "full"];

const bottomOf = (rect: GridRect) => rect.row + rect.h;
const sameRect = (a: GridRect, b: GridRect) => a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h;
const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Effective parent, the engine's rule: the declared one while it exists and is not the block itself. */
export function parentOf(layout: LayoutDoc, id: BlockId): BlockId | undefined {
  const parentId = layout.blocks[id]?.parentId;
  return parentId !== undefined && parentId !== id && layout.blocks[parentId] ? parentId : undefined;
}

/** Overlays (modal) live outside the flow: they never shift with it and do not take part in order moves. */
function isOverlay(layout: LayoutDoc, id: BlockId): boolean {
  const type = layout.blocks[id]?.type;
  return type !== undefined && isLibraryBlockType(type) && getBlockDef(type).overlay;
}

/** Can a block of `childType` mean something inside `parentId`: containers take anything, others their list. */
function canContain(layout: LayoutDoc, parentId: BlockId, childId: BlockId): boolean {
  const parentType = layout.blocks[parentId]?.type;
  const childType = layout.blocks[childId]?.type;
  if (!parentType || !childType || !isLibraryBlockType(parentType) || !isLibraryBlockType(childType)) return false;
  const { accepts } = getBlockDef(parentType);
  return accepts === "any" || accepts.includes(childType);
}

/** Flow blocks whose effective parent is `parentId` (root when undefined), except `exclude`. Sorted by id. */
function childrenOf(layout: LayoutDoc, parentId: BlockId | undefined, exclude?: BlockId): BlockId[] {
  return Object.keys(layout.blocks)
    .filter((id) => id !== exclude && parentOf(layout, id) === parentId && !isOverlay(layout, id))
    .sort(compareIds);
}

/** Columns and top row of a scope: the container's rect, or the 12 columns from row 0 with no bottom. */
function scopeOf(layout: LayoutDoc, parentId: BlockId | undefined): GridRect {
  const parent = parentId !== undefined ? layout.blocks[parentId] : undefined;
  return parent ? parent.rect : { col: 0, row: 0, w: DESKTOP_COLUMNS, h: Number.POSITIVE_INFINITY };
}

const rectOf = (layout: LayoutDoc, id: BlockId): GridRect => layout.blocks[id]!.rect;

/** Moves blocks by whole rows; their descendants follow (`moveBlock` on a pure move). */
function shiftRows(layout: LayoutDoc, ids: readonly BlockId[], dy: number): LayoutDoc {
  let next = layout;
  for (const id of ids) {
    const rect = rectOf(next, id);
    next = moveBlock(next, id, { ...rect, row: rect.row + dy });
  }
  return next;
}

/**
 * The block leaves its place: when nothing else in its scope shares its rows, the blocks below move up by
 * its height so no empty band stays behind. Beside other blocks its spot just stays free.
 */
function closeBand(layout: LayoutDoc, id: BlockId): LayoutDoc {
  const rect = rectOf(layout, id);
  const siblings = childrenOf(layout, parentOf(layout, id), id);
  const shared = siblings.some((sibling) => {
    const other = rectOf(layout, sibling);
    return other.row < bottomOf(rect) && bottomOf(other) > rect.row;
  });
  if (shared) return layout;
  return shiftRows(layout, siblings.filter((sibling) => rectOf(layout, sibling).row >= bottomOf(rect)), -rect.h);
}

/** Lowest bottom of a scope's flow blocks (its top row when it has none). */
function contentBottom(layout: LayoutDoc, parentId: BlockId | undefined): number {
  return childrenOf(layout, parentId).reduce((max, id) => Math.max(max, bottomOf(rectOf(layout, id))), scopeOf(layout, parentId).row);
}

/**
 * Grows a container until its content fits, pushing the blocks below it in its own scope by the same
 * rows, and so on up to the root. A modal grows without pushing (it is outside the flow).
 */
function growToFit(layout: LayoutDoc, parentId: BlockId | undefined): LayoutDoc {
  let next = layout;
  let current = parentId;
  const seen = new Set<BlockId>();
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    const rect = rectOf(next, current);
    const need = contentBottom(next, current);
    const oldBottom = bottomOf(rect);
    if (need <= oldBottom) break;
    // A resize: the container's own content stays where it is.
    next = moveBlock(next, current, { ...rect, h: need - rect.row });
    if (isOverlay(next, current)) break;
    const outer = parentOf(next, current);
    const grown = next;
    const below = childrenOf(grown, outer, current).filter((id) => rectOf(grown, id).row >= oldBottom);
    next = shiftRows(next, below, need - oldBottom);
    current = outer;
  }
  return next;
}

/** First row at or below `from` that no block of `ids` straddles: a band can be inserted there cleanly. */
function cleanCut(layout: LayoutDoc, ids: readonly BlockId[], from: number): number {
  let row = from;
  for (;;) {
    const at = row;
    const straddling = ids.map((id) => rectOf(layout, id)).filter((rect) => rect.row < at && bottomOf(rect) > at);
    if (straddling.length === 0) return row;
    row = Math.max(...straddling.map(bottomOf));
  }
}

function setParent(layout: LayoutDoc, id: BlockId, parentId: BlockId | undefined): LayoutDoc {
  const block = { ...layout.blocks[id]! };
  if (parentId === undefined) delete block.parentId;
  else block.parentId = parentId;
  return { ...layout, blocks: { ...layout.blocks, [id]: block } };
}

/** The rect kept inside a scope's columns (narrower when the scope is narrower). */
function fitColumns(rect: GridRect, scope: GridRect): GridRect {
  const w = Math.max(1, Math.min(rect.w, scope.w));
  const col = Math.min(Math.max(rect.col, scope.col), scope.col + scope.w - w);
  return { ...rect, col, w };
}

/** Whether `parentId` is a valid destination of «Dentro de…» for the block. */
export function canMoveInto(layout: LayoutDoc, id: BlockId, parentId: BlockId): boolean {
  if (id === parentId || !layout.blocks[id] || !layout.blocks[parentId]) return false;
  if (isOverlay(layout, id) || parentOf(layout, id) === parentId) return false;
  if (descendantsOf(layout, id).has(parentId)) return false;
  return canContain(layout, parentId, id);
}

/** The layout after the move, or `null` when the move does not apply to this block. */
export function plannedLayout(layout: LayoutDoc, id: BlockId, target: MoveTarget): LayoutDoc | null {
  if (!layout.blocks[id] || isOverlay(layout, id)) return null;
  const parentId = parentOf(layout, id);
  switch (target.kind) {
    case "top": {
      // Everything in the scope moves down by the block's height; the block takes the top rows.
      let next = closeBand(layout, id);
      const rect = rectOf(next, id);
      const top = scopeOf(next, parentId).row;
      next = shiftRows(next, childrenOf(next, parentId, id), rect.h);
      next = moveBlock(next, id, { ...rect, row: top });
      return growToFit(next, parentId);
    }
    case "bottom": {
      let next = closeBand(layout, id);
      const rect = rectOf(next, id);
      const closed = next;
      const siblings = childrenOf(closed, parentId, id);
      const row = siblings.length > 0 ? Math.max(...siblings.map((sibling) => bottomOf(rectOf(closed, sibling)))) : scopeOf(closed, parentId).row;
      next = moveBlock(next, id, { ...rect, row });
      return growToFit(next, parentId);
    }
    case "out": {
      if (parentId === undefined) return null;
      // Right below its old container, in the container's own scope; what was below moves down.
      let next = closeBand(layout, id);
      const rect = rectOf(next, id);
      const parentRect = rectOf(next, parentId);
      const outer = parentOf(next, parentId);
      next = setParent(next, id, outer);
      const moved = next;
      const siblings = childrenOf(moved, outer, id);
      const row = cleanCut(moved, siblings, bottomOf(parentRect));
      next = shiftRows(next, siblings.filter((sibling) => rectOf(moved, sibling).row >= row), rect.h);
      next = moveBlock(next, id, { ...fitColumns(rect, scopeOf(next, outer)), row });
      return growToFit(next, outer);
    }
    case "into": {
      if (!canMoveInto(layout, id, target.parentId)) return null;
      // The first free slot inside the container (the engine's rule); it grows when full.
      let next = closeBand(layout, id);
      const rect = rectOf(next, id);
      const slot = findFreeSlot(next, { w: rect.w, h: rect.h }, { parentId: target.parentId }).rect;
      next = setParent(next, id, target.parentId);
      // A pure move first so the block's own content follows it, then the width of a narrower container.
      next = moveBlock(next, id, { ...rect, col: slot.col, row: slot.row });
      if (slot.w !== rect.w) next = moveBlock(next, id, { ...rect, col: slot.col, row: slot.row, w: slot.w });
      return growToFit(next, target.parentId);
    }
  }
}

function depthOf(layout: LayoutDoc, id: BlockId): number {
  let depth = 0;
  const seen = new Set<BlockId>([id]);
  let current = parentOf(layout, id);
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    depth++;
    current = parentOf(layout, current);
  }
  return depth;
}

/**
 * Fixes that turn `before` into `after` when applied in order with `applyFix`: parent changes first
 * (`nest` / `unparent`), then a `fit-inside` (a raw `moveBlock`) for every block whose rect changed and
 * everything under it, parents before children. A parent's pure move drags its children, so each child
 * is set again afterwards to land exactly where the plan put it.
 */
export function diffToFixes(before: LayoutDoc, after: LayoutDoc): LayoutFix[] {
  const ids = Object.keys(after.blocks).filter((id) => before.blocks[id]).sort(compareIds);
  const fixes: LayoutFix[] = [];
  for (const id of ids) {
    const was = parentOf(before, id);
    const now = parentOf(after, id);
    if (was === now) continue;
    fixes.push(now === undefined ? { kind: "unparent", id } : { kind: "nest", id, parentId: now });
  }
  const touched = new Set<BlockId>();
  for (const id of ids) {
    if (sameRect(before.blocks[id]!.rect, after.blocks[id]!.rect)) continue;
    touched.add(id);
    for (const descendant of descendantsOf(after, id)) touched.add(descendant);
  }
  const ordered = [...touched].sort((a, b) => depthOf(after, a) - depthOf(after, b) || compareIds(a, b));
  for (const id of ordered) fixes.push({ kind: "fit-inside", id, rect: { ...after.blocks[id]!.rect } });
  return fixes;
}

/** Fixes of a move (one batch = one undo step); empty when the move changes nothing or does not apply. */
export function planMoveTo(layout: LayoutDoc, id: BlockId, target: MoveTarget): LayoutFix[] {
  const after = plannedLayout(layout, id, target);
  return after ? diffToFixes(layout, after) : [];
}

/**
 * Horizontal placement inside the scope: flush left or right, centered, or full width (keeps the row and
 * the height). `null` when the block is already there. It goes through `setRect`, like a drop.
 */
export function alignRect(layout: LayoutDoc, id: BlockId, align: AlignTarget): GridRect | null {
  const block = layout.blocks[id];
  if (!block) return null;
  const scope = scopeOf(layout, parentOf(layout, id));
  const width = Math.max(1, Math.min(scope.w, DESKTOP_COLUMNS));
  const w = align === "full" ? width : Math.max(1, Math.min(block.rect.w, width));
  const col =
    align === "left" || align === "full"
      ? scope.col
      : align === "right"
        ? scope.col + width - w
        : scope.col + Math.floor((width - w) / 2);
  const next = { ...block.rect, col, w };
  return sameRect(next, block.rect) ? null : next;
}

/** Everything «Mover a…» can offer for the block (the order moves are planned to know if they change anything). */
export function moveOptions(layout: LayoutDoc, id: BlockId): MoveOptions {
  const align = Object.fromEntries(ALIGN_TARGETS.map((target) => [target, alignRect(layout, id, target) !== null])) as Record<AlignTarget, boolean>;
  if (!layout.blocks[id] || isOverlay(layout, id)) return { top: false, bottom: false, out: false, into: [], align };
  const into = Object.keys(layout.blocks)
    .filter((candidate) => canMoveInto(layout, id, candidate))
    .sort((a, b) => {
      const ra = rectOf(layout, a);
      const rb = rectOf(layout, b);
      return ra.row - rb.row || ra.col - rb.col || compareIds(a, b);
    });
  return {
    top: planMoveTo(layout, id, { kind: "top" }).length > 0,
    bottom: planMoveTo(layout, id, { kind: "bottom" }).length > 0,
    out: parentOf(layout, id) !== undefined,
    into,
    align,
  };
}
