import { describe, expect, test } from "vitest";
import { MAX_BLOCKS, MAX_HEIGHT_ROWS, MAX_ROW } from "./constants";
import { emptyLayout } from "./edit";
import { FIXTURES, makeLayout } from "./testing/fixtures";
import type { LayoutDoc } from "./types";
import { validateLayout } from "./validate";

const codes = (layout: LayoutDoc) => validateLayout(layout).map((issue) => issue.code);

describe("validateLayout", () => {
  test("fixtures and the empty layout are valid", () => {
    expect(validateLayout(emptyLayout())).toEqual([]);
    for (const { layout } of FIXTURES) expect(validateLayout(layout)).toEqual([]);
  });

  test("document fields", () => {
    expect(codes({ version: 2, columns: 8, rowUnit: 4, blocks: {} } as unknown as LayoutDoc)).toEqual(["version", "columns", "row-unit"]);
    expect(codes(null as unknown as LayoutDoc)).toEqual(["version"]);
    expect(validateLayout({ version: 1, columns: 12, rowUnit: 8 } as unknown as LayoutDoc)).toEqual([
      { code: "version", path: ["blocks"], message: "Layout blocks must be a record" },
    ]);
  });

  test("ids", () => {
    const layout = makeLayout([
      { id: "r-123", type: "text", rect: [0, 0, 6, 10] },
      { id: "bad id", type: "text", rect: [6, 0, 6, 10] },
      { id: "shell", type: "text", rect: [0, 20, 6, 10] },
    ]);
    expect(validateLayout(layout)).toEqual([
      { code: "invalid-id", path: ["blocks", "bad id"], message: 'Invalid block id "bad id"' },
      { code: "reserved-id", path: ["blocks", "r-123"], message: 'Block ids cannot start with "r-"' },
      { code: "reserved-id", path: ["blocks", "shell"], message: 'Block id "shell" is reserved' },
    ]);
  });

  test("types, rects and z", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 10] },
      { id: "b", type: "text", rect: [8, 0, 6, 10] },
      { id: "c", type: "text", rect: [0, -1, 6, 10] },
      { id: "d", type: "text", rect: [0, 0, 0, 10] },
    ]);
    layout.blocks.a = { ...layout.blocks.a!, type: "banana" as never, z: 1.5 };
    layout.blocks.e = { type: "text", label: "e", rect: { col: 0.5, row: 0, w: 1, h: 1 }, z: 1 };
    expect(validateLayout(layout).map((i) => [i.code, i.path.join("/")])).toEqual([
      ["unknown-type", "blocks/a/type"],
      ["invalid-z", "blocks/a/z"],
      ["invalid-rect", "blocks/b/rect"],
      ["invalid-rect", "blocks/c/rect"],
      ["invalid-rect", "blocks/d/rect"],
      ["invalid-rect", "blocks/e/rect"],
    ]);
  });

  test("rows and heights have an upper bound", () => {
    const layout = makeLayout([
      { id: "top", type: "text", rect: [0, MAX_ROW, 6, MAX_HEIGHT_ROWS] },
      { id: "low", type: "text", rect: [0, MAX_ROW + 1, 6, 10] },
      { id: "tall", type: "text", rect: [6, 0, 6, MAX_HEIGHT_ROWS + 1] },
      { id: "huge", type: "text", rect: [0, 0, 12, 125_000_000_000] },
    ]);
    expect(validateLayout(layout)).toEqual(
      ["huge", "low", "tall"].map((id) => ({
        code: "invalid-rect",
        path: ["blocks", id, "rect"],
        message: `Rect row must be at most ${MAX_ROW} and h at most ${MAX_HEIGHT_ROWS}`,
      })),
    );
  });

  test("parents and cycles", () => {
    const layout = makeLayout([
      { id: "a", type: "container", rect: [0, 0, 12, 10], parent: "b" },
      { id: "b", type: "container", rect: [0, 20, 12, 10], parent: "c" },
      { id: "c", type: "container", rect: [0, 40, 12, 10], parent: "a" },
      { id: "d", type: "text", rect: [0, 60, 12, 10], parent: "d" },
      { id: "e", type: "text", rect: [0, 80, 12, 10], parent: "ghost" },
      { id: "f", type: "text", rect: [0, 100, 12, 10], parent: "a" },
    ]);
    expect(validateLayout(layout).map((i) => [i.code, i.path.join("/"), i.message])).toEqual([
      ["self-parent", "blocks/d/parentId", "A block cannot be its own parent"],
      ["missing-parent", "blocks/e/parentId", 'Parent "ghost" does not exist'],
      ["cycle", "blocks/a/parentId", "Parent cycle between a, b, c"],
    ]);
  });

  test("count, note and label", () => {
    const layout = makeLayout([
      { id: "a", type: "kpis", rect: [0, 0, 12, 10], count: 7 },
      { id: "b", type: "cards", rect: [0, 10, 12, 10], count: 2.5 },
      { id: "c", type: "text", rect: [0, 20, 12, 10], count: 3 },
      { id: "d", type: "text", rect: [0, 30, 12, 10], count: 100, note: "x".repeat(201) },
      { id: "e", type: "text", rect: [0, 40, 12, 10], label: "y".repeat(61) },
    ]);
    expect(validateLayout(layout).map((i) => [i.code, i.path.join("/")])).toEqual([
      ["invalid-count", "blocks/a/count"],
      ["invalid-count", "blocks/b/count"],
      ["invalid-count", "blocks/d/count"],
      ["note-too-long", "blocks/d/note"],
      ["label-too-long", "blocks/e/label"],
    ]);
  });

  test("too many blocks", () => {
    const rows = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({
      id: `b${i}`,
      type: "text" as const,
      rect: [0, i, 12, 1] as [number, number, number, number],
    }));
    expect(codes(makeLayout(rows))).toEqual(["too-many-blocks"]);
  });

  test("result does not depend on key order", () => {
    const layout = makeLayout([
      { id: "z", type: "text", rect: [0, -1, 6, 10] },
      { id: "a", type: "text", rect: [0, -1, 6, 10] },
    ]);
    const reversed = { ...layout, blocks: { a: layout.blocks.a!, z: layout.blocks.z! } };
    expect(validateLayout(reversed)).toEqual(validateLayout(layout));
  });
});
