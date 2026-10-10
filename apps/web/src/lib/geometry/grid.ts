import { MAX_HEIGHT_ROWS, MAX_ROW, type GridRect } from "@dialmade/layout";
import { clamp, type Handle, type Point } from "./rect";

/**
 * Grid geometry of the Layout canvas. The grid is drawn in screen px (no CSS `scale()`): one column is
 * `colPx` wide and one row `rowPx` tall, so pointer deltas convert straight to grid units. Rects are
 * `GridRect`s (integers; `col`/`w` in columns, `row`/`h` in rows) and every helper returns a valid one:
 * inside `0..columns` horizontally, `row` in `0..MAX_ROW`, at least the minimum size and at most
 * `MAX_HEIGHT_ROWS` tall: the frame grows down to the engine's bounds, never past them. Pure functions, no DOM.
 */

/** Size of one grid cell on screen and the number of columns of the frame (12 desktop, 8 tablet, 4 mobile). */
export type GridMetrics = { colPx: number; rowPx: number; columns: number };
/** A rect in screen px, relative to the top-left corner of the grid. */
export type PxRect = { left: number; top: number; width: number; height: number };
/** A cell of the grid (0-based). */
export type GridCell = { col: number; row: number };
/** Minimum size in grid units (`w` columns × `h` rows). */
export type GridSize = { w: number; h: number };

/** px per grid row in the layout model (`LayoutDoc.rowUnit`). */
export const ROW_UNIT_PX = 8;

/** Rows → px of the design (not screen px): what users read for vertical position and height. */
export const rowsToPx = (rows: number): number => rows * ROW_UNIT_PX;

/** Integer rounding that never yields `-0`. */
const round = (value: number): number => Math.round(value) || 0;

/** `value / step` that stays finite when the step is 0 (a frame not measured yet). */
const units = (px: number, step: number): number => (step > 0 && Number.isFinite(px) ? px / step : 0);

/** Minimum size clamped to something that fits: ≥ 1 and `w ≤ columns`. */
function minSize(min: GridSize, columns: number): GridSize {
  return { w: clamp(Math.floor(min.w) || 1, 1, Math.max(1, columns)), h: Math.max(1, Math.floor(min.h) || 1) };
}

/** Clamps a rect into the columns (width first, then position) and its row and height into the engine's bounds. */
function fit(rect: GridRect, columns: number): GridRect {
  const w = clamp(rect.w, 1, Math.max(1, columns));
  return { col: clamp(rect.col, 0, Math.max(0, columns - w)), row: clamp(rect.row, 0, MAX_ROW), w, h: clamp(rect.h, 1, MAX_HEIGHT_ROWS) };
}

/** Grid rect → screen px (relative to the grid origin). */
export function gridToPx(rect: GridRect, m: GridMetrics): PxRect {
  return { left: rect.col * m.colPx, top: rect.row * m.rowPx, width: rect.w * m.colPx, height: rect.h * m.rowPx };
}

/** Screen point (relative to the grid origin) → the cell under it: column floored, row rounded to the nearest line. */
export function pxToCell(point: Point, m: GridMetrics): GridCell {
  const col = clamp(Math.floor(units(point.x, m.colPx)), 0, Math.max(0, m.columns - 1));
  const row = Math.max(0, round(units(point.y, m.rowPx)));
  return { col, row };
}

/** Body drag: moves `start` by whole columns/rows (rounded) and keeps it inside the columns and below row 0. */
export function snapMove(start: GridRect, dxPx: number, dyPx: number, m: GridMetrics): GridRect {
  return fit(
    { ...start, col: start.col + round(units(dxPx, m.colPx)), row: start.row + round(units(dyPx, m.rowPx)) },
    m.columns,
  );
}

/**
 * Handle drag: moves the edges of `handle` by whole columns/rows, anchored on the opposite edge or
 * corner. The result stays inside the columns, below row 0 and at least `min` (clamped to the columns).
 */
