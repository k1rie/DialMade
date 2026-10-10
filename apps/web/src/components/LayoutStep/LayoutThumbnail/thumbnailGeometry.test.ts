import { emptyLayout, type LayoutBlock, type LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import { THUMB_GAP_PX, THUMB_MAX_ASPECT, THUMB_PAD_PX, THUMB_WIDTH, thumbnailModel } from "./thumbnailGeometry";

const block = (type: LayoutBlock["type"], col: number, row: number, w: number, h: number, extra: Partial<LayoutBlock> = {}): LayoutBlock => ({
  type,
  label: type,
  rect: { col, row, w, h },
  z: 1,
  ...extra,
});

const layoutOf = (blocks: Record<string, LayoutBlock>): LayoutDoc => ({ ...emptyLayout(), blocks });

describe("thumbnailModel", () => {
  it("draws an empty layout as a 4:3 page without navigation", () => {
    const model = thumbnailModel(emptyLayout());
    expect(model.width).toBe(THUMB_WIDTH);
    expect(model.height).toBe(Math.ceil(THUMB_WIDTH / THUMB_MAX_ASPECT));
    expect(model.nav).toBeNull();
    expect(model.header).toBeNull();
    expect(model.blocks).toEqual([]);
  });

  it("keeps real proportions: 12 columns over the frame width, rows of 8 px, inset by the gap", () => {
    const model = thumbnailModel(layoutOf({ a: block("hero", 0, 0, 12, 60), b: block("text", 6, 60, 6, 10) }));
    const col = THUMB_WIDTH / 12;
    expect(model.blocks[0]).toMatchObject({ id: "a", x: THUMB_GAP_PX, y: THUMB_GAP_PX, width: THUMB_WIDTH - 2 * THUMB_GAP_PX, height: 480 - 2 * THUMB_GAP_PX });
    expect(model.blocks[1]).toMatchObject({ id: "b", x: 6 * col + THUMB_GAP_PX, y: 480 + THUMB_GAP_PX });
  });

  it("grows past 4:3 for long pages, with padding below the last block", () => {
    const model = thumbnailModel(layoutOf({ a: block("hero", 0, 0, 12, 270) }));
    expect(model.height).toBe(270 * 8 + THUMB_PAD_PX);
  });

  it("gives the sidebar its share and narrows the content grid", () => {
    const model = thumbnailModel(layoutOf({ a: block("table", 0, 0, 12, 10) }), { nav: "sidebar", header: false });
    expect(model.nav).toEqual({ x: 0, y: 0, width: NAV_FRAME_PX.sidebar, height: model.height });
    expect(model.blocks[0]?.x).toBe(NAV_FRAME_PX.sidebar + THUMB_GAP_PX);
    expect(model.blocks[0]?.width).toBe(THUMB_WIDTH - NAV_FRAME_PX.sidebar - 2 * THUMB_GAP_PX);
  });

  it("puts the top bar and the page header above the content", () => {
    const model = thumbnailModel(layoutOf({ a: block("table", 0, 0, 12, 10) }), { nav: "topnav", header: true });
    expect(model.nav).toEqual({ x: 0, y: 0, width: THUMB_WIDTH, height: NAV_FRAME_PX.topnav });
    expect(model.header).toEqual({ x: 0, y: NAV_FRAME_PX.topnav, width: THUMB_WIDTH, height: HEADER_STRIP_PX });
    expect(model.blocks[0]?.y).toBe(NAV_FRAME_PX.topnav + HEADER_STRIP_PX + THUMB_GAP_PX);
  });

  it("draws no frame for «Ninguna» and a rail of its own width", () => {
    expect(thumbnailModel(emptyLayout(), { nav: "none", header: false }).nav).toBeNull();
    expect(thumbnailModel(emptyLayout(), { nav: "rail", header: false }).nav?.width).toBe(NAV_FRAME_PX.rail);
  });

  it("paints parents before children and overlays last, insetting nested blocks more", () => {
    const model = thumbnailModel(
      layoutOf({
        m: block("modal", 3, 0, 6, 30, { z: 1 }),
        k: block("text", 1, 1, 4, 10, { z: 9, parentId: "c" }),
        c: block("container", 0, 0, 6, 20, { z: 5 }),
      }),
    );
    expect(model.blocks.map((b) => [b.id, b.kind])).toEqual([
      ["c", "container"],
      ["k", "block"],
      ["m", "overlay"],
    ]);
    const child = model.blocks[1]!;
    expect(child.x).toBe((THUMB_WIDTH / 12) * 1 + 2 * THUMB_GAP_PX);
  });

  it("inherits hiding from the parent", () => {
    const model = thumbnailModel(layoutOf({ c: block("container", 0, 0, 12, 20, { hidden: true }), k: block("text", 0, 0, 6, 10, { parentId: "c" }), o: block("text", 0, 30, 6, 10) }));
    const hidden = Object.fromEntries(model.blocks.map((b) => [b.id, b.hidden]));
    expect(hidden).toEqual({ c: true, k: true, o: false });
  });

  it("skips invalid rects, clamps out-of-grid ones and survives parent cycles", () => {
    const model = thumbnailModel(
      layoutOf({
        bad: block("text", Number.NaN, 0, 4, 4),
        wide: block("text", 10, 0, 8, 4),
        x: block("text", 0, 10, 2, 2, { parentId: "y" }),
        y: block("text", 0, 20, 2, 2, { parentId: "x" }),
      }),
    );
    expect(model.blocks.map((b) => b.id).sort()).toEqual(["wide", "x", "y"]);
    const wide = model.blocks.find((b) => b.id === "wide")!;
    expect(wide.x + wide.width).toBeLessThanOrEqual(THUMB_WIDTH);
  });
});
