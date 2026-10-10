import { describe, expect, test } from "vitest";
import { MAX_BLOCKS } from "./constants";
import { areaName, inferStructure } from "./infer";
import { makeLayout } from "./testing/fixtures";
import type { LayoutDoc, StructureNode } from "./types";

const kinds = (node: StructureNode | null): unknown => {
  if (!node) return null;
  switch (node.kind) {
    case "block":
      return node.content ? { [node.id]: kinds(node.content) } : node.id;
    case "stack":
    case "row":
      return { [node.kind]: node.children.map((c) => kinds(c.node)) };
    case "grid":
      return { grid: node.items.map((i) => kinds(i.node)) };
  }
};

describe("XY-cut", () => {
  test("prefers horizontal cuts: a 2×2 of cards reads by rows", () => {
    const layout = makeLayout([
      { id: "a", type: "cards", rect: [0, 0, 6, 20] },
      { id: "b", type: "cards", rect: [6, 0, 6, 20] },
      { id: "c", type: "cards", rect: [0, 20, 6, 20] },
      { id: "d", type: "cards", rect: [6, 20, 6, 20] },
    ]);
    const { root, order } = inferStructure(layout);
    expect(kinds(root)).toEqual({ stack: [{ row: ["a", "b"] }, { row: ["c", "d"] }] });
    expect(order).toEqual(["a", "b", "c", "d"]);
  });

  test("vertical cuts when there is no horizontal one; offsets inside the frame are kept", () => {
    const layout = makeLayout([
      { id: "left", type: "list", rect: [1, 0, 3, 40] },
      { id: "top", type: "text", rect: [5, 0, 7, 10] },
      { id: "bottom", type: "table", rect: [5, 12, 7, 30] },
    ]);
    const { root } = inferStructure(layout);
    expect(kinds(root)).toEqual({ row: ["left", { stack: ["top", "bottom"] }] });
    if (root?.kind !== "row") throw new Error("row expected");
    expect(root.children.map((c) => [c.start, c.span])).toEqual([
      [1, 3],
      [5, 7],
    ]);
    const stack = root.children[1]!.node;
    expect(stack.frame).toEqual({ col: 5, w: 7 });
    expect(stack.kind === "stack" && stack.children.map((c) => [c.start, c.span])).toEqual([
      [0, 7],
      [0, 7],
    ]);
    expect(stack.kind === "stack" && stack.gaps).toEqual([2]);
    expect(root.rect).toEqual({ col: 0, row: 0, w: 12, h: 42 });
  });

  test("stack placements are relative to the frame; groups span the whole frame", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [2, 0, 4, 10] },
      { id: "b", type: "text", rect: [0, 12, 6, 10] },
      { id: "c", type: "text", rect: [6, 12, 6, 10] },
    ]);
    const { root } = inferStructure(layout);
    if (root?.kind !== "stack") throw new Error("stack expected");
    expect(root.children.map((c) => [c.node.kind, c.start, c.span])).toEqual([
      ["block", 2, 4],
      ["row", 0, 12],
    ]);
  });

  test("tolerance: a 1-unit overlap still cuts when it is small next to both blocks", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 10] },
      { id: "b", type: "text", rect: [0, 9, 12, 10] },
    ]);
    const { root } = inferStructure(layout);
    expect(root?.kind).toBe("stack");
    expect(root?.kind === "stack" && root.gaps).toEqual([0]);
  });

  test("tolerance does not cut thin blocks or 2-unit overlaps", () => {
    const thin = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 2] },
      { id: "b", type: "text", rect: [6, 1, 6, 2] },
    ]);
    // Overlap 1 is not < 2/2: no horizontal cut; the vertical one splits them.
    expect(inferStructure(thin).root?.kind).toBe("row");
    const deep = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 7, 10] },
      { id: "b", type: "text", rect: [5, 8, 7, 10] },
    ]);
    expect(inferStructure(deep).root?.kind).toBe("grid");
  });

  test("a later thin block that overlaps more than allowed merges the groups back", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 10] },
      { id: "b", type: "text", rect: [0, 9, 6, 20] },
      { id: "c", type: "text", rect: [6, 9, 6, 1] },
    ]);
    // b alone would cut (1 < 5), but c (h = 1) overlaps a by 1 = not < 0.5: no cut between a and b/c.
    const { root } = inferStructure(layout);
    expect(root?.kind).not.toBe("stack");
  });

  test("grid fallback: tracks from edges, 1-based lines, areas from ids", () => {
    const layout = makeLayout([
      { id: "n", type: "text", rect: [0, 0, 9, 20] },
      { id: "e", type: "media", rect: [9, 0, 3, 40] },
      { id: "w", type: "media", rect: [0, 20, 3, 40] },
      { id: "c", type: "cards", rect: [3, 20, 6, 20] },
      { id: "s", type: "text", rect: [3, 40, 9, 20] },
    ]);
    const { root } = inferStructure(layout);
    if (root?.kind !== "grid") throw new Error("grid expected");
    expect(root.columns).toEqual([3, 6, 3]);
    expect(root.rows).toEqual([20, 20, 20]);
    expect(root.items.map((i) => [i.node.kind === "block" && i.node.id, i.colStart, i.colEnd, i.rowStart, i.rowEnd])).toEqual([
      ["n", 1, 3, 1, 2],
      ["e", 3, 4, 1, 3],
      ["w", 1, 2, 2, 4],
      ["c", 2, 3, 2, 3],
      ["s", 2, 4, 3, 4],
    ]);
    expect(root.areas).toEqual(["n n e", "w c e", "w s s"]);
  });

  test("grid tracks include empty columns of the frame", () => {
    const layout = makeLayout([
      { id: "n", type: "text", rect: [2, 0, 6, 10] },
      { id: "e", type: "text", rect: [8, 0, 2, 20] },
      { id: "w", type: "text", rect: [2, 10, 2, 20] },
      { id: "c", type: "text", rect: [4, 10, 4, 10] },
      { id: "s", type: "text", rect: [4, 20, 6, 10] },
    ]);
    const { root } = inferStructure(layout);
    expect(root?.kind === "grid" && root.columns).toEqual([2, 2, 4, 2, 2]);
    expect(root?.kind === "grid" && root.areas![0]).toBe(". n n e .");
  });

  test("area names: ids that are not CSS idents get a prefix", () => {
    expect(areaName("hero-1")).toBe("hero-1");
    expect(areaName("b-abc123")).toBe("b-abc123");
    expect(areaName("1abc")).toBe("a-1abc");
  });

  test("a single block is the root", () => {
    const { root } = inferStructure(makeLayout([{ id: "only", type: "text", rect: [3, 2, 6, 10] }]));
    expect(root).toEqual({
      kind: "block",
      id: "only",
      rect: { col: 3, row: 2, w: 6, h: 10 },
      frame: { col: 3, w: 6 },
      content: null,
    });
  });
});

