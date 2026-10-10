import {
  CONTAINMENT_RATIO,
  getBlockDef,
  isLibraryBlockType,
  type Adjustment,
  type AppNav,
  type AppShell,
  type BlockId,
  type Breakpoint,
  type BreakpointLayout,
  type GridRect,
  type LayoutDoc,
  type LayoutWarning,
  type ResponsiveLayout,
} from "@dialmade/layout";
import { DEVICE_COLUMNS, DEVICE_WIDTHS } from "@/lib/devices";
import { nudgeGrid, ROW_UNIT_PX, snapDraw, snapMove, snapResize, type GridMetrics, type GridSize, type Handle, type Point } from "@/lib/geometry";
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import {
  AUTO_SCROLL_EDGE_PX,
  AUTO_SCROLL_MAX_STEP,
  DRAG_THRESHOLD_PX,
  FRAME_GUTTER_PX,
  FRAME_MIN_ROWS,
  FRAME_PAD_ROWS,
  MIN_BLOCK_SIZE,
} from "./constants";

/*
 * Pure helpers of the Layout canvas: frame geometry in screen px (no CSS `scale()`), pointer → grid
 * conversions for move / resize / draw / pan, library drop placement, containment hit testing, stacking,
 * the keyboard grab reducer, the scroll and focus targets of keyboard and history changes, and the
 * summary of what a drop adjusted. No DOM, no React.
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

/**
 * CSS z-index of every block (1…N), in tree order like nested DOM: siblings by their `z` (then reading
 * order, then id), each block right below its own subtree. So a child is always above its parent, and a
 * later root block (a Modal, an overlapping Imagen) is above every descendant of an earlier one — never
 * global depth bands that put unrelated nested blocks over it. Missing parents count as root; a parent
 * cycle is cut where it is first met, so every block gets a number.
 */
