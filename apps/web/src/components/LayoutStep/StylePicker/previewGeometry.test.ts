import { emptyLayout, type LayoutBlock, type LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { HEADER_STRIP_PX, NAV_FRAME_PX } from "../constants";
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "./constants";
import { computePreviewGeometry, getPreviewGeometry, itemCount, templateLayout } from "./previewGeometry";

const block = (type: LayoutBlock["type"], col: number, row: number, w: number, h: number, extra: Partial<LayoutBlock> = {}): LayoutBlock => ({
  type,
  label: type,
  rect: { col, row, w, h },
  z: 0,
  ...extra,
});

const layoutOf = (blocks: Record<string, LayoutBlock>): LayoutDoc => ({ ...emptyLayout(), blocks });

const pct = (value: number, total: number) => Math.round((value / total) * 100000) / 1000;

describe("computePreviewGeometry", () => {
  it("places a block in percentages of the 1440 × 900 preview, with page padding and gaps", () => {
    const geometry = computePreviewGeometry(layoutOf({ "b-navbar": block("navbar", 0, 0, 12, 8) }), "landing", null);
    expect(geometry.nav).toBeNull();
    expect(geometry.header).toBeNull();
    expect(geometry.sample).toBe(false);
    const colPx = (PREVIEW_WIDTH - 48) / 12;
    expect(geometry.blocks).toEqual([
      {
        id: "b-navbar",
        type: "navbar",
        count: undefined,
        widthPx: 12 * colPx - 16,
        heightPx: 64 - 16,
        depth: 0,
        box: { left: pct(32, PREVIEW_WIDTH), top: pct(32, PREVIEW_HEIGHT), width: pct(12 * colPx - 16, PREVIEW_WIDTH), height: pct(48, PREVIEW_HEIGHT) },
      },
    ]);
  });

  it("draws the app frame: sidebar and page header", () => {
    const geometry = computePreviewGeometry(layoutOf({ k: block("kpis", 0, 0, 12, 14) }), "app", { nav: "sidebar", header: true });
    expect(geometry.nav).toEqual({
      kind: "sidebar",
      box: { left: 0, top: 0, width: pct(NAV_FRAME_PX.sidebar, PREVIEW_WIDTH), height: 100 },
      widthPx: NAV_FRAME_PX.sidebar,
      heightPx: PREVIEW_HEIGHT,
    });
    expect(geometry.header?.box).toEqual({
      left: pct(NAV_FRAME_PX.sidebar, PREVIEW_WIDTH),
      top: 0,
      width: pct(PREVIEW_WIDTH - NAV_FRAME_PX.sidebar, PREVIEW_WIDTH),
      height: pct(HEADER_STRIP_PX, PREVIEW_HEIGHT),
    });
    const [kpis] = geometry.blocks;
    expect(kpis?.box.left).toBe(pct(NAV_FRAME_PX.sidebar + 24 + 8, PREVIEW_WIDTH));
    expect(kpis?.box.top).toBe(pct(HEADER_STRIP_PX + 24 + 8, PREVIEW_HEIGHT));
  });

  it("draws a top navigation across the screen and no frame for «Ninguna»", () => {
    const topnav = computePreviewGeometry(emptyLayout(), "app", { nav: "topnav", header: false });
    expect(topnav.nav?.box).toEqual({ left: 0, top: 0, width: 100, height: pct(NAV_FRAME_PX.topnav, PREVIEW_HEIGHT) });
    expect(topnav.header).toBeNull();
    const none = computePreviewGeometry(emptyLayout(), "app", { nav: "none", header: false });
    expect(none.nav).toBeNull();
  });

  it("ignores a shell on landing screens", () => {
    const geometry = computePreviewGeometry(emptyLayout(), "landing", { nav: "sidebar", header: true });
    expect(geometry.nav).toBeNull();
    expect(geometry.header).toBeNull();
  });

  it("skips hidden blocks, their descendants and blocks below the fold", () => {
    const geometry = computePreviewGeometry(
      layoutOf({
        a: block("hero", 0, 0, 12, 20),
        box: block("container", 0, 20, 12, 30, { hidden: true }),
        inner: block("text", 0, 22, 6, 10, { parentId: "box" }),
        far: block("footer", 0, 200, 12, 20),
      }),
      "landing",
      null,
    );
    expect(geometry.blocks.map((item) => item.id)).toEqual(["a"]);
  });

  it("paints parents under children, then by z, and insets nested blocks a little more", () => {
    const geometry = computePreviewGeometry(
      layoutOf({
        child: block("text", 0, 2, 6, 10, { parentId: "group" }),
        group: block("container", 0, 0, 12, 20),
        top: block("media", 6, 0, 6, 10, { z: 2 }),
      }),
      "landing",
      null,
    );
    expect(geometry.blocks.map((item) => item.id)).toEqual(["group", "top", "child"]);
    const [group, , child] = geometry.blocks;
    expect(child?.depth).toBe(1);
    expect(child!.box.left).toBeGreaterThan(group!.box.left);
  });

  it("survives a parent cycle and an unknown type", () => {
    const geometry = computePreviewGeometry(
      layoutOf({
        a: block("container", 0, 0, 6, 10, { parentId: "b" }),
        b: block("container", 6, 0, 6, 10, { parentId: "a" }),
        c: { ...block("text", 0, 12, 6, 10), type: "unknown" as LayoutBlock["type"] },
      }),
      "landing",
      null,
    );
    expect(geometry.blocks).toHaveLength(3);
    expect(geometry.blocks.find((item) => item.id === "c")?.type).toBe("free");
  });
});

describe("computePreviewGeometry: stable blocks", () => {
  it("keeps the PreviewBlock (and its box) of every block a new layout version did not touch", () => {
    const hero = block("hero", 0, 0, 12, 20);
    const media = block("media", 0, 20, 6, 20);
    const v1 = layoutOf({ hero, media });
    // Only the media block changed (a new object, as the store does); the hero object is shared.
    const v2 = layoutOf({ hero, media: { ...media, rect: { ...media.rect, w: 8 } } });
    const first = computePreviewGeometry(v1, "landing", null);
    const second = computePreviewGeometry(v2, "landing", null);
    expect(second).not.toBe(first);
    expect(second.blocks[0]).toBe(first.blocks[0]);
    expect(second.blocks[0]?.box).toBe(first.blocks[0]?.box);
    expect(second.blocks[1]).not.toBe(first.blocks[1]);
    expect(second.blocks[1]?.widthPx).toBeGreaterThan(first.blocks[1]!.widthPx);
  });

  it("recomputes a block when its frame, its id or its nesting depth changes", () => {
    const text = block("text", 0, 2, 6, 10);
    const base = computePreviewGeometry(layoutOf({ t: text }), "app", { nav: "sidebar", header: false });
    const otherFrame = computePreviewGeometry(layoutOf({ t: text }), "app", { nav: "topnav", header: false });
    expect(otherFrame.blocks[0]).not.toBe(base.blocks[0]);
    expect(otherFrame.blocks[0]!.box.top).toBeGreaterThan(base.blocks[0]!.box.top);

    const otherId = computePreviewGeometry(layoutOf({ u: text }), "app", { nav: "sidebar", header: false });
    expect(otherId.blocks[0]?.id).toBe("u");

    // Same child object, now inside a container: deeper, so further in.
    const nested = { ...text, parentId: "group" };
    const shallow = computePreviewGeometry(layoutOf({ group: block("container", 0, 0, 12, 20), t: nested }), "landing", null);
    const deeper = computePreviewGeometry(
      layoutOf({ outer: block("container", 0, 0, 12, 30), group: block("container", 0, 0, 12, 20, { parentId: "outer" }), t: nested }),
      "landing",
      null,
    );
    const child = (geometry: typeof shallow) => geometry.blocks.find((item) => item.id === "t");
    expect(child(shallow)?.depth).toBe(1);
    expect(child(deeper)?.depth).toBe(2);
    expect(child(deeper)!.box.left).toBeGreaterThan(child(shallow)!.box.left);
  });
});

describe("getPreviewGeometry", () => {
  it("paints the Inicio template for an empty landing screen", () => {
    const geometry = getPreviewGeometry(emptyLayout(), "landing", null);
    expect(geometry.sample).toBe(true);
    // Inicio: navbar, hero, logos and features reach the fold; testimonials (row 120 = 960 px) do not.
    expect(geometry.blocks.map((item) => item.type)).toEqual(["navbar", "hero", "logos", "features"]);
  });

  it("paints the Dashboard template with the screen's frame for an empty app screen", () => {
    const geometry = getPreviewGeometry(emptyLayout(), "app", { nav: "rail", header: false });
    expect(geometry.sample).toBe(true);
    expect(geometry.nav?.kind).toBe("rail");
    expect(geometry.header).toBeNull();
    expect(geometry.blocks.map((item) => item.type)).toEqual(["kpis", "chart", "activity", "table"]);
    expect(getPreviewGeometry(null, "app", null).nav?.kind).toBe("sidebar");
  });

  it("is memoised per layout object and frame", () => {
    const layout = layoutOf({ a: block("hero", 0, 0, 12, 20) });
    const first = getPreviewGeometry(layout, "app", { nav: "sidebar", header: true });
    expect(getPreviewGeometry(layout, "app", { nav: "sidebar", header: true })).toBe(first);
    expect(getPreviewGeometry(layout, "app", { nav: "topnav", header: true })).not.toBe(first);
    expect(getPreviewGeometry({ ...layout }, "app", { nav: "sidebar", header: true })).not.toBe(first);
    expect(getPreviewGeometry(emptyLayout(), "landing", null)).toBe(getPreviewGeometry(emptyLayout(), "landing", null));
  });
});

describe("templateLayout", () => {
  it("builds a template with deterministic ids", () => {
    const layout = templateLayout("dashboard");
    expect(templateLayout("dashboard")).toBe(layout);
    expect(Object.keys(layout.blocks)).toEqual(["tpl-0", "tpl-1", "tpl-2", "tpl-3"]);
    expect(layout.blocks["tpl-0"]).toMatchObject({ type: "kpis", count: 4, rect: { col: 0, row: 0, w: 12, h: 14 } });
  });
});

describe("itemCount", () => {
  it("uses the count within the block's bounds, the library default, or the fallback", () => {
    expect(itemCount("kpis", undefined, 1)).toBe(4);
    expect(itemCount("kpis", 99, 1)).toBe(6);
    expect(itemCount("pricing", 2, 1)).toBe(2);
    expect(itemCount("table", undefined, 8)).toBe(8);
  });
});
