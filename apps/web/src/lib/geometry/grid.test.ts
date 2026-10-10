import { describe, expect, it } from "vitest";
import { HANDLES, type Handle } from "./rect";
import { gridToPx, nudgeGrid, pxToCell, rowsToPx, snapDraw, snapMove, snapResize, type GridMetrics, type GridSize } from "./grid";
import type { GridRect } from "@dialmade/layout";

/** 12 columns of 100 px, rows of 8 px (k = 1). */
const M: GridMetrics = { colPx: 100, rowPx: 8, columns: 12 };
const MIN: GridSize = { w: 2, h: 4 };
const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

/** Every rect a helper returns must be integer, inside the columns, below row 0 and non-empty. */
function expectValid(r: GridRect, columns = M.columns) {
  for (const value of [r.col, r.row, r.w, r.h]) expect(Number.isInteger(value)).toBe(true);
  expect(r.col).toBeGreaterThanOrEqual(0);
  expect(r.row).toBeGreaterThanOrEqual(0);
  expect(r.w).toBeGreaterThanOrEqual(1);
  expect(r.h).toBeGreaterThanOrEqual(1);
  expect(r.col + r.w).toBeLessThanOrEqual(columns);
}

describe("rowsToPx", () => {
  it("uses the 8 px row unit", () => {
    expect(rowsToPx(0)).toBe(0);
    expect(rowsToPx(3)).toBe(24);
    expect(rowsToPx(60)).toBe(480);
  });
});

describe("gridToPx", () => {
  it("converts grid units to screen px", () => {
    expect(gridToPx(rect(2, 3, 4, 10), M)).toEqual({ left: 200, top: 24, width: 400, height: 80 });
  });

  it("follows the metrics (scaled frame)", () => {
    expect(gridToPx(rect(1, 10, 2, 5), { colPx: 50.5, rowPx: 4, columns: 12 })).toEqual({ left: 50.5, top: 40, width: 101, height: 20 });
  });
});

describe("pxToCell", () => {
  it("floors the column and rounds the row", () => {
    expect(pxToCell({ x: 250, y: 27 }, M)).toEqual({ col: 2, row: 3 });
    expect(pxToCell({ x: 299.9, y: 29 }, M)).toEqual({ col: 2, row: 4 });
    expect(pxToCell({ x: 300, y: 0 }, M)).toEqual({ col: 3, row: 0 });
  });

  it("clamps to the grid", () => {
    expect(pxToCell({ x: -40, y: -30 }, M)).toEqual({ col: 0, row: 0 });
    expect(pxToCell({ x: 1200, y: 10 }, M)).toEqual({ col: 11, row: 1 });
    expect(pxToCell({ x: 99999, y: 8000 }, M)).toEqual({ col: 11, row: 1000 });
  });

  it("survives a frame that is not measured yet", () => {
    expect(pxToCell({ x: 40, y: 40 }, { colPx: 0, rowPx: 0, columns: 12 })).toEqual({ col: 0, row: 0 });
  });
});

describe("snapMove", () => {
  const start = rect(2, 10, 4, 6);

  it("rounds the delta to whole columns and rows", () => {
    expect(snapMove(start, 149, 11, M)).toEqual(rect(3, 11, 4, 6));
    expect(snapMove(start, 151, 12, M)).toEqual(rect(4, 12, 4, 6));
    expect(snapMove(start, -49, -3, M)).toEqual(start);
    expect(snapMove(start, -260, -20, M)).toEqual(rect(0, 8, 4, 6));
  });

  it("keeps the rect inside the columns and below row 0", () => {
    expect(snapMove(start, -900, -900, M)).toEqual(rect(0, 0, 4, 6));
    expect(snapMove(start, 2000, 0, M)).toEqual(rect(8, 10, 4, 6));
  });

  it("has no bottom limit", () => {
    expect(snapMove(start, 0, 8000, M)).toEqual(rect(2, 1010, 4, 6));
  });

  it("fits a rect wider than the frame", () => {
    const r = snapMove(rect(0, 0, 12, 4), 0, 0, { colPx: 50, rowPx: 8, columns: 8 });
    expect(r).toEqual(rect(0, 0, 8, 4));
  });

  it("never returns -0", () => {
    const r = snapMove(rect(0, 0, 4, 4), -20, -2, M);
    expect(Object.is(r.col, 0)).toBe(true);
    expect(Object.is(r.row, 0)).toBe(true);
  });
});

