import { describe, expect, test } from "vitest";
import { MAX_HEIGHT_ROWS, MAX_ROW } from "./constants";
import {
  applyFix,
  descendantsOf,
  duplicateBlock,
  emptyLayout,
  findFreeSlot,
  insertBlock,
  layoutBounds,
  moveBlock,
  normalizeDrop,
  removeBlocks,
} from "./edit";
import { inferStructure } from "./infer";
import { makeLayout } from "./testing/fixtures";
import { mulberry32 } from "./testing/random";

const rect = (col: number, row: number, w: number, h: number) => ({ col, row, w, h });

describe("basics", () => {
  test("emptyLayout and layoutBounds", () => {
    expect(emptyLayout()).toEqual({ version: 1, columns: 12, rowUnit: 8, blocks: {} });
    expect(emptyLayout()).not.toBe(emptyLayout());
    expect(layoutBounds(emptyLayout())).toBe(0);
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 10] },
      { id: "b", type: "text", rect: [6, 30, 6, 12] },
    ]);
    expect(layoutBounds(layout)).toBe(42);
  });

  test("descendantsOf is cycle-safe", () => {
    const layout = makeLayout([
      { id: "a", type: "container", rect: [0, 0, 12, 40] },
      { id: "b", type: "container", rect: [0, 0, 6, 20], parent: "a" },
      { id: "c", type: "text", rect: [0, 0, 3, 10], parent: "b" },
      { id: "x", type: "container", rect: [0, 50, 12, 10], parent: "y" },
      { id: "y", type: "container", rect: [0, 70, 12, 10], parent: "x" },
    ]);
    expect([...descendantsOf(layout, "a")].sort()).toEqual(["b", "c"]);
    expect([...descendantsOf(layout, "x")]).toEqual(["y"]);
  });
});

describe("findFreeSlot", () => {
  test("first gap row by row, then by column", () => {
    const layout = makeLayout([
      { id: "nav", type: "navbar", rect: [0, 0, 12, 8] },
      { id: "left", type: "text", rect: [0, 8, 6, 20] },
    ]);
    expect(findFreeSlot(layout, { w: 6, h: 20 })).toEqual({ rect: rect(6, 8, 6, 20) });
    expect(findFreeSlot(layout, { w: 12, h: 20 })).toEqual({ rect: rect(0, 28, 12, 20) });
    expect(findFreeSlot(emptyLayout(), { w: 20, h: 0 })).toEqual({ rect: rect(0, 0, 12, 1) });
  });

  test("inside a container; grows the container when nothing fits", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 10, 12, 30] },
      { id: "a", type: "text", rect: [0, 10, 6, 30], parent: "box" },
    ]);
    expect(findFreeSlot(layout, { w: 6, h: 20 }, { parentId: "box" })).toEqual({ rect: rect(6, 10, 6, 20) });
    expect(findFreeSlot(layout, { w: 8, h: 20 }, { parentId: "box" })).toEqual({
      rect: rect(0, 40, 8, 20),
      parentRect: rect(0, 10, 12, 50),
    });
  });

  test("overlays are centered at row 8 and are never obstacles", () => {
    const layout = makeLayout([
      { id: "m", type: "modal", rect: [0, 0, 12, 40] },
      { id: "t", type: "table", rect: [0, 0, 12, 20] },
    ]);
    expect(findFreeSlot(layout, { w: 6, h: 30 }, { overlay: true })).toEqual({ rect: rect(3, 8, 6, 30) });
    expect(findFreeSlot(layout, { w: 12, h: 10 })).toEqual({ rect: rect(0, 20, 12, 10) });
  });
});

