import { inferStructure, type GridRect, type LayoutBlock, type LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { regionOutlines } from "./regions";

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

function layoutOf(blocks: Record<string, Pick<LayoutBlock, "type" | "rect"> & Partial<LayoutBlock>>): LayoutDoc {
  const out: Record<string, LayoutBlock> = {};
  let z = 1;
  for (const [id, block] of Object.entries(blocks)) out[id] = { label: id, z: z++, ...block };
  return { version: 1, columns: 12, rowUnit: 8, blocks: out };
}

describe("regionOutlines", () => {
  it("is empty without a structure or with a single block", () => {
    expect(regionOutlines(null)).toEqual([]);
    expect(regionOutlines(inferStructure(layoutOf({ hero: { type: "hero", rect: rect(0, 0, 12, 40) } })).root)).toEqual([]);
  });

  it("outlines a stack of rows, parents first, with their depth", () => {
    const layout = layoutOf({
      nav: { type: "navbar", rect: rect(0, 0, 12, 8) },
      a: { type: "cards", rect: rect(0, 10, 6, 20) },
      b: { type: "cards", rect: rect(6, 10, 6, 20) },
      footer: { type: "footer", rect: rect(0, 32, 12, 10) },
    });
    const outlines = regionOutlines(inferStructure(layout).root);
    expect(outlines.map(({ kind, depth }) => [kind, depth])).toEqual([
      ["stack", 0],
      ["row", 1],
    ]);
    expect(outlines[0]!.rect).toEqual(rect(0, 0, 12, 42));
    expect(outlines[1]!.rect).toEqual(rect(0, 10, 12, 20));
  });

  it("goes inside a block's content, one level deeper", () => {
    const layout = layoutOf({
      box: { type: "container", rect: rect(0, 0, 12, 40) },
      a: { type: "text", rect: rect(0, 0, 6, 10), parentId: "box" },
      b: { type: "text", rect: rect(0, 20, 6, 10), parentId: "box" },
    });
    const outlines = regionOutlines(inferStructure(layout).root);
    expect(outlines).toHaveLength(1);
    expect(outlines[0]).toMatchObject({ kind: "stack", depth: 1 });
  });

  it("outlines grids (no clean cut)", () => {
    const layout = layoutOf({
      a: { type: "cards", rect: rect(0, 0, 8, 10) },
      b: { type: "cards", rect: rect(8, 0, 4, 20) },
      c: { type: "cards", rect: rect(0, 10, 4, 20) },
      d: { type: "cards", rect: rect(4, 20, 8, 10) },
      e: { type: "cards", rect: rect(4, 10, 4, 10) },
    });
    const kinds = regionOutlines(inferStructure(layout).root).map((outline) => outline.kind);
    expect(kinds[0]).toBe("grid");
  });
});
