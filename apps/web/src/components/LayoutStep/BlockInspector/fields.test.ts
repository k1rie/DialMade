import { MAX_HEIGHT_ROWS, MAX_ROW, type GridRect } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { applyField, fieldBounds, fieldValue, nudgeRect, parseCount, parseNumber, RECT_FIELDS } from "./fields";

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

describe("parseNumber", () => {
  it("reads integers, decimals, signs and a decimal comma", () => {
    expect(parseNumber("12")).toBe(12);
    expect(parseNumber("  12 ")).toBe(12);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber(".5")).toBe(0.5);
    expect(parseNumber("-3")).toBe(-3);
    expect(parseNumber("+4")).toBe(4);
  });

  it("refuses what is not a number", () => {
    for (const raw of ["", " ", "abc", "12px", "1e3", "--1", "1.2.3", "Infinity", "NaN"]) expect(parseNumber(raw), raw).toBeNull();
  });
});

describe("fieldValue", () => {
  it("shows 1-based columns and px of the design", () => {
    const r = rect(2, 3, 4, 60);
    expect(RECT_FIELDS.map((field) => fieldValue(r, field))).toEqual([3, 4, 24, 480]);
  });
});

describe("fieldBounds", () => {
  it("keeps the column and the width inside the grid", () => {
    expect(fieldBounds(rect(0, 0, 4, 10), "col")).toEqual({ min: 1, max: 9, step: 1 });
    expect(fieldBounds(rect(3, 0, 4, 10), "w")).toEqual({ min: 1, max: 9, step: 1 });
    expect(fieldBounds(rect(0, 0, 12, 10), "col")).toEqual({ min: 1, max: 1, step: 1 });
  });

  it("uses 8 px steps, the minimum height and the engine's maximum row and height for px fields", () => {
    expect(fieldBounds(rect(0, 0, 4, 10), "top")).toEqual({ min: 0, max: MAX_ROW * 8, step: 8 });
    expect(fieldBounds(rect(0, 0, 4, 10), "height")).toEqual({ min: 16, max: MAX_HEIGHT_ROWS * 8, step: 8 });
  });

  it("follows the column count", () => {
    expect(fieldBounds(rect(0, 0, 4, 10), "col", 8)).toEqual({ min: 1, max: 5, step: 1 });
    expect(fieldBounds(rect(6, 0, 2, 10), "w", 8)).toEqual({ min: 1, max: 2, step: 1 });
  });

  it("never offers an empty range for a rect already out of bounds", () => {
    const b = fieldBounds(rect(11, 0, 4, 10), "w");
    expect(b.max).toBeGreaterThanOrEqual(b.min);
  });
});

describe("applyField", () => {
  const start = rect(2, 3, 4, 10); // columns 3–6, 24 px from the top, 80 px tall

  it("sets one field", () => {
    expect(applyField(start, "col", "1")).toEqual(rect(0, 3, 4, 10));
    expect(applyField(start, "w", "6")).toEqual(rect(2, 3, 6, 10));
    expect(applyField(start, "top", "64")).toEqual(rect(2, 8, 4, 10));
    expect(applyField(start, "height", "120")).toEqual(rect(2, 3, 4, 15));
  });

  it("clamps to the grid instead of letting normalizeDrop fix it", () => {
    expect(applyField(start, "col", "12")).toEqual(rect(8, 3, 4, 10));
    expect(applyField(start, "col", "0")).toEqual(rect(0, 3, 4, 10));
    expect(applyField(start, "w", "40")).toEqual(rect(2, 3, 10, 10));
    expect(applyField(start, "w", "0")).toEqual(rect(2, 3, 1, 10));
    expect(applyField(start, "top", "-50")).toEqual(rect(2, 0, 4, 10));
    expect(applyField(start, "height", "3")).toEqual(rect(2, 3, 4, 2));
  });

  it("stops «Arriba» and «Alto» at the engine's bounds, so a typed 999999 px is never sent to the store", () => {
    expect(applyField(start, "top", "999999")).toEqual(rect(2, MAX_ROW, 4, 10));
    expect(applyField(start, "height", "99999999")).toEqual(rect(2, 3, 4, MAX_HEIGHT_ROWS));
  });

  it("snaps px to the 8 px rows and rounds columns", () => {
    expect(applyField(start, "top", "13")).toEqual(rect(2, 2, 4, 10));
    expect(applyField(start, "top", "12")).toEqual(rect(2, 2, 4, 10));
    expect(applyField(start, "top", "11")).toEqual(rect(2, 1, 4, 10));
    expect(applyField(start, "height", "100")).toEqual(rect(2, 3, 4, 13));
    expect(applyField(start, "col", "4.6")).toEqual(rect(4, 3, 4, 10));
  });

  it("returns the same object when nothing changes, null for text that is not a number", () => {
    expect(applyField(start, "col", "3")).toBe(start);
    expect(applyField(start, "top", "25")).toBe(start);
    expect(applyField(start, "w", "four")).toBeNull();
    expect(applyField(start, "height", "")).toBeNull();
  });

  it("always returns integers, never -0", () => {
    const r = applyField(rect(0, 1, 4, 10), "top", "2");
    expect(r).toEqual(rect(0, 0, 4, 10));
    expect(Object.is(r?.row, 0)).toBe(true);
  });
});

describe("nudgeRect", () => {
  const start = rect(4, 10, 4, 6);

  it("moves 1 column or 8 px per press", () => {
    expect(nudgeRect(start, "left", "move")).toEqual(rect(3, 10, 4, 6));
    expect(nudgeRect(start, "right", "move")).toEqual(rect(5, 10, 4, 6));
    expect(nudgeRect(start, "up", "move")).toEqual(rect(4, 9, 4, 6));
    expect(nudgeRect(start, "down", "move")).toEqual(rect(4, 11, 4, 6));
  });

  it("resizes from the right and bottom edges", () => {
    expect(nudgeRect(start, "left", "resize")).toEqual(rect(4, 10, 3, 6));
    expect(nudgeRect(start, "right", "resize")).toEqual(rect(4, 10, 5, 6));
    expect(nudgeRect(start, "up", "resize")).toEqual(rect(4, 10, 4, 5));
    expect(nudgeRect(start, "down", "resize")).toEqual(rect(4, 10, 4, 7));
  });

  it("returns the same object at the edges and at the minimum size (the button does nothing)", () => {
    const corner = rect(0, 0, 4, 6);
    expect(nudgeRect(corner, "left", "move")).toBe(corner);
    expect(nudgeRect(corner, "up", "move")).toBe(corner);
    const right = rect(8, 0, 4, 6);
    expect(nudgeRect(right, "right", "move")).toBe(right);
    expect(nudgeRect(right, "right", "resize")).toBe(right);
    const tiny = rect(2, 2, 1, 2);
    expect(nudgeRect(tiny, "left", "resize")).toBe(tiny);
    expect(nudgeRect(tiny, "up", "resize")).toBe(tiny);
  });
});

describe("parseCount", () => {
  it("rounds and clamps to the block's bounds", () => {
    const bounds = { min: 2, max: 8 };
    expect(parseCount("4", bounds)).toBe(4);
    expect(parseCount("4.4", bounds)).toBe(4);
    expect(parseCount("1", bounds)).toBe(2);
    expect(parseCount("30", bounds)).toBe(8);
    expect(parseCount("x", bounds)).toBeNull();
  });
});