describe("insertBlock", () => {
  test("next free slot with the default size, z above everything, sanitized label", () => {
    let layout = emptyLayout();
    const first = insertBlock(layout, { type: "navbar", label: " Nav\nbar ", random: mulberry32(1) });
    layout = first.layout;
    expect(first.id).toMatch(/^b-[0-9a-z]{6}$/);
    expect(layout.blocks[first.id]).toEqual({ type: "navbar", label: "Nav bar", rect: rect(0, 0, 12, 8), z: 1 });
    const second = insertBlock(layout, { type: "hero", label: "Hero", id: "hero-1" });
    expect(second.layout.blocks["hero-1"]).toEqual({ type: "hero", label: "Hero", rect: rect(0, 8, 12, 60), z: 2 });
    expect(second.adjustments).toEqual([]);
    expect(layout.blocks["hero-1"]).toBeUndefined();
  });

  test("count is clamped to the repeatable bounds; notes are sanitized", () => {
    const { layout, id } = insertBlock(emptyLayout(), { type: "kpis", label: "KPIs", count: 40, note: "  cuatro\n" });
    expect(layout.blocks[id]).toMatchObject({ count: 6, note: "cuatro" });
    const loose = insertBlock(emptyLayout(), { type: "text", label: "T", count: 0 });
    expect(loose.layout.blocks[loose.id]!.count).toBe(1);
  });

  test("a dropped rect is normalized like a drop", () => {
    const base = makeLayout([{ id: "box", type: "container", rect: [0, 0, 12, 40] }]);
    const { layout, adjustments } = insertBlock(base, { type: "text", label: "T", rect: rect(10, 2, 4, 10), id: "t" });
    expect(adjustments).toEqual([
      { kind: "clamp", id: "t", from: rect(10, 2, 4, 10), to: rect(8, 2, 4, 10) },
      { kind: "nest", id: "t", parentId: "box" },
    ]);
    expect(layout.blocks.t!.parentId).toBe("box");
  });

  test("into a full container: it grows and says so", () => {
    const base = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 20] },
      { id: "a", type: "cards", rect: [0, 0, 12, 20], parent: "box" },
    ]);
    const result = insertBlock(base, { type: "text", label: "T", parentId: "box", id: "t" });
    expect(result.grown).toEqual({ id: "box", from: rect(0, 0, 12, 20), to: rect(0, 0, 12, 40) });
    expect(result.layout.blocks.t).toMatchObject({ rect: rect(0, 20, 6, 20), parentId: "box" });
    expect(result.adjustments).toEqual([]);
  });

  test("errors: unknown parent, taken or invalid id, unknown type", () => {
    const base = makeLayout([{ id: "a", type: "text", rect: [0, 0, 6, 10] }]);
    expect(() => insertBlock(base, { type: "text", label: "", parentId: "ghost" })).toThrow(/parent/);
    expect(() => insertBlock(base, { type: "text", label: "", id: "a" })).toThrow(/taken/);
    expect(() => insertBlock(base, { type: "text", label: "", id: "r-1" })).toThrow(/invalid/);
    expect(() => insertBlock(base, { type: "nope" as never, label: "" })).toThrow(/Unknown/);
  });
});

