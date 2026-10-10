import { DESKTOP_COLUMNS } from "./constants";
import { compareStrings } from "./ids";
import type { GridRect } from "./types";

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const right = (r: GridRect): number => r.col + r.w;
export const bottom = (r: GridRect): number => r.row + r.h;
export const area = (r: GridRect): number => r.w * r.h;

export function sameRect(a: GridRect, b: GridRect): boolean {
  return a.col === b.col && a.row === b.row && a.w === b.w && a.h === b.h;
}

export function copyRect(r: GridRect): GridRect {
  return { col: r.col, row: r.row, w: r.w, h: r.h };
}

/** Intersection of two rects, or null when they only touch or are apart. */
export function intersection(a: GridRect, b: GridRect): GridRect | null {
  const col = Math.max(a.col, b.col);
  const row = Math.max(a.row, b.row);
  const w = Math.min(right(a), right(b)) - col;
  const h = Math.min(bottom(a), bottom(b)) - row;
  return w > 0 && h > 0 ? { col, row, w, h } : null;
}

export function intersects(a: GridRect, b: GridRect): boolean {
  return a.col < right(b) && b.col < right(a) && a.row < bottom(b) && b.row < bottom(a);
}

export function contains(outer: GridRect, inner: GridRect): boolean {
  return inner.col >= outer.col && inner.row >= outer.row && right(inner) <= right(outer) && bottom(inner) <= bottom(outer);
}

/** Share of `inner`'s area that lies inside `outer` (0–1). */
export function coverage(outer: GridRect, inner: GridRect): number {
  const shared = intersection(outer, inner);
  return shared ? area(shared) / area(inner) : 0;
}

export function boundingBox(rects: readonly GridRect[]): GridRect {
  let col = Infinity;
  let row = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const rect of rects) {
    col = Math.min(col, rect.col);
    row = Math.min(row, rect.row);
    r = Math.max(r, right(rect));
    b = Math.max(b, bottom(rect));
  }
  return rects.length === 0 ? { col: 0, row: 0, w: 0, h: 0 } : { col, row, w: r - col, h: b - row };
}

const toInt = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;

/** Is it a rect of integers with a positive size (position not checked)? */
export function isIntegerRect(rect: unknown): rect is GridRect {
  if (!rect || typeof rect !== "object") return false;
  const r = rect as Record<string, unknown>;
  return (
    Number.isInteger(r.col) &&
    Number.isInteger(r.row) &&
    Number.isInteger(r.w) &&
    Number.isInteger(r.h) &&
    (r.w as number) >= 1 &&
    (r.h as number) >= 1
  );
}

/** Rounded rect with a minimum size of 1×1 (non-numbers read as 0 for positions and 1 for sizes). */
export function roundRect(rect: unknown): GridRect {
  const r = (rect && typeof rect === "object" ? rect : {}) as Record<string, unknown>;
  return {
    col: toInt(r.col, 0),
    row: toInt(r.row, 0),
    w: Math.max(1, toInt(r.w, 1)),
    h: Math.max(1, toInt(r.h, 1)),
  };
}

export function isInBounds(r: GridRect, columns = DESKTOP_COLUMNS): boolean {
  return r.col >= 0 && r.row >= 0 && r.w >= 1 && r.h >= 1 && r.col + r.w <= columns;
}

/** Puts an integer rect inside the grid: width ≤ columns, col in range, row ≥ 0. */
export function clampToGrid(r: GridRect, columns = DESKTOP_COLUMNS): GridRect {
  const w = clamp(r.w, 1, columns);
  return { col: clamp(r.col, 0, columns - w), row: Math.max(0, r.row), w, h: Math.max(1, r.h) };
}

/** Puts `r` inside `outer`, shrinking it when it is bigger. */
export function clampInto(r: GridRect, outer: GridRect): GridRect {
  const w = clamp(r.w, 1, outer.w);
  const h = clamp(r.h, 1, outer.h);
  return {
    col: clamp(r.col, outer.col, right(outer) - w),
    row: clamp(r.row, outer.row, bottom(outer) - h),
    w,
    h,
  };
}

/**
 * Shrinks `a` so it stops overlapping `b`, along the axis where the overlap is smaller (ties: the one that
 * loses less area, then vertical). Keeps the bigger remaining side. Null when no cut leaves `a` ≥ 1×1.
 */
export function clipRect(a: GridRect, b: GridRect): GridRect | null {
  const shared = intersection(a, b);
  if (!shared) return null;
  const horizontal: GridRect[] = [];
  const vertical: GridRect[] = [];
  if (b.col - a.col >= 1) horizontal.push({ ...a, w: b.col - a.col });
  if (right(a) - right(b) >= 1) horizontal.push({ ...a, col: right(b), w: right(a) - right(b) });
  if (b.row - a.row >= 1) vertical.push({ ...a, h: b.row - a.row });
  if (bottom(a) - bottom(b) >= 1) vertical.push({ ...a, row: bottom(b), h: bottom(a) - bottom(b) });
  const best = (list: GridRect[]) => list.reduce<GridRect | null>((acc, r) => (!acc || area(r) > area(acc) ? r : acc), null);
  const h = best(horizontal);
  const v = best(vertical);
  if (!h) return v;
  if (!v) return h;
  if (shared.w !== shared.h) return shared.w < shared.h ? h : v;
  return area(h) > area(v) ? h : v;
}

/** Order of blocks inside a scope: (row, col, z, id). */
export function compareByPosition(
  a: { rect: GridRect; z: number; id: string },
  b: { rect: GridRect; z: number; id: string },
): number {
  return a.rect.row - b.rect.row || a.rect.col - b.rect.col || a.z - b.z || compareStrings(a.id, b.id);
}