export function snapResize(start: GridRect, handle: Handle, dxPx: number, dyPx: number, m: GridMetrics, min: GridSize): GridRect {
  const { columns } = m;
  const size = minSize(min, columns);
  const dc = round(units(dxPx, m.colPx));
  const dr = round(units(dyPx, m.rowPx));
  const left = start.col;
  const right = start.col + start.w;
  const top = start.row;
  const bottom = start.row + start.h;
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  let x0 = west ? clamp(left + dc, 0, right - size.w) : left;
  let x1 = east ? clamp(right + dc, left + size.w, columns) : right;
  let y0 = north ? clamp(top + dr, 0, bottom - size.h) : top;
  let y1 = south ? Math.max(bottom + dr, top + size.h) : bottom;

  // A start rect that is already too small or out of bounds: grow away from the anchor, then fit.
  if (x1 - x0 < size.w) {
    if (west) x0 = x1 - size.w;
    else x1 = x0 + size.w;
  }
  if (y1 - y0 < size.h) {
    if (north) y0 = y1 - size.h;
    else y1 = y0 + size.h;
  }
  if (y0 < 0) {
    y1 += -y0;
    y0 = 0;
  }
  return fit({ col: x0, row: y0, w: x1 - x0, h: y1 - y0 }, columns);
}

/**
 * Draw tool: the rect between two screen points, both snapped outwards (floor the near edge, ceil the
 * far one) so it covers both points. Points outside the grid are clamped into it; a rect smaller than
 * `min` grows in the drag direction.
 */
export function snapDraw(anchorPx: Point, pointPx: Point, m: GridMetrics, min: GridSize): GridRect {
  const { columns } = m;
  const size = minSize(min, columns);
  const ax = clamp(units(anchorPx.x, m.colPx), 0, columns);
  const px = clamp(units(pointPx.x, m.colPx), 0, columns);
  const ay = Math.max(0, units(anchorPx.y, m.rowPx));
  const py = Math.max(0, units(pointPx.y, m.rowPx));

  let x0 = Math.floor(Math.min(ax, px));
  let x1 = Math.ceil(Math.max(ax, px));
  let y0 = Math.floor(Math.min(ay, py));
  let y1 = Math.ceil(Math.max(ay, py));

  if (x1 - x0 < size.w) {
    if (px < ax) x0 = x1 - size.w;
    else x1 = x0 + size.w;
  }
  if (y1 - y0 < size.h) {
    if (py < ay) y0 = Math.max(0, y1 - size.h);
    y1 = Math.max(y1, y0 + size.h);
  }
  return fit({ col: x0, row: y0, w: x1 - x0, h: y1 - y0 }, columns);
}

const STEPS: ReadonlyMap<string, GridCell> = new Map([
  ["ArrowLeft", { col: -1, row: 0 }],
  ["ArrowRight", { col: 1, row: 0 }],
  ["ArrowUp", { col: 0, row: -1 }],
  ["ArrowDown", { col: 0, row: 1 }],
]);

/**
 * Keyboard nudge of a grabbed block: arrows move 1 column / 1 row (8 px). With `resize`, Right/Down grow
 * and Left/Up shrink the width/height from the top-left corner (never below `min`, 1×1 by default).
 * Other keys return `rect` unchanged (same object).
 */
export function nudgeGrid(rect: GridRect, key: string, resize: boolean, columns: number, min: GridSize = { w: 1, h: 1 }): GridRect {
  const step = STEPS.get(key);
  if (!step) return rect;
  if (!resize) return fit({ ...rect, col: rect.col + step.col, row: rect.row + step.row }, columns);
  const size = minSize(min, columns);
  const col = clamp(rect.col, 0, Math.max(0, columns - size.w));
  return fit(
    {
      ...rect,
      col,
      w: clamp(rect.w + step.col, size.w, columns - col),
      h: Math.max(size.h, rect.h + step.row),
    },
    columns,
  );
}