describe("snapResize", () => {
  const start = rect(4, 10, 4, 10); // columns 4–8, rows 10–20

  it("moves only the edges of each handle, anchored on the opposite side", () => {
    const cases: Record<Handle, GridRect> = {
      e: rect(4, 10, 6, 10),
      w: rect(2, 10, 6, 10),
      s: rect(4, 10, 4, 13),
      n: rect(4, 7, 4, 13),
      se: rect(4, 10, 6, 13),
      ne: rect(4, 7, 6, 13),
      sw: rect(2, 10, 6, 13),
      nw: rect(2, 7, 6, 13),
    };
    for (const handle of HANDLES) {
      const dx = handle.includes("w") ? -200 : 200;
      const dy = handle.includes("n") ? -24 : 24;
      expect(snapResize(start, handle, dx, dy, M, MIN), handle).toEqual(cases[handle]);
    }
  });

  it("rounds the delta to whole cells", () => {
    expect(snapResize(start, "e", 49, 0, M, MIN)).toEqual(start);
    expect(snapResize(start, "e", 51, 0, M, MIN)).toEqual(rect(4, 10, 5, 10));
    expect(snapResize(start, "s", 0, 3.9, M, MIN)).toEqual(start);
    expect(snapResize(start, "s", 0, 4.1, M, MIN)).toEqual(rect(4, 10, 4, 11));
  });

  it("clamps to the columns and to row 0", () => {
    expect(snapResize(start, "e", 9000, 0, M, MIN)).toEqual(rect(4, 10, 8, 10));
    expect(snapResize(start, "w", -9000, 0, M, MIN)).toEqual(rect(0, 10, 8, 10));
    expect(snapResize(start, "n", 0, -9000, M, MIN)).toEqual(rect(4, 0, 4, 20));
    expect(snapResize(start, "nw", -9000, -9000, M, MIN)).toEqual(rect(0, 0, 8, 20));
  });

  it("keeps the minimum size, anchored on the opposite edge", () => {
    expect(snapResize(start, "e", -9000, 0, M, MIN)).toEqual(rect(4, 10, 2, 10));
    expect(snapResize(start, "w", 9000, 0, M, MIN)).toEqual(rect(6, 10, 2, 10));
    expect(snapResize(start, "s", 0, -9000, M, MIN)).toEqual(rect(4, 10, 4, 4));
    expect(snapResize(start, "n", 0, 9000, M, MIN)).toEqual(rect(4, 16, 4, 4));
    expect(snapResize(start, "se", -9000, -9000, M, MIN)).toEqual(rect(4, 10, 2, 4));
  });

  it("has no bottom limit", () => {
    expect(snapResize(start, "s", 0, 8000, M, MIN)).toEqual(rect(4, 10, 4, 1010));
  });

  it("clamps a minimum wider than the frame", () => {
    const r = snapResize(rect(0, 0, 4, 4), "e", -900, 0, { colPx: 80, rowPx: 8, columns: 4 }, { w: 6, h: 1 });
    expect(r).toEqual(rect(0, 0, 4, 4));
  });

  it("repairs a start rect that is too small or out of bounds", () => {
    expect(snapResize(rect(0, 0, 1, 1), "w", 0, 0, M, MIN)).toEqual(rect(0, 0, 2, 4));
    expect(snapResize(rect(0, 0, 1, 1), "n", 0, 0, M, MIN)).toEqual(rect(0, 0, 2, 4));
    expect(snapResize(rect(11, 0, 1, 4), "e", 0, 0, M, MIN)).toEqual(rect(10, 0, 2, 4));
    expectValid(snapResize(rect(10, -3, 6, 2), "se", 300, 0, M, MIN));
  });

  it("always returns a valid rect", () => {
    for (const handle of HANDLES) {
      for (const dx of [-5000, -130, -49, 0, 51, 170, 5000]) {
        for (const dy of [-5000, -13, 0, 9, 5000]) {
          const r = snapResize(start, handle, dx, dy, M, MIN);
          expectValid(r);
          expect(r.w).toBeGreaterThanOrEqual(MIN.w);
          expect(r.h).toBeGreaterThanOrEqual(MIN.h);
        }
      }
    }
  });
});