describe("normalizeDrop", () => {
  test("no change keeps the same layout object", () => {
    const layout = makeLayout([{ id: "a", type: "text", rect: [0, 0, 6, 10] }]);
    expect(normalizeDrop(layout, "a")).toEqual({ layout, adjustments: [] });
    expect(normalizeDrop(layout, "ghost").layout).toBe(layout);
  });

  test("clamp into the grid, moving descendants along", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [-2, -4, 6, 20] },
      { id: "kid", type: "text", rect: [-1, -2, 2, 5], parent: "box" },
    ]);
    const { layout: next, adjustments } = normalizeDrop(layout, "box");
    expect(adjustments).toEqual([{ kind: "clamp", id: "box", from: rect(-2, -4, 6, 20), to: rect(0, 0, 6, 20) }]);
    expect(next.blocks.kid!.rect).toEqual(rect(1, 2, 2, 5));
  });

  test("descendants pushed out of the grid are clamped too", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [10, 0, 2, 20] },
      { id: "kid", type: "text", rect: [12, 2, 4, 5], parent: "box" },
    ]);
    expect(normalizeDrop(layout, "box").adjustments).toEqual([
      { kind: "clamp", id: "kid", from: rect(12, 2, 4, 5), to: rect(8, 2, 4, 5) },
    ]);
  });

  test("nest into the smallest container holding ≥90 %, then clamp into it", () => {
    const layout = makeLayout([
      { id: "outer", type: "container", rect: [0, 0, 12, 60] },
      { id: "inner", type: "container", rect: [0, 0, 8, 30], parent: "outer" },
      { id: "t", type: "text", rect: [0, 2, 8, 30] },
    ]);
    const { layout: next, adjustments } = normalizeDrop(layout, "t");
    // 93 % inside inner (and 100 % inside the bigger outer): the smallest wins.
    expect(adjustments).toEqual([
      { kind: "nest", id: "t", parentId: "inner" },
      { kind: "clamp", id: "t", from: rect(0, 2, 8, 30), to: rect(0, 0, 8, 30) },
    ]);
    expect(next.blocks.t!.parentId).toBe("inner");
  });

  test("the current parent counts even when it is not a container (a media inside a hero)", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 80] },
      { id: "hero", type: "hero", rect: [0, 0, 12, 60], parent: "box" },
      { id: "shot", type: "media", rect: [6, 4, 5, 40], parent: "hero" },
    ]);
    expect(normalizeDrop(layout, "shot").adjustments).toEqual([]);
  });

  test("unnest when less than half stays inside: to the nearest ancestor holding half, else the root", () => {
    const layout = makeLayout([
      { id: "outer", type: "container", rect: [0, 0, 12, 100] },
      { id: "inner", type: "container", rect: [0, 0, 6, 20], parent: "outer" },
      { id: "t", type: "text", rect: [0, 40, 4, 10], parent: "inner" },
      { id: "u", type: "text", rect: [0, 150, 4, 10], parent: "inner" },
    ]);
    const first = normalizeDrop(layout, "t");
    expect(first.adjustments).toEqual([
      { kind: "nest", id: "t", parentId: "outer" },
    ]);
    const second = normalizeDrop(layout, "u");
    expect(second.adjustments).toEqual([{ kind: "unnest", id: "u", parentId: "inner" }]);
    expect(second.layout.blocks.u!.parentId).toBeUndefined();
    const partly = makeLayout([
      { id: "outer", type: "container", rect: [0, 0, 12, 100] },
      { id: "inner", type: "container", rect: [0, 0, 6, 20], parent: "outer" },
      { id: "v", type: "text", rect: [0, 16, 4, 10], parent: "inner" },
    ]);
    // 40 % inside inner, 100 % inside outer: outer is a ≥90 % container → nest there.
    expect(normalizeDrop(partly, "v").adjustments).toEqual([{ kind: "nest", id: "v", parentId: "outer" }]);
    const halfway = makeLayout([
      { id: "outer", type: "hero", rect: [0, 0, 12, 30] },
      { id: "inner", type: "hero", rect: [0, 0, 6, 20], parent: "outer" },
      { id: "w", type: "text", rect: [0, 16, 4, 20], parent: "inner" },
    ]);
    const third = normalizeDrop(halfway, "w");
    expect(third.adjustments).toEqual([{ kind: "unnest", id: "w", parentId: "inner" }]);
    expect(third.layout.blocks.w!.parentId).toBe("outer");
  });

  test("clip small overlaps by shrinking the lower-z block; bigger overlaps stay", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 20], z: 1 },
      { id: "b", type: "text", rect: [0, 18, 12, 20], z: 2 },
      { id: "c", type: "text", rect: [0, 30, 12, 20], z: 3 },
    ]);
    const { layout: next, adjustments } = normalizeDrop(layout, "b");
    expect(adjustments).toEqual([{ kind: "clip", id: "a", from: rect(0, 0, 12, 20), to: rect(0, 0, 12, 18) }]);
    expect(next.blocks.b!.rect).toEqual(rect(0, 18, 12, 20));
    expect(next.blocks.c!.rect).toEqual(rect(0, 30, 12, 20));
  });

  test("the dropped block is clipped when it has the lower z", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 20], z: 5 },
      { id: "b", type: "text", rect: [0, 18, 12, 20], z: 2 },
    ]);
    expect(normalizeDrop(layout, "b").adjustments).toEqual([
      { kind: "clip", id: "b", from: rect(0, 18, 12, 20), to: rect(0, 20, 12, 18) },
    ]);
  });

  test("overlays are only clamped: never nested, never clipped", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 60] },
      { id: "m", type: "modal", rect: [3, 10, 6, 30] },
    ]);
    expect(normalizeDrop(layout, "m").adjustments).toEqual([]);
  });

  test("the result never warns about what it fixed", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 40] },
      { id: "t", type: "text", rect: [1, 2, 4, 20] },
    ]);
    expect(inferStructure(layout).warnings.map((w) => w.code)).toEqual(["implicit-containment"]);
    expect(inferStructure(normalizeDrop(layout, "t").layout).warnings).toEqual([]);
  });
});