describe("nesting and overlays", () => {
  test("explicit parents make scopes cut with the parent's columns", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 40] },
      { id: "x", type: "text", rect: [1, 2, 4, 30], parent: "box" },
      { id: "y", type: "text", rect: [6, 2, 5, 30], parent: "box" },
      { id: "below", type: "text", rect: [0, 42, 12, 10] },
    ]);
    const { root, order, warnings } = inferStructure(layout);
    expect(kinds(root)).toEqual({ stack: [{ box: { row: ["x", "y"] } }, "below"] });
    expect(order).toEqual(["box", "x", "y", "below"]);
    expect(warnings).toEqual([]);
    const box = root?.kind === "stack" ? root.children[0]!.node : null;
    expect(box?.kind === "block" && box.content?.frame).toEqual({ col: 0, w: 12 });
  });

  test("a block's single child is a block node", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "shot", type: "media", rect: [6, 4, 5, 50], parent: "hero" },
    ]);
    const { root, warnings } = inferStructure(layout);
    expect(root).toMatchObject({ kind: "block", id: "hero", content: { kind: "block", id: "shot" } });
    expect(warnings).toEqual([]);
  });

  test("overlays leave the flow, wherever they are nested", () => {
    const layout = makeLayout([
      { id: "page", type: "container", rect: [0, 0, 12, 80] },
      { id: "table", type: "table", rect: [0, 2, 12, 50], parent: "page" },
      { id: "dialog", type: "modal", rect: [3, 10, 6, 30], parent: "page" },
      { id: "field", type: "form", rect: [4, 12, 4, 20], parent: "dialog" },
      { id: "top", type: "modal", rect: [0, 0, 4, 10] },
    ]);
    const structure = inferStructure(layout);
    expect(kinds(structure.root)).toEqual({ page: "table" });
    expect(structure.overlays.map((o) => o.id)).toEqual(["top", "dialog"]);
    expect(structure.order).toEqual(["page", "table", "top", "dialog", "field"]);
    expect(structure.warnings).toEqual([]);
  });

  test("only overlays: root is null", () => {
    const layout = makeLayout([{ id: "m", type: "modal", rect: [3, 10, 6, 30] }]);
    const structure = inferStructure(layout);
    expect(structure.root).toBeNull();
    expect(structure.order).toEqual(["m"]);
  });
});

