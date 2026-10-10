import {
  CONTAINMENT_RATIO,
  getBlockDef,
  isLibraryBlockType,
  type Adjustment,
  type AppNav,
  type AppShell,
  type BlockId,
  type Breakpoint,
  type GridRect,
  type LayoutDoc,
  type LayoutWarning,
} from "@dialmade/layout";
// Relative imports only: vitest runs this module without the `@/` alias.
import { DEVICE_COLUMNS, DEVICE_WIDTHS } from "../../../lib/devices";
import { nudgeGrid, ROW_UNIT_PX, snapDraw, snapMove, snapResize, type GridMetrics, type GridSize } from "../../../lib/geometry/grid";
import type { Handle, Point } from "../../../lib/geometry/rect";
import { FRAME_GUTTER_PX, FRAME_MIN_ROWS, FRAME_PAD_ROWS, HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import { AUTO_SCROLL_EDGE_PX, AUTO_SCROLL_MAX_STEP, DRAG_THRESHOLD_PX, MIN_BLOCK_SIZE, Z_DEPTH_STEP } from "./constants";

/*
 * Pure helpers of the Layout canvas: frame geometry in screen px (no CSS `scale()`), pointer → grid
 * conversions for move / resize / draw / pan, library drop placement, containment hit testing, stacking,
 * the keyboard grab reducer and the summary of what a drop adjusted. No DOM, no React.
 */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Integer rounding that never yields `-0`. */
const round = (value: number) => Math.round(value) || 0;

/* ------------------------------------------------------------------------------------------------ */
/* Frame geometry                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

/** Narrowest frame the canvas draws, even when the column it lives in is narrower (it scrolls). */
export const MIN_FRAME_WIDTH = 240;

/** An app navigation frame as drawn: a column on the left (sidebar, rail) or a bar on top. */
export type NavFrame = { nav: Exclude<AppNav, "none">; side: "left" | "top"; size: number };

export type FrameGeometry = {
  device: Breakpoint;
  /** Width of the device in design px (1440 / 768 / 390). */
  deviceWidth: number;
  /** Width of the frame on screen. */
  frameWidth: number;
  /** Screen px per design px. */
  k: number;
  nav: NavFrame | null;
  /** Page header strip of an app screen (`shell.header`), above the content and right of a side nav. */
  header: { left: number; top: number; height: number } | null;
  /** Origin of the content grid inside the frame and its width. */
  content: { left: number; top: number; width: number };
  /** Grid cell on screen: `colPx = content.width / columns`, `rowPx = 8 · k`. */
  metrics: GridMetrics;
};

/**
 * The navigation as each device draws it: tablet folds a sidebar into a rail; mobile turns any navigation
 * into a top bar (the hamburger / drawer of `deriveResponsive`).
 */
export function navForDevice(nav: AppNav, device: Breakpoint): AppNav {
  if (nav === "none" || device === "desktop") return nav;
  if (device === "mobile") return "topnav";
  return nav === "sidebar" ? "rail" : nav;
}

/**
 * Geometry of the device frame for an available width (the scroller's client width): the frame is
 * `min(available − 2 · gutter, device width)` wide, and the grid lives right of / below the app chrome.
 */
export function frameGeometry(available: number, device: Breakpoint, shell: AppShell | null): FrameGeometry {
  const deviceWidth = DEVICE_WIDTHS[device];
  const columns = DEVICE_COLUMNS[device];
  const room = Number.isFinite(available) ? available - 2 * FRAME_GUTTER_PX : 0;
  const frameWidth = Math.max(Math.min(MIN_FRAME_WIDTH, deviceWidth), Math.min(Math.floor(room), deviceWidth));
  const k = frameWidth / deviceWidth;

  const navKind = shell ? navForDevice(shell.nav, device) : "none";
  let nav: NavFrame | null = null;
  if (navKind === "sidebar" || navKind === "rail") nav = { nav: navKind, side: "left", size: NAV_FRAME_PX[navKind] * k };
  else if (navKind === "topnav") nav = { nav: navKind, side: "top", size: NAV_FRAME_PX.topnav * k };

  const left = nav?.side === "left" ? nav.size : 0;
  const navTop = nav?.side === "top" ? nav.size : 0;
  const header = shell?.header ? { left, top: navTop, height: HEADER_STRIP_PX * k } : null;
  const top = navTop + (header?.height ?? 0);
  const width = frameWidth - left;
  return {
    device,
    deviceWidth,
    frameWidth,
    k,
    nav,
    header,
    content: { left, top, width },
    metrics: { colPx: width / columns, rowPx: ROW_UNIT_PX * k, columns },
  };
}

/** Rows the frame shows: room below the lowest block (at least `FRAME_MIN_ROWS`) plus «+ Añadir espacio». */
export function frameRows(bottomRow: number, extraRows = 0): number {
  const bottom = Number.isFinite(bottomRow) ? Math.max(0, bottomRow) : 0;
  return Math.max(bottom + FRAME_PAD_ROWS, FRAME_MIN_ROWS) + Math.max(0, Math.round(extraRows) || 0);
}

/** Height of the frame on screen for `rows` rows of content. */
export const frameHeightPx = (geometry: FrameGeometry, rows: number): number => geometry.content.top + rows * geometry.metrics.rowPx;

/** Bottom row of a set of rects (`null`s are hidden blocks), 0 when there is none. */
export function bottomRow(rects: Iterable<GridRect | null | undefined>): number {
  let max = 0;
  for (const rect of rects) if (rect) max = Math.max(max, rect.row + rect.h);
  return max;
}

/** `{ left, top, width, height }` in screen px of a grid rect, with an inset so neighbours read apart. */
export function blockBox(rect: GridRect, m: GridMetrics, inset = 2) {
  const left = rect.col * m.colPx + inset;
  const top = rect.row * m.rowPx + inset;
  return { left, top, width: Math.max(0, rect.w * m.colPx - 2 * inset), height: Math.max(0, rect.h * m.rowPx - 2 * inset) };
}

/* ------------------------------------------------------------------------------------------------ */
/* Pointer gestures                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** A point in client px relative to an element's top-left corner (its bounding rect). */
export const relativePoint = (client: Point, origin: { left: number; top: number }): Point => ({
  x: client.x - origin.left,
  y: client.y - origin.top,
});

/** Whether the pointer travelled far enough from where it was pressed to start a drag. */
export function pastThreshold(origin: Point, point: Point, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(point.x - origin.x, point.y - origin.y) >= threshold;
}

/** Body drag from `origin` to `point` (both relative to the grid origin): snapped, inside the columns. */
export const moveGesture = (start: GridRect, origin: Point, point: Point, m: GridMetrics): GridRect =>
  snapMove(start, point.x - origin.x, point.y - origin.y, m);

/** Handle drag: moves the handle's edges by whole cells, anchored on the opposite side, never below `min`. */
export const resizeGesture = (
  start: GridRect,
  handle: Handle,
  origin: Point,
  point: Point,
  m: GridMetrics,
  min: GridSize = MIN_BLOCK_SIZE,
): GridRect => snapResize(start, handle, point.x - origin.x, point.y - origin.y, m, min);

/** Draw tool: the snapped box between the anchor and the pointer (both relative to the grid origin). */
export const drawGesture = (anchor: Point, point: Point, m: GridMetrics, min: GridSize = MIN_BLOCK_SIZE): GridRect =>
  snapDraw(anchor, point, m, min);

/** Hand tool: scroll position after dragging from `origin` to `point` (client px), never negative. */
export function panScroll(start: { left: number; top: number }, origin: Point, point: Point): { left: number; top: number } {
  return { left: Math.max(0, start.left - (point.x - origin.x)), top: Math.max(0, start.top - (point.y - origin.y)) };
}

/**
 * Auto-scroll step (px per frame, negative = up) while a gesture holds the pointer near the scroller's
 * top or bottom edge: 0 outside the edge band, growing linearly to `max` at (and past) the edge.
 */
export function edgeScrollStep(y: number, viewport: { top: number; bottom: number }, edge = AUTO_SCROLL_EDGE_PX, max = AUTO_SCROLL_MAX_STEP): number {
  if (!(viewport.bottom - viewport.top > 2 * edge) || !Number.isFinite(y)) return 0;
  if (y < viewport.top + edge) return -Math.ceil(max * clamp((viewport.top + edge - y) / edge, 0, 1));
  if (y > viewport.bottom - edge) return Math.ceil(max * clamp((y - (viewport.bottom - edge)) / edge, 0, 1));
  return 0;
}

/** A grid point stored in grid units (survives a resize of the frame) ↔ screen px. */
export const toGridUnits = (point: Point, m: GridMetrics): Point => ({
  x: m.colPx > 0 ? point.x / m.colPx : 0,
  y: m.rowPx > 0 ? point.y / m.rowPx : 0,
});
export const fromGridUnits = (units: Point, m: GridMetrics): Point => ({ x: units.x * m.colPx, y: units.y * m.rowPx });

/* ------------------------------------------------------------------------------------------------ */
/* Library drop                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Where a library block dropped at `point` (relative to the grid origin) goes: its default size centred
 * on the pointer, snapped to the grid and kept inside the columns and below row 0.
 */
export function dropRect(point: Point, size: { w: number; h: number }, m: GridMetrics): GridRect {
  const w = clamp(Math.round(size.w) || 1, 1, Math.max(1, m.columns));
  const h = Math.max(1, Math.round(size.h) || 1);
  const x = m.colPx > 0 && Number.isFinite(point.x) ? point.x / m.colPx : 0;
  const y = m.rowPx > 0 && Number.isFinite(point.y) ? point.y / m.rowPx : 0;
  return { col: clamp(round(x - w / 2), 0, m.columns - w), row: Math.max(0, round(y - h / 2)), w, h };
}

/** Default desktop size of a library type («Bloque libre» for anything unknown). */
export function defaultSizeOf(type: unknown): { w: number; h: number } {
  return getBlockDef(isLibraryBlockType(type) ? type : "free").defaultSize;
}

/* ------------------------------------------------------------------------------------------------ */
/* Hit testing and stacking                                                                         */
/* ------------------------------------------------------------------------------------------------ */

function coverage(outer: GridRect, inner: GridRect): number {
  const w = Math.min(outer.col + outer.w, inner.col + inner.w) - Math.max(outer.col, inner.col);
  const h = Math.min(outer.row + outer.h, inner.row + inner.h) - Math.max(outer.row, inner.row);
  const area = inner.w * inner.h;
  return w > 0 && h > 0 && area > 0 ? (w * h) / area : 0;
}

/**
 * The container a rect would land in (what `normalizeDrop` nests it into): the smallest container that
 * holds ≥90 % of it, the deeper one on a tie. `exclude` leaves out the moving block and its descendants.
 */
export function containerFor(layout: LayoutDoc, rect: GridRect, exclude: ReadonlySet<BlockId> = new Set()): BlockId | null {
  let best: { id: BlockId; area: number } | null = null;
  for (const id of Object.keys(layout.blocks).sort()) {
    const block = layout.blocks[id];
    if (!block || exclude.has(id) || !isLibraryBlockType(block.type) || !getBlockDef(block.type).container) continue;
    if (coverage(block.rect, rect) < CONTAINMENT_RATIO) continue;
    const area = block.rect.w * block.rect.h;
    if (!best || area < best.area) best = { id, area };
  }
  return best?.id ?? null;
}

/** A block and every descendant (explicit `parentId` chain), cycle-safe. */
export function withDescendants(layout: LayoutDoc, id: BlockId): Set<BlockId> {
  const children = new Map<BlockId, BlockId[]>();
  for (const [childId, block] of Object.entries(layout.blocks)) {
    if (block.parentId === undefined) continue;
    const list = children.get(block.parentId) ?? [];
    list.push(childId);
    children.set(block.parentId, list);
  }
  const out = new Set<BlockId>([id]);
  const queue = [id];
  while (queue.length > 0) {
    for (const child of children.get(queue.pop()!) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      queue.push(child);
    }
  }
  return out;
}

/** Nesting depth of every block (0 = root). Missing parents and cycles count as root. */
export function blockDepths(layout: LayoutDoc): Map<BlockId, number> {
  const depths = new Map<BlockId, number>();
  const depthOf = (id: BlockId): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    const seen = new Set<BlockId>([id]);
    const chain: BlockId[] = [id];
    let current = layout.blocks[id]?.parentId;
    while (current !== undefined && layout.blocks[current] && !seen.has(current) && !depths.has(current)) {
      seen.add(current);
      chain.push(current);
      current = layout.blocks[current]?.parentId;
    }
    // A cycle (current already seen) or a missing parent: the top of the chain is a root.
    let base = current !== undefined && depths.has(current) ? depths.get(current)! + 1 : 0;
    for (let index = chain.length - 1; index >= 0; index--) depths.set(chain[index]!, base++);
    return depths.get(id)!;
  };
  for (const id of Object.keys(layout.blocks)) depthOf(id);
  return depths;
}

