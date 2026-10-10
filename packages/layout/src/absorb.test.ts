import { describe, expect, test } from "vitest";
import { absorbChildren } from "./absorb";
import { blockCount } from "./estimate";
import { inferStructure } from "./infer";
import { makeLayout } from "./testing/fixtures";
import { mulberry32, randomLayout } from "./testing/random";
import { validateLayout } from "./validate";

describe("absorbChildren", () => {
  test("nothing to absorb: the same layout object comes back", () => {
    const layout = makeLayout([
      { id: "nav", type: "navbar", rect: [0, 0, 12, 8] },
      { id: "box", type: "container", rect: [0, 10, 12, 40] },
      { id: "txt", type: "text", rect: [1, 12, 5, 10], parent: "box" },
    ]);
    const result = absorbChildren(layout);
    expect(result.layout).toBe(layout);
    expect(result).toMatchObject({ absorbed: {}, unparented: [], warnings: [] });
  });

  test("a hero absorbs its media, text and form; the input is not changed", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "pic", type: "media", rect: [7, 4, 5, 40], parent: "hero" },
      { id: "copy", type: "text", rect: [0, 4, 6, 20], parent: "hero" },
      { id: "after", type: "features", rect: [0, 62, 12, 40] },
    ]);
    const before = JSON.stringify(layout);
    const result = absorbChildren(layout);
    expect(result.absorbed).toEqual({ pic: "hero", copy: "hero" });
    expect(Object.keys(result.layout.blocks).sort()).toEqual(["after", "hero"]);
    expect(result.unparented).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(JSON.stringify(layout)).toBe(before);
    expect(result.layout.blocks.hero).toBe(layout.blocks.hero);
  });

  test("children a block does not accept move to its scope, with a not-accepted warning", () => {
    const layout = makeLayout([
      { id: "box", type: "container", rect: [0, 0, 12, 100] },
      { id: "hero", type: "hero", rect: [0, 2, 12, 60], parent: "box" },
      { id: "tbl", type: "table", rect: [1, 4, 10, 30], parent: "hero" },
      { id: "pic", type: "media", rect: [1, 40, 4, 10], parent: "hero" },
    ]);
    const result = absorbChildren(layout);
    expect(result.absorbed).toEqual({ pic: "hero" });
    expect(result.unparented).toEqual(["tbl"]);
    expect(result.layout.blocks.tbl?.parentId).toBe("box");
    expect(result.warnings).toEqual([{ code: "not-accepted", ids: ["tbl", "hero"], fixes: [{ kind: "unparent", id: "tbl" }] }]);
    // At the root, the moved block loses its parent.
    const root = absorbChildren(
      makeLayout([
        { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
        { id: "kpi", type: "kpis", rect: [0, 2, 12, 14], parent: "hero" },
      ]),
    );
    expect(root.layout.blocks.kpi?.parentId).toBeUndefined();
    expect("parentId" in root.layout.blocks.kpi!).toBe(false);
  });

  test("children of an absorbed block are judged against the block that absorbed it", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "copy", type: "text", rect: [0, 2, 8, 40], parent: "hero" },
      { id: "pic", type: "media", rect: [1, 4, 3, 10], parent: "copy" },
      { id: "kpi", type: "kpis", rect: [1, 20, 6, 10], parent: "copy" },
    ]);
    const result = absorbChildren(layout);
    expect(result.absorbed).toEqual({ copy: "hero", pic: "hero" });
    expect(result.unparented).toEqual(["kpi"]);
    expect(result.layout.blocks.kpi?.parentId).toBeUndefined();
    expect(result.warnings[0]?.ids).toEqual(["kpi", "copy"]);
  });

  test("modals and containers keep their children; missing parents are left to inferStructure", () => {
    const layout = makeLayout([
      { id: "dlg", type: "modal", rect: [3, 10, 6, 30] },
      { id: "frm", type: "form", rect: [4, 12, 4, 20], parent: "dlg" },
      { id: "lost", type: "text", rect: [0, 0, 4, 8], parent: "nowhere" },
    ]);
    const result = absorbChildren(layout);
    expect(result.layout).toBe(layout);
    expect(inferStructure(result.layout).warnings.some((w) => w.code === "missing-parent")).toBe(true);
  });

  test("random layouts: valid output, no non-container parent left with children, every block accounted for", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const layout = randomLayout(mulberry32(seed), { maxBlocks: 30 });
      const result = absorbChildren(layout);
      expect(validateLayout(result.layout)).toEqual([]);
      const kept = Object.keys(result.layout.blocks);
      expect(kept.length + Object.keys(result.absorbed).length).toBe(Object.keys(layout.blocks).length);
      for (const block of Object.values(result.layout.blocks)) {
        if (!block.parentId) continue;
        const parent = result.layout.blocks[block.parentId]!;
        expect(["container", "modal"]).toContain(parent.type);
      }
      expect(absorbChildren(result.layout).layout).toBe(result.layout);
    }
  });
});

describe("blockCount", () => {
  const block = (type: "kpis" | "table" | "pricing", extra: { count?: number; note?: string } = {}) => ({
    type,
    label: type,
    rect: { col: 0, row: 0, w: 12, h: 14 },
    z: 1,
    ...extra,
  });

  test("count, then the note's number, clamped; undefined otherwise", () => {
    expect(blockCount(block("kpis"))).toBeUndefined();
    expect(blockCount(block("kpis", { count: 3 }))).toBe(3);
    expect(blockCount(block("kpis", { note: "cinco" }))).toBe(5);
    expect(blockCount(block("kpis", { count: 2, note: "5" }))).toBe(2);
    expect(blockCount(block("pricing", { note: "9 planes" }))).toBe(4);
    expect(blockCount(block("table", { count: 5 }))).toBeUndefined();
  });
});