describe("snapDraw", () => {
  it("snaps both corners outwards so the rect covers both points", () => {
    expect(snapDraw({ x: 150, y: 20 }, { x: 420, y: 100 }, M, MIN)).toEqual(rect(1, 2, 4, 11));
  });

  it("does not depend on the drag direction", () => {
    const forward = snapDraw({ x: 150, y: 20 }, { x: 420, y: 100 }, M, MIN);
    expect(snapDraw({ x: 420, y: 100 }, { x: 150, y: 20 }, M, MIN)).toEqual(forward);
    expect(snapDraw({ x: 420, y: 20 }, { x: 150, y: 100 }, M, MIN)).toEqual(forward);
  });

  it("keeps points on a grid line on that line", () => {
    expect(snapDraw({ x: 200, y: 16 }, { x: 600, y: 80 }, M, MIN)).toEqual(rect(2, 2, 4, 8));
  });

  it("grows a click or a tiny drag to the minimum size in the drag direction", () => {
    expect(snapDraw({ x: 250, y: 40 }, { x: 250, y: 40 }, M, MIN)).toEqual(rect(2, 5, 2, 4));
    expect(snapDraw({ x: 550, y: 80 }, { x: 520, y: 70 }, M, MIN)).toEqual(rect(4, 6, 2, 4));
  });

  it("clamps points outside the grid", () => {
    expect(snapDraw({ x: -300, y: -50 }, { x: 250, y: 30 }, M, MIN)).toEqual(rect(0, 0, 3, 4));
    expect(snapDraw({ x: 1000, y: 0 }, { x: 5000, y: 64 }, M, MIN)).toEqual(rect(10, 0, 2, 8));
    expect(snapDraw({ x: 50, y: 0 }, { x: -50, y: 0 }, M, MIN)).toEqual(rect(0, 0, 2, 4));
  });

  it("always returns a valid rect", () => {
    const xs = [-500, 0, 99, 100, 640, 1199, 1200, 4000];
    const ys = [-80, 0, 7, 8, 333];
    for (const ax of xs) for (const ay of ys) for (const px of xs) for (const py of ys) {
      const r = snapDraw({ x: ax, y: ay }, { x: px, y: py }, M, MIN);
      expectValid(r);
      expect(r.w).toBeGreaterThanOrEqual(MIN.w);
      expect(r.h).toBeGreaterThanOrEqual(MIN.h);
    }
  });
});

describe("nudgeGrid", () => {
  const start = rect(4, 10, 4, 6);

  it("moves 1 column or 1 row per arrow", () => {
    expect(nudgeGrid(start, "ArrowRight", false, 12)).toEqual(rect(5, 10, 4, 6));
    expect(nudgeGrid(start, "ArrowLeft", false, 12)).toEqual(rect(3, 10, 4, 6));
    expect(nudgeGrid(start, "ArrowDown", false, 12)).toEqual(rect(4, 11, 4, 6));
    expect(nudgeGrid(start, "ArrowUp", false, 12)).toEqual(rect(4, 9, 4, 6));
  });

  it("stops at the edges of the grid", () => {
    expect(nudgeGrid(rect(0, 0, 4, 6), "ArrowLeft", false, 12)).toEqual(rect(0, 0, 4, 6));
    expect(nudgeGrid(rect(0, 0, 4, 6), "ArrowUp", false, 12)).toEqual(rect(0, 0, 4, 6));
    expect(nudgeGrid(rect(8, 0, 4, 6), "ArrowRight", false, 12)).toEqual(rect(8, 0, 4, 6));
  });

  it("resizes from the top-left corner: Right/Down grow, Left/Up shrink", () => {
    expect(nudgeGrid(start, "ArrowRight", true, 12)).toEqual(rect(4, 10, 5, 6));
    expect(nudgeGrid(start, "ArrowLeft", true, 12)).toEqual(rect(4, 10, 3, 6));
    expect(nudgeGrid(start, "ArrowDown", true, 12)).toEqual(rect(4, 10, 4, 7));
    expect(nudgeGrid(start, "ArrowUp", true, 12)).toEqual(rect(4, 10, 4, 5));
  });

  it("never shrinks below 1×1, or below the given minimum", () => {
    expect(nudgeGrid(rect(4, 10, 1, 1), "ArrowLeft", true, 12)).toEqual(rect(4, 10, 1, 1));
    expect(nudgeGrid(rect(4, 10, 1, 1), "ArrowUp", true, 12)).toEqual(rect(4, 10, 1, 1));
    expect(nudgeGrid(rect(4, 10, 2, 4), "ArrowLeft", true, 12, MIN)).toEqual(rect(4, 10, 2, 4));
    expect(nudgeGrid(rect(4, 10, 2, 4), "ArrowUp", true, 12, MIN)).toEqual(rect(4, 10, 2, 4));
  });

  it("never grows past the last column", () => {
    expect(nudgeGrid(rect(8, 0, 4, 6), "ArrowRight", true, 12)).toEqual(rect(8, 0, 4, 6));
  });

  it("follows the column count of the frame", () => {
    expect(nudgeGrid(rect(4, 0, 4, 6), "ArrowRight", false, 8)).toEqual(rect(4, 0, 4, 6));
    expect(nudgeGrid(rect(0, 0, 4, 6), "ArrowRight", true, 4)).toEqual(rect(0, 0, 4, 6));
  });

  it("returns the same object for other keys", () => {
    for (const key of ["Enter", " ", "a", "toString", "constructor"]) expect(nudgeGrid(start, key, false, 12)).toBe(start);
  });
});