describe("moveBlock, removeBlocks, duplicateBlock", () => {
  const nested = () =>
    makeLayout([
      { id: "box", type: "container", rect: [0, 10, 12, 40] },
      { id: "a", type: "text", rect: [1, 12, 4, 20], parent: "box" },
      { id: "deep", type: "media", rect: [1, 14, 2, 4], parent: "a" },
      { id: "other", type: "text", rect: [0, 60, 12, 10] },
    ]);

  test("a move drags descendants; a resize leaves them", () => {
    const moved = moveBlock(nested(), "box", rect(0, 20, 12, 40));
    expect(moved.blocks.a!.rect).toEqual(rect(1, 22, 4, 20));
    expect(moved.blocks.deep!.rect).toEqual(rect(1, 24, 2, 4));
    const resized = moveBlock(nested(), "box", rect(2, 8, 10, 50));
    expect(resized.blocks.a!.rect).toEqual(rect(1, 12, 4, 20));
    const same = nested();
    expect(moveBlock(same, "ghost", rect(0, 0, 1, 1))).toBe(same);
  });

  test("removeBlocks removes descendants", () => {
    const layout = removeBlocks(nested(), ["a", "ghost"]);
    expect(Object.keys(layout.blocks).sort()).toEqual(["box", "other"]);
    const same = nested();
    expect(removeBlocks(same, ["ghost"])).toBe(same);
  });

  test("duplicateBlock copies the subtree just below with new ids", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 20] },
      { id: "kid", type: "text", rect: [1, 2, 4, 10], parent: "box" },
    ]);
    layout.blocks.box!.generated = { type: "container", w: 12, h: 20, variant: "default" };
    const { layout: next, id, idMap } = duplicateBlock(layout, "box", { newId: "box-2", random: mulberry32(9) });
    expect(id).toBe("box-2");
    expect(Object.keys(idMap)).toEqual(["box", "kid"]);
    expect(next.blocks["box-2"]).toEqual({ type: "container", label: "box", rect: rect(0, 20, 12, 20), z: 3 });
    expect(next.blocks[idMap.kid!]).toEqual({ type: "text", label: "kid", rect: rect(1, 22, 4, 10), z: 4, parentId: "box-2" });
    expect(next.blocks.box!.generated).toBeDefined();
  });

  test("duplicateBlock uses the next free slot when the spot below is taken", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 10] },
      { id: "b", type: "text", rect: [0, 10, 6, 10] },
    ]);
    const { layout: next, id } = duplicateBlock(layout, "a", { random: mulberry32(2) });
    expect(next.blocks[id]!.rect).toEqual(rect(6, 0, 6, 10));
    expect(() => duplicateBlock(layout, "ghost")).toThrow();
    expect(() => duplicateBlock(layout, "a", { newId: "b" })).toThrow();
  });

  test("duplicating a nested block stays inside its parent (growing it if needed)", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 20] },
      { id: "kid", type: "cards", rect: [0, 0, 12, 20], parent: "box" },
    ]);
    const { layout: next, id } = duplicateBlock(layout, "kid", { random: mulberry32(4) });
    expect(next.blocks[id]).toMatchObject({ rect: rect(0, 20, 12, 20), parentId: "box" });
    expect(next.blocks.box!.rect).toEqual(rect(0, 0, 12, 40));
  });
});

