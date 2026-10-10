import {
  acceptsChild,
  BLOCK_CATEGORIES,
  getBlockDef,
  isLibraryBlockType,
  LIBRARY,
  type BlockCategory,
  type BlockId,
  type LayoutDoc,
  type LibraryBlockType,
  type ScreenKind,
} from "@dialmade/layout";

/*
 * Pure rules of the block library (no React): what a tile does on the current screen, where a click
 * inserts, the category groups and the arrow-key moves inside a grid of tiles.
 */

/**
 * What activating a tile does on a screen kind:
 * - `block`: inserts the block;
 * - `frame`: on an app screen a navbar or sidebar sets the navigation frame instead (decision 19);
 * - `appOnly`: a frame block that only exists as an app frame (sidebar on a landing): disabled.
 */
export type TileMode = "block" | "frame" | "appOnly";

export function tileModeFor(type: LibraryBlockType, kind: ScreenKind): TileMode {
  const def = getBlockDef(type);
  if (!def.frame) return "block";
  if (kind === "app") return "frame";
  return def.kinds.includes(kind) ? "block" : "appOnly";
}

/**
 * Container a click/Enter insert goes into: the selected block when it is a container, else the
 * selected block's container (so consecutive inserts keep filling the same container). Never for
 * overlays (they live outside the flow) nor for a parent that does not accept the type.
 */
export function insertParentFor(layout: LayoutDoc, selectedId: BlockId | null, type: LibraryBlockType): BlockId | undefined {
  if (!selectedId || getBlockDef(type).overlay) return undefined;
  const isContainerFor = (id: BlockId | undefined): id is BlockId => {
    const block = id !== undefined ? layout.blocks[id] : undefined;
    if (!block || !isLibraryBlockType(block.type)) return false;
    return getBlockDef(block.type).container && acceptsChild(block.type, type);
  };
  if (isContainerFor(selectedId)) return selectedId;
  const parentId = layout.blocks[selectedId]?.parentId;
  return isContainerFor(parentId) ? parentId : undefined;
}

export type LibraryCategory = { category: BlockCategory; types: readonly LibraryBlockType[] };

/** Library blocks grouped by category, in `BLOCK_CATEGORIES` order and library order inside each. */
export const LIBRARY_CATEGORIES: readonly LibraryCategory[] = BLOCK_CATEGORIES.map((category) => ({
  category,
  types: LIBRARY.filter((def) => def.category === category).map((def) => def.type),
}));

/** Categories open on first render («first two open»). */
export const DEFAULT_OPEN_CATEGORIES: readonly BlockCategory[] = BLOCK_CATEGORIES.slice(0, 2);

export const isSoon = (type: LibraryBlockType): boolean => getBlockDef(type).status === "soon";

/** Keys that move focus between tiles of a grid. */
export type GridKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

export const isGridKey = (key: string): key is GridKey =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End";

/**
 * Index of the tile focus moves to inside a grid of `count` tiles laid out in `columns` columns (row
 * major), or `null` when the move leaves the grid. Left/Right walk the reading order (and wrap rows),
 * Up/Down keep the column, Home/End go to the first and last tile. `rtl` mirrors Left and Right.
 */
export function gridNeighbor(index: number, count: number, columns: number, key: GridKey, rtl = false): number | null {
  if (count <= 0 || index < 0 || index >= count) return null;
  const cols = Math.max(1, Math.floor(columns));
  let next: number;
  switch (key) {
    case "ArrowLeft":
      next = index + (rtl ? 1 : -1);
      break;
    case "ArrowRight":
      next = index + (rtl ? -1 : 1);
      break;
    case "ArrowUp":
      next = index - cols;
      break;
    case "ArrowDown":
      next = index + cols;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
  }
  return next >= 0 && next < count && next !== index ? next : null;
}

/** Columns of a laid-out grid: how many tiles share the first tile's top edge (at least 1). */
export function columnsFromTops(tops: readonly number[]): number {
  if (tops.length === 0) return 1;
  const first = tops[0] ?? 0;
  let columns = 0;
  for (const top of tops) {
    if (Math.abs(top - first) > 1) break;
    columns++;
  }
  return Math.max(1, columns);
}