/** CSS z-index of a block: deeper blocks always above their parents, then the block's own `z`. */
export const stackingZ = (depth: number, z: number): number =>
  Math.max(0, Math.round(depth) || 0) * Z_DEPTH_STEP + clamp(Math.round(z) || 0, 0, Z_DEPTH_STEP - 1) + 1;

/** Warnings grouped by the block they are about (`ids[0]`: the block first, then its container). */
export function warningsByBlock(warnings: readonly LayoutWarning[]): Map<BlockId, LayoutWarning[]> {
  const out = new Map<BlockId, LayoutWarning[]>();
  for (const warning of warnings) {
    const id = warning.ids[0];
    if (id === undefined) continue;
    const list = out.get(id);
    if (list) list.push(warning);
    else out.set(id, [warning]);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* Keyboard grab                                                                                    */
/* ------------------------------------------------------------------------------------------------ */

/** A block picked up with Space/Enter: where it started and where it is now (local preview, no store writes). */
export type KeyboardGrab = { id: BlockId; start: GridRect; rect: GridRect };

export type GrabInput = {
  key: string;
  shiftKey: boolean;
  /** The focused block and its current rect (used to pick it up). */
  id: BlockId;
  rect: GridRect;
  columns: number;
  min?: GridSize;
};

/** What a key did to the keyboard grab. `none` = not a grab key: let it through. */
export type GrabStep =
  | { type: "none" }
  | { type: "grab"; grab: KeyboardGrab }
  | { type: "move" | "resize"; grab: KeyboardGrab; changed: boolean }
  | { type: "drop" | "cancel"; grab: KeyboardGrab };

const GRAB_KEYS = new Set([" ", "Enter"]);
const ARROWS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

/**
 * Keyboard grab reducer (WCAG 2.5.7 alternative to dragging): Space/Enter picks the focused block up;
 * while holding it, arrows move 1 column / 1 row, Shift + arrows resize the right/bottom edge, Space/Enter
 * or Tab drops it and Esc cancels. Keys of another block while holding one drop the held one first.
 */
export function keyboardGrabStep(grab: KeyboardGrab | null, input: GrabInput): GrabStep {
  const { key } = input;
  if (!grab || grab.id !== input.id) {
    if (grab) return GRAB_KEYS.has(key) || key === "Tab" || key === "Escape" ? { type: "drop", grab } : { type: "none" };
    return GRAB_KEYS.has(key) ? { type: "grab", grab: { id: input.id, start: input.rect, rect: input.rect } } : { type: "none" };
  }
  if (GRAB_KEYS.has(key) || key === "Tab") return { type: "drop", grab };
  if (key === "Escape") return { type: "cancel", grab };
  if (!ARROWS.has(key)) return { type: "none" };
  const rect = nudgeGrid(grab.rect, key, input.shiftKey, input.columns, input.min ?? MIN_BLOCK_SIZE);
  const changed = rect !== grab.rect && !sameRect(rect, grab.rect);
  return { type: input.shiftKey ? "resize" : "move", grab: changed ? { ...grab, rect } : grab, changed };
}

export const sameRect = (a: GridRect, b: GridRect): boolean => a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h;

/** A stable string for a rect (memo keys, motion layout dependencies). */
export const rectKey = (rect: GridRect): string => `${rect.col},${rect.row},${rect.w},${rect.h}`;

/* ------------------------------------------------------------------------------------------------ */
/* Adjustments                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** Blocks an adjustment touched (they flash white). */
export const adjustedIds = (adjustments: readonly Adjustment[]): Set<BlockId> => new Set(adjustments.map((adjustment) => adjustment.id));