describe("applyFix", () => {
  const layout = makeLayout([
    { id: "box", type: "container", rect: [0, 0, 12, 40] },
    { id: "a", type: "text", rect: [0, 0, 12, 20] },
    { id: "b", type: "text", rect: [0, 18, 12, 20], parent: "box" },
  ]);

  test("nest and unparent", () => {
    expect(applyFix(layout, { kind: "nest", id: "a", parentId: "box" }).blocks.a!.parentId).toBe("box");
    expect(applyFix(layout, { kind: "nest", id: "box", parentId: "b" })).toBe(layout);
    expect(applyFix(layout, { kind: "nest", id: "a", parentId: "a" })).toBe(layout);
    expect(applyFix(layout, { kind: "unparent", id: "b" }).blocks.b).not.toHaveProperty("parentId");
    expect(applyFix(layout, { kind: "unparent", id: "a" })).toBe(layout);
  });

  test("move-below, clip and fit-inside", () => {
    expect(applyFix(layout, { kind: "move-below", id: "b", below: "a" }).blocks.b!.rect).toEqual(rect(0, 20, 12, 20));
    expect(applyFix(layout, { kind: "move-below", id: "b", below: "ghost" })).toBe(layout);
    expect(applyFix(layout, { kind: "clip", id: "a", rect: rect(0, 0, 12, 18) }).blocks.a!.rect).toEqual(rect(0, 0, 12, 18));
    expect(applyFix(layout, { kind: "fit-inside", id: "a", rect: rect(0, 2, 12, 20) }).blocks.a!.rect).toEqual(rect(0, 2, 12, 20));
    expect(applyFix(layout, { kind: "unparent", id: "ghost" })).toBe(layout);
  });

  test("applying every offered fix clears the warning", () => {
    const messy = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 20] },
      { id: "b", type: "text", rect: [0, 18, 12, 20] },
    ]);
    for (const fix of inferStructure(messy).warnings[0]!.fixes) {
      expect(inferStructure(applyFix(messy, fix)).warnings).toEqual([]);
    }
  });
});

