import type { LayoutBlock, LayoutDoc, LayoutWarning } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { getStructure } from "../structureCache";
import { focusIndexAfterFix, warningGroups, warningItems } from "./warnings";

const block = (type: LayoutBlock["type"], label: string, col: number, row: number, w: number, h: number): LayoutBlock => ({
  type,
  label,
  rect: { col, row, w, h },
  z: 0,
});
const layoutOf = (blocks: Record<string, LayoutBlock>): LayoutDoc => ({ version: 1, columns: 12, rowUnit: 8, blocks });

/** A hero and a text block that overlap by half of the text: one `overlap` warning with «Poner debajo». */
const overlapping = layoutOf({
  "b-hero01": block("hero", "Hero", 0, 0, 12, 40),
  "b-text01": block("text", "Intro", 0, 30, 12, 20),
});
const clean = layoutOf({ "b-nav001": block("navbar", "Navbar", 0, 0, 12, 8), "b-hero02": block("hero", "Hero", 0, 8, 12, 40) });

describe("warningItems", () => {
  it("names the blocks in warning order and the block each fix acts on", () => {
    const warnings: LayoutWarning[] = [
      {
        code: "implicit-containment",
        ids: ["b-text01", "b-hero01"],
        fixes: [{ kind: "nest", id: "b-text01", parentId: "b-hero01" }],
      },
      { code: "overlap", ids: ["b-hero01", "b-text01"], fixes: [{ kind: "move-below", id: "b-text01", below: "b-hero01" }] },
    ];
    const items = warningItems(warnings, overlapping);
    expect(items.map((item) => item.names)).toEqual([
      ["Intro", "Hero"],
      ["Hero", "Intro"],
    ]);
    expect(items[0]!.fixes).toEqual([
      { key: "nest:b-text01:0", fix: { kind: "nest", id: "b-text01", parentId: "b-hero01" }, blockName: "Intro" },
    ]);
    expect(items[1]!.fixes[0]!.blockName).toBe("Intro");
  });

  it("keeps keys unique for repeated warnings and falls back to the id for unknown blocks", () => {
    const warning: LayoutWarning = { code: "overlap", ids: ["b-text01", "b-gone00"], fixes: [] };
    const items = warningItems([warning, warning], overlapping);
    expect(new Set(items.map((item) => item.key)).size).toBe(2);
    expect(items[0]!.names).toEqual(["Intro", "b-gone00"]);
    expect(warningItems([{ code: "too-many-blocks", ids: [], fixes: [] }], overlapping)[0]!.names).toEqual([]);
  });
});

describe("warningGroups", () => {
  it("lists only screens with warnings, the active one first", () => {
    const screens = [
      { id: "s-a", name: "Inicio", layout: overlapping },
      { id: "s-b", name: "Precios", layout: clean },
      { id: "s-c", name: "Blog", layout: overlapping },
    ];
    const groups = warningGroups(screens, getStructure, "s-c");
    expect(groups.map((group) => group.screenId)).toEqual(["s-c", "s-a"]);
    expect(groups[0]!.screenName).toBe("Blog");
    const overlap = groups[0]!.items.find((item) => item.code === "overlap");
    expect(overlap?.fixes.map((f) => f.fix.kind)).toContain("move-below");
    expect(warningGroups([{ id: "s-b", name: "Precios", layout: clean }], getStructure)).toEqual([]);
  });
});

describe("focusIndexAfterFix", () => {
  it("stays on the row that took the fixed one's place, else the last row", () => {
    expect(focusIndexAfterFix(1, 3)).toBe(1);
    expect(focusIndexAfterFix(2, 2)).toBe(1);
    expect(focusIndexAfterFix(0, 0)).toBe(-1);
    expect(focusIndexAfterFix(-3, 2)).toBe(0);
  });
});
