import { getBlockDef, isLibraryBlockType, layoutBounds, type AppShell, type BlockId, type LayoutDoc } from "@dialmade/layout";
import { DEVICE_WIDTHS } from "@/lib/devices";
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";

/*
 * Geometry of a screen thumbnail. The viewBox unit is the design px of a desktop screen (1440 wide), so
 * blocks keep their real proportions: a column is (frame width − navigation) / 12 and a row is 8 px. The
 * app navigation frame and the page header strip take their real share, like on the canvas. Pure, no DOM.
 */

/** Width of the thumbnail frame in design px: a desktop screen. */
export const THUMB_WIDTH = DEVICE_WIDTHS.desktop;
/**
 * The frame is at least this wide relative to its height (4:3). The SVG fills its box with
 * `xMidYMin slice`, so a box of 4:3 or wider shows the top of the screen and never crops its sides.
 */
export const THUMB_MAX_ASPECT = 4 / 3;
/** Empty space kept below the lowest block. */
export const THUMB_PAD_PX = 48;
/** Inset of each block (more for nested ones), so neighbours read as separate boxes. */
export const THUMB_GAP_PX = 6;
/** Smallest drawn side of a block, so a tiny block never disappears. */
export const THUMB_MIN_SIDE_PX = 4;

export type ThumbRect = { x: number; y: number; width: number; height: number };
/** How a block is painted: a plain block, a container (outline only) or an overlay (above the rest). */
export type ThumbBlockKind = "block" | "container" | "overlay";
export type ThumbBlock = ThumbRect & { id: BlockId; kind: ThumbBlockKind; hidden: boolean };

export type ThumbnailModel = {
  /** viewBox size in design px. */
  width: number;
  height: number;
  /** App navigation frame (sidebar, rail or top bar), `null` without one. */
  nav: ThumbRect | null;
  /** Page header strip of an app screen (`shell.header`). */
  header: ThumbRect | null;
  /** In paint order: parents before children, overlays last. */
  blocks: ThumbBlock[];
};

const finite = (value: number) => Number.isFinite(value);

/** Parent chain length; stops at missing parents and cycles (they are drawn at the root). */
function ancestry(layout: LayoutDoc, id: BlockId): { depth: number; hidden: boolean } {
  const seen = new Set<BlockId>([id]);
  let depth = 0;
  let hidden = layout.blocks[id]?.hidden === true;
  let parentId = layout.blocks[id]?.parentId;
  while (parentId !== undefined && !seen.has(parentId)) {
    const parent = layout.blocks[parentId];
    if (!parent) break;
    seen.add(parentId);
    depth++;
    // Hiding is inherited: a block inside a hidden one is hidden too.
    if (parent.hidden) hidden = true;
    parentId = parent.parentId;
  }
  return { depth, hidden };
}

function kindOf(type: string): ThumbBlockKind {
  if (!isLibraryBlockType(type)) return "block";
  const def = getBlockDef(type);
  if (def.overlay) return "overlay";
  return def.container ? "container" : "block";
}

/** Where the 12-column content grid starts and how wide it is, after the navigation frame. */
function contentBox(shell: AppShell | null | undefined): { x: number; y: number; width: number; nav: ThumbRect | null; headerY: number | null } {
  const nav = shell?.nav ?? "none";
  const side = nav === "sidebar" ? NAV_FRAME_PX.sidebar : nav === "rail" ? NAV_FRAME_PX.rail : 0;
  const top = nav === "topnav" ? NAV_FRAME_PX.topnav : 0;
  const header = shell?.header ? top : null;
  return {
    x: side,
    y: top + (header !== null ? HEADER_STRIP_PX : 0),
    width: THUMB_WIDTH - side,
    // The frame height is only known at the end; 0 is replaced there.
    nav: side > 0 ? { x: 0, y: 0, width: side, height: 0 } : top > 0 ? { x: 0, y: 0, width: THUMB_WIDTH, height: top } : null,
    headerY: header,
  };
}

/**
 * What a thumbnail draws for a layout (and the navigation frame of an app screen). Blocks with an invalid
 * rect are skipped; rects outside the grid are clamped into it.
 */
export function thumbnailModel(layout: LayoutDoc, shell?: AppShell | null): ThumbnailModel {
  const columns = finite(layout.columns) && layout.columns > 0 ? layout.columns : 12;
  const rowUnit = finite(layout.rowUnit) && layout.rowUnit > 0 ? layout.rowUnit : 8;
  const box = contentBox(shell);
  const colWidth = box.width / columns;

  const painted: (ThumbBlock & { depth: number; z: number })[] = [];
  for (const [id, block] of Object.entries(layout.blocks)) {
    const rect = block?.rect;
    if (!rect || ![rect.col, rect.row, rect.w, rect.h].every(finite)) continue;
    const col = Math.min(Math.max(0, Math.round(rect.col)), columns - 1);
    const w = Math.min(Math.max(1, Math.round(rect.w)), columns - col);
    const row = Math.max(0, Math.round(rect.row));
    const h = Math.max(1, Math.round(rect.h));
    const { depth, hidden } = ancestry(layout, id);
    const inset = THUMB_GAP_PX * (1 + depth);
    const width = Math.max(THUMB_MIN_SIDE_PX, w * colWidth - 2 * inset);
    const height = Math.max(THUMB_MIN_SIDE_PX, h * rowUnit - 2 * inset);
    painted.push({
      id,
      kind: kindOf(block.type),
      hidden,
      x: box.x + col * colWidth + (w * colWidth - width) / 2,
      y: box.y + row * rowUnit + (h * rowUnit - height) / 2,
      width,
      height,
      depth,
      z: finite(block.z) ? block.z : 0,
    });
  }
  painted.sort(
    (a, b) =>
      Number(a.kind === "overlay") - Number(b.kind === "overlay") ||
      a.depth - b.depth ||
      a.z - b.z ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  const bounds = layoutBounds(layout);
  const contentBottom = box.y + (finite(bounds) ? bounds : 0) * rowUnit + THUMB_PAD_PX;
  const height = Math.max(Math.ceil(contentBottom), Math.ceil(THUMB_WIDTH / THUMB_MAX_ASPECT));

  return {
    width: THUMB_WIDTH,
    height,
    nav: box.nav ? { ...box.nav, height: box.nav.height || height } : null,
    header: box.headerY !== null ? { x: box.x, y: box.headerY, width: box.width, height: HEADER_STRIP_PX } : null,
    blocks: painted.map(({ id, kind, hidden, x, y, width, height }) => ({ id, kind, hidden, x, y, width, height })),
  };
}