describe("edits never strand children or cover siblings", () => {
  test("normalizeDrop never clips a container away from its children: it clips the other block", () => {
    // Dragging kid out of the bottom of box: unnest, then a 1-row overlap with box (<15 %).
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 40] },
      { id: "kid", type: "text", rect: [0, 2, 4, 10], parent: "box" },
      { id: "kid2", type: "text", rect: [4, 30, 4, 10], parent: "box" },
    ]);
    const dropped = normalizeDrop(moveBlock(layout, "kid", rect(0, 39, 4, 10)), "kid");
    expect(dropped.adjustments).toEqual([
      { kind: "unnest", id: "kid", parentId: "box" },
      { kind: "clip", id: "kid", from: rect(0, 39, 4, 10), to: rect(0, 40, 4, 9) },
    ]);
    expect(dropped.layout.blocks.box!.rect).toEqual(rect(0, 0, 12, 40));
    expect(inferStructure(dropped.layout).warnings).toEqual([]);

    // Dropping x next to box (lower z) would cut box to 7 columns and leave c outside it.
    const side = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 8, 40] },
      { id: "c", type: "text", rect: [4, 2, 4, 10], parent: "box" },
    ]);
    const inserted = insertBlock(side, { type: "text", label: "x", rect: rect(7, 30, 5, 20), id: "x" });
    expect(inserted.adjustments).toEqual([{ kind: "clip", id: "x", from: rect(7, 30, 5, 20), to: rect(8, 30, 4, 20) }]);
    expect(inferStructure(inserted.layout).warnings).toEqual([]);
  });

  test("a stale clip fix that would strand a child does not apply", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 8, 40] },
      { id: "c", type: "text", rect: [4, 2, 4, 10], parent: "box" },
    ]);
    expect(applyFix(layout, { kind: "clip", id: "box", rect: rect(0, 0, 7, 40) })).toBe(layout);
    expect(applyFix(layout, { kind: "clip", id: "box", rect: rect(0, 0, 8, 30) }).blocks.box!.rect).toEqual(rect(0, 0, 8, 30));
  });

  test("a full container grows by pushing down what is below it (insert and duplicate)", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 10, 12, 20] },
      { id: "full", type: "text", rect: [0, 10, 12, 20], parent: "box" },
      { id: "footer", type: "footer", rect: [0, 30, 12, 20] },
    ]);
    const inserted = insertBlock(layout, { type: "text", label: "t", parentId: "box", id: "t" });
    expect(inserted.grown).toEqual({ id: "box", from: rect(0, 10, 12, 20), to: rect(0, 10, 12, 40) });
    expect(inserted.layout.blocks.footer!.rect).toEqual(rect(0, 50, 12, 20));
    expect(inferStructure(inserted.layout).warnings).toEqual([]);

    const duplicated = duplicateBlock(layout, "full", { newId: "copy" });
    expect(duplicated.layout.blocks.copy).toMatchObject({ rect: rect(0, 30, 12, 20), parentId: "box" });
    expect(duplicated.layout.blocks.footer!.rect).toEqual(rect(0, 50, 12, 20));
    expect(inferStructure(duplicated.layout).warnings).toEqual([]);
  });

  test("growth goes up the ancestors; blocks beside the grown one stay", () => {
    const layout = makeLayout([
      { id: "outer", type: "container", rect: [0, 0, 12, 40] },
      { id: "inner", type: "container", rect: [0, 0, 6, 30], parent: "outer" },
      { id: "full", type: "cards", rect: [0, 0, 6, 30], parent: "inner" },
      { id: "side", type: "text", rect: [6, 0, 6, 10], parent: "outer" },
      { id: "below", type: "text", rect: [0, 32, 12, 8], parent: "outer" },
      { id: "footer", type: "footer", rect: [0, 40, 12, 20] },
    ]);
    const { layout: next } = insertBlock(layout, { type: "text", label: "t", parentId: "inner", id: "t" });
    expect(next.blocks.inner!.rect).toEqual(rect(0, 0, 6, 50));
    expect(next.blocks.side!.rect).toEqual(rect(6, 0, 6, 10));
    expect(next.blocks.below!.rect).toEqual(rect(0, 52, 12, 8));
    expect(next.blocks.outer!.rect).toEqual(rect(0, 0, 12, 60));
    expect(next.blocks.footer!.rect).toEqual(rect(0, 60, 12, 20));
    expect(inferStructure(next).warnings).toEqual([]);
  });

  test("an overlay inserted into a container never grows it", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 40] },
      { id: "cta", type: "cta", rect: [0, 42, 12, 25] },
    ]);
    const result = insertBlock(layout, { type: "modal", label: "m", parentId: "box", id: "m" });
    expect(result.grown).toBeUndefined();
    expect(result.layout.blocks.box!.rect).toEqual(rect(0, 0, 12, 40));
    expect(result.layout.blocks.m).toMatchObject({ rect: rect(3, 8, 6, 30), parentId: "box" });
    // In a shorter container it moves up from row 8 to fit (34 - 30 = row 4).
    const short = makeLayout([{ id: "box", type: "container", rect: [0, 0, 12, 34] }]);
    expect(findFreeSlot(short, { w: 6, h: 30 }, { parentId: "box", overlay: true })).toEqual({ rect: rect(3, 4, 6, 30) });
  });

  test("the nest fix also puts the block inside its new parent", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 10, 40] },
      { id: "t", type: "text", rect: [1, 2, 10, 20] },
    ]);
    const [warning] = inferStructure(layout).warnings;
    expect(warning).toMatchObject({ code: "implicit-containment", fixes: [{ kind: "nest", id: "t", parentId: "box" }] });
    const fixed = applyFix(layout, warning!.fixes[0]!);
    expect(fixed.blocks.t).toMatchObject({ rect: rect(0, 2, 10, 20), parentId: "box" });
    expect(inferStructure(fixed).warnings).toEqual([]);
  });

  test("rows and heights past the limits are clamped on drop", () => {
    const layout = makeLayout([{ id: "a", type: "text", rect: [0, 0, 6, 10] }]);
    const huge = moveBlock(layout, "a", rect(0, 999_999_999, 6, 125_000_000_000));
    const { layout: next, adjustments } = normalizeDrop(huge, "a");
    expect(next.blocks.a!.rect).toEqual(rect(0, MAX_ROW, 6, MAX_HEIGHT_ROWS));
    expect(adjustments).toEqual([
      { kind: "clamp", id: "a", from: rect(0, 999_999_999, 6, 125_000_000_000), to: rect(0, MAX_ROW, 6, MAX_HEIGHT_ROWS) },
    ]);
  });
});