describe("warnings", () => {
  test("overlap with move-below and clip (<15 %)", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 20] },
      { id: "b", type: "text", rect: [0, 18, 12, 20] },
    ]);
    const { warnings } = inferStructure(layout);
    expect(warnings).toEqual([
      {
        code: "overlap",
        ids: ["a", "b"],
        ratio: 0.1,
        fixes: [
          { kind: "move-below", id: "b", below: "a" },
          { kind: "clip", id: "a", rect: { col: 0, row: 0, w: 12, h: 18 } },
        ],
      },
    ]);
  });

  test("lower block: greater row, then greater z, then id", () => {
    const same = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 8, 20], z: 5 },
      { id: "b", type: "text", rect: [4, 0, 8, 20], z: 2 },
    ]);
    expect(inferStructure(same).warnings[0]!.fixes[0]).toEqual({ kind: "move-below", id: "a", below: "b" });
  });

  test("a container covering ≥90 % of a sibling: implicit containment with nest", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 40] },
      { id: "card", type: "text", rect: [1, 2, 4, 20] },
    ]);
    expect(inferStructure(layout).warnings).toEqual([
      { code: "implicit-containment", ids: ["card", "box"], ratio: 1, fixes: [{ kind: "nest", id: "card", parentId: "box" }] },
    ]);
  });

  test("a non-container covering a sibling is a plain overlap", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 40] },
      { id: "card", type: "text", rect: [1, 2, 4, 20] },
    ]);
    const [warning] = inferStructure(layout).warnings;
    expect(warning).toMatchObject({ code: "overlap", ratio: 1 });
    expect(warning!.fixes).toEqual([{ kind: "move-below", id: "card", below: "hero" }]);
  });

  test("outside-parent: fit-inside when it fits, unparent when it cannot", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 6, 20] },
      { id: "small", type: "text", rect: [4, 10, 4, 5], parent: "box" },
      { id: "big", type: "text", rect: [0, 30, 8, 10], parent: "box" },
    ]);
    const outside = inferStructure(layout).warnings.filter((w) => w.code === "outside-parent");
    expect(outside).toEqual([
      { code: "outside-parent", ids: ["big", "box"], fixes: [{ kind: "unparent", id: "big" }] },
      { code: "outside-parent", ids: ["small", "box"], fixes: [{ kind: "fit-inside", id: "small", rect: { col: 2, row: 10, w: 4, h: 5 } }] },
    ]);
  });

  test("not-accepted: a child the parent cannot hold, still laid out as content", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 40] },
      { id: "t", type: "table", rect: [1, 2, 10, 30], parent: "hero" },
    ]);
    const { warnings, root } = inferStructure(layout);
    expect(warnings).toEqual([{ code: "not-accepted", ids: ["t", "hero"], fixes: [{ kind: "unparent", id: "t" }] }]);
    expect(root).toMatchObject({ id: "hero", content: { id: "t" } });
  });

  test("missing parents and cycles go to the root", () => {
    const layout = makeLayout([
      { id: "a", type: "container", rect: [0, 0, 12, 10], parent: "b" },
      { id: "b", type: "container", rect: [0, 20, 12, 10], parent: "a" },
      { id: "c", type: "text", rect: [0, 40, 12, 10], parent: "ghost" },
      { id: "d", type: "text", rect: [0, 60, 12, 10], parent: "d" },
      { id: "e", type: "text", rect: [0, 22, 6, 5], parent: "b" },
    ]);
    const { warnings, root, order } = inferStructure(layout);
    expect(warnings.map((w) => [w.code, w.ids, w.fixes])).toEqual([
      ["missing-parent", ["c"], [{ kind: "unparent", id: "c" }]],
      ["cycle", ["a", "b"], [{ kind: "unparent", id: "a" }, { kind: "unparent", id: "b" }]],
      ["cycle", ["d"], [{ kind: "unparent", id: "d" }]],
    ]);
    expect(kinds(root)).toEqual({ stack: ["a", { b: "e" }, "c", "d"] });
    expect(order).toEqual(["a", "b", "e", "c", "d"]);
  });

  test("out-of-bounds and invalid rects are computed clamped and reported", () => {
    const layout = makeLayout([
      { id: "wide", type: "text", rect: [4, 0, 12, 10] },
      { id: "neg", type: "text", rect: [-2, 20, 4, 10] },
    ]);
    layout.blocks.frac = { type: "text", label: "frac", rect: { col: 0.4, row: 40.6, w: 3.5, h: 0 }, z: 3 };
    const { warnings, root } = inferStructure(layout);
    expect(warnings).toEqual([
      { code: "out-of-bounds", ids: ["neg"], fixes: [{ kind: "fit-inside", id: "neg", rect: { col: 0, row: 20, w: 4, h: 10 } }] },
      { code: "out-of-bounds", ids: ["wide"], fixes: [{ kind: "fit-inside", id: "wide", rect: { col: 0, row: 0, w: 12, h: 10 } }] },
      { code: "invalid-rect", ids: ["frac"], fixes: [{ kind: "fit-inside", id: "frac", rect: { col: 0, row: 41, w: 4, h: 1 } }] },
    ]);
    expect(root?.kind).toBe("stack");
  });

  test("too-many-blocks above the cap", () => {
    const rows = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({
      id: `b${i}`,
      type: "text" as const,
      rect: [0, i * 2, 12, 2] as [number, number, number, number],
    }));
    const { warnings, order } = inferStructure(makeLayout(rows));
    expect(warnings).toEqual([{ code: "too-many-blocks", ids: [], fixes: [] }]);
    expect(order).toHaveLength(MAX_BLOCKS + 1);
  });
});

describe("robustness", () => {
  test("never throws and never mutates on garbage", () => {
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      "layout",
      {},
      { blocks: null },
      { blocks: { a: null, b: 3, c: "x" } },
      { blocks: { a: { type: "nope", rect: null } } },
      { blocks: { a: { type: "text", rect: { col: NaN, row: Infinity, w: -3, h: "x" }, z: NaN, parentId: 7 } } },
      { blocks: { a: { type: "text", rect: { col: 0, row: 0, w: 12, h: 10 }, z: 1, parentId: "a", responsive: 5 } } },
    ];
    for (const input of garbage) {
      const before = JSON.stringify(input);
      expect(() => inferStructure(input as LayoutDoc)).not.toThrow();
      expect(JSON.stringify(input)).toBe(before);
    }
    const structure = inferStructure({ blocks: { a: { type: "nope", rect: null } } } as unknown as LayoutDoc);
    expect(structure.order).toEqual(["a"]);
    expect(structure.warnings.map((w) => w.code)).toEqual(["invalid-rect"]);
  });
});