export function stackingOrder(layout: LayoutDoc, readingOrder: readonly BlockId[] = []): Map<BlockId, number> {
  const rank = new Map(readingOrder.map((id, index) => [id, index]));
  const bySiblingOrder = (a: BlockId, b: BlockId) => {
    const za = layout.blocks[a]?.z ?? 0;
    const zb = layout.blocks[b]?.z ?? 0;
    if (za !== zb) return za - zb;
    const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const children = new Map<BlockId, BlockId[]>();
  const roots: BlockId[] = [];
  for (const [id, block] of Object.entries(layout.blocks)) {
    const parent = block.parentId;
    if (parent === undefined || parent === id || !layout.blocks[parent]) {
      roots.push(id);
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(id);
    children.set(parent, list);
  }
  const out = new Map<BlockId, number>();
  const visit = (start: BlockId) => {
    // Iterative pre-order walk: a block, then its children's subtrees in sibling order.
    const stack: BlockId[] = [start];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (out.has(id)) continue;
      out.set(id, out.size + 1);
      const kids = (children.get(id) ?? []).filter((kid) => !out.has(kid)).sort(bySiblingOrder);
      for (let index = kids.length - 1; index >= 0; index--) stack.push(kids[index]!);
    }
  };
  for (const id of roots.sort(bySiblingOrder)) visit(id);
  // Blocks only reachable through a parent cycle: the first one met (sibling order) acts as a root.
  for (const id of Object.keys(layout.blocks).sort(bySiblingOrder)) if (!out.has(id)) visit(id);
  return out;
}

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

/** Motion layout dependency of a block: its FLIP runs when the device or its grid rect changes, not on window resizes. */
export const layoutKeyOf = (device: Breakpoint, rect: GridRect): string => `${device}:${rectKey(rect)}`;

/**
 * Spring of a block's FLIP from one layout key to the next: smooth when the device changed (the move
 * between desktop and a derived view), snappy for edits. Decided per block, so the canvas never has to
 * re-render every block just to swap springs.
 */
export function layoutSpringFor(previous: string, next: string): "smooth" | "snappy" {
  const deviceOf = (key: string) => key.slice(0, Math.max(0, key.indexOf(":")));
  return deviceOf(previous) !== deviceOf(next) ? "smooth" : "snappy";
}

/* ------------------------------------------------------------------------------------------------ */
/* Pointer press → move                                                                             */
/* ------------------------------------------------------------------------------------------------ */

/**
 * A press on a block became a move: first `settle` what must land before it (a keyboard-held block is
 * dropped and committed), THEN read the block's rect and descendants from the store. Reading them at
 * pointerdown would start from a stale rect (the held block's pre-grab one) and overwrite the keyboard move.
 */
export function promoteToMove(
  id: BlockId,
  settle: () => void,
  readLayout: () => LayoutDoc,
): { start: GridRect; followers: Set<BlockId> } | null {
  settle();
  const layout = readLayout();
  const block = layout.blocks[id];
  return block ? { start: block.rect, followers: withDescendants(layout, id) } : null;
}

/* ------------------------------------------------------------------------------------------------ */
/* Scroll and focus                                                                                 */
/* ------------------------------------------------------------------------------------------------ */

/** Room kept around a block revealed in the scroller (screen px). */
export const REVEAL_MARGIN_PX = 24;

/**
 * Scroll position (scrollTop) that brings a box into the scroller's view, or `null` when it is already
 * fully visible. `box.top` is in the scroller's content px (its scrollTop space).
 * - "nearest": the least scroll that shows it with a margin; a box taller than the view is left alone
 *   while part of it shows, else its nearest edge comes in (keyboard moves, focus moves).
 * - "third": the box a third of the way down (a selection made in another panel, a device switch).
 */
export function revealScrollTop(
  view: { scrollTop: number; height: number },
  box: { top: number; height: number },
  mode: "nearest" | "third" = "nearest",
  margin = REVEAL_MARGIN_PX,
): number | null {
  if (!(view.height > 0) || !Number.isFinite(box.top) || !Number.isFinite(box.height)) return null;
  const viewTop = view.scrollTop;
  const viewBottom = view.scrollTop + view.height;
  const bottom = box.top + box.height;
  if (box.top >= viewTop && bottom <= viewBottom) return null;
  let top: number;
  if (mode === "third") {
    top = box.top - Math.max(margin, (view.height - Math.min(box.height, view.height)) / 3);
  } else if (box.height + 2 * margin <= view.height) {
    top = box.top < viewTop ? box.top - margin : bottom + margin - view.height;
  } else {
    if (bottom > viewTop + margin && box.top < viewBottom - margin) return null;
    top = box.top < viewTop ? bottom + margin - view.height : box.top - margin;
  }
  return Math.max(0, Math.round(top));
}

/**
 * Where the scroller goes after a device switch: the selected block revealed when it shows in the new
 * view (unchanged when it is already in view), else the top. Never past the content of the new view.
 */
export function scrollAfterDeviceSwitch(
  view: { scrollTop: number; height: number },
  selectedBox: { top: number; height: number } | null,
): number {
  if (!selectedBox) return 0;
  return revealScrollTop(view, selectedBox, "third") ?? view.scrollTop;
}

/** The nearest block of `order` after `id` (else before it) that still exists. */
export function nearestSurvivor(order: readonly BlockId[], id: BlockId, exists: (id: BlockId) => boolean): BlockId | null {
  const index = order.indexOf(id);
  if (index < 0) return order.find(exists) ?? null;
  for (let i = index + 1; i < order.length; i++) if (exists(order[i]!)) return order[i]!;
  for (let i = index - 1; i >= 0; i--) if (exists(order[i]!)) return order[i]!;
  return null;
}

/**
 * Where keyboard focus goes after a change that can remove the focused block (undo, redo, a toast's
 * «Deshacer»): `null` keeps it (it was not on a block and nothing is preferred, or its block survived).
 * Otherwise `prefer` (a block the change brought back), the selection, the nearest survivor in the
 * previous reading order, or the scroller — never <body>, where every canvas key stops working.
 * `focused: "lost"` is focus on <body> or on a toast that is about to close.
 */
export function focusAfterChange(input: {
  focused: BlockId | "lost" | null;
  previousOrder: readonly BlockId[];
  exists: (id: BlockId) => boolean;
  selected: BlockId | null;
  prefer?: BlockId | null;
}): BlockId | "scroller" | null {
  const { focused, previousOrder, exists, selected, prefer } = input;
  const preferred = prefer && exists(prefer) ? prefer : null;
  if (focused === null) return preferred;
  if (focused !== "lost" && exists(focused)) return null;
  if (preferred) return preferred;
  if (selected && exists(selected)) return selected;
  return (focused !== "lost" && nearestSurvivor(previousOrder, focused, exists)) || "scroller";
}

/* ------------------------------------------------------------------------------------------------ */
/* Derived views and «¿Qué es esto?»                                                                */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The derived layout a device shows, `null` on desktop (editable). It is only derived for tablet and
 * mobile: desktop never pays for (nor keeps in the history's cache) a responsive layout it does not draw.
 */
export function derivedLayoutFor(
  layout: LayoutDoc | null,
  device: Breakpoint,
  derive: (layout: LayoutDoc) => ResponsiveLayout,
): BreakpointLayout | null {
  if (device === "desktop" || !layout) return null;
  return derive(layout)[device];
}

/** «¿Qué es esto?» stays open only on desktop and while its drawn block is still on the shown screen. */
export const askingStillValid = (device: Breakpoint, layout: LayoutDoc | null, id: BlockId | null): boolean =>
  id !== null && device === "desktop" && layout?.blocks[id] !== undefined;

/* ------------------------------------------------------------------------------------------------ */
/* Adjustments                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

/** Blocks an adjustment touched (they flash white). */
export const adjustedIds = (adjustments: readonly Adjustment[]): Set<BlockId> => new Set(adjustments.map((adjustment) => adjustment.id));
