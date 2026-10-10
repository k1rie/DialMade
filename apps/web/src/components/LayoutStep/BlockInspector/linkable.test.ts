import type { LayoutBlock, LayoutDoc, LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { linkFieldMode } from "./linkable";

type Spec = [type: LibraryBlockType, col: number, row: number, w: number, h: number, extra?: Partial<LayoutBlock>];

function doc(specs: Record<string, Spec>): LayoutDoc {
  const blocks: Record<string, LayoutBlock> = {};
  let z = 0;
  for (const [id, [type, col, row, w, h, extra]] of Object.entries(specs)) {
    blocks[id] = { type, label: id, rect: { col, row, w, h }, z: ++z, ...extra };
  }
  return { version: 1, columns: 12, rowUnit: 8, blocks };
}

describe("linkFieldMode (review B #11)", () => {
  it("offers «Enlaza a» only on blocks whose section has a primary action", () => {
    const layout = doc({
      cta: ["cta", 0, 0, 12, 25],
      empty: ["empty", 0, 30, 6, 30],
      table: ["table", 0, 70, 12, 50],
      media: ["media", 0, 130, 6, 40],
      kpis: ["kpis", 0, 180, 12, 14],
    });
    expect(linkFieldMode(layout, "cta")).toBe("link");
    expect(linkFieldMode(layout, "empty")).toBe("link");
    expect(linkFieldMode(layout, "table")).toBe("none");
    expect(linkFieldMode(layout, "media")).toBe("none");
    expect(linkFieldMode(layout, "kpis")).toBe("none");
    expect(linkFieldMode(layout, "missing")).toBe("none");
  });

  it("an absorbed block links through the block that absorbs it", () => {
    const layout = doc({
      hero: ["hero", 0, 0, 12, 60],
      art: ["media", 7, 2, 5, 50, { parentId: "hero" }],
      box: ["container", 0, 70, 12, 40],
      pic: ["media", 1, 72, 5, 30, { parentId: "box" }],
    });
    expect(linkFieldMode(layout, "art")).toBe("link");
    // A container keeps its children: the media renders on its own and has nothing to click.
    expect(linkFieldMode(layout, "pic")).toBe("none");
  });

  it("keeps the field for a link nothing follows, so it can be seen and cleared (never dropped)", () => {
    const layout = doc({ table: ["table", 0, 0, 12, 50, { linkTo: "s-detail" }] });
    expect(linkFieldMode(layout, "table")).toBe("orphan");
  });
});
