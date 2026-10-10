import { describe, expect, test } from "vitest";
import { inferStructure } from "./infer";
import { deriveResponsive, distribute, effectiveCount, mobileHeight } from "./responsive";
import { fixture, makeLayout } from "./testing/fixtures";
import type { LayoutBlock } from "./types";
import { getBlockDef } from "./library";

describe("distribute", () => {
  test("largest remainder, ties to the left", () => {
    expect(distribute([4, 4, 4], 8)).toEqual([3, 3, 2]);
    expect(distribute([1, 5], 8)).toEqual([1, 7]);
    expect(distribute([3, 3, 3, 3], 8)).toEqual([2, 2, 2, 2]);
    expect(distribute([0, 0], 5)).toEqual([3, 2]);
    expect(distribute([], 5)).toEqual([]);
  });
});

describe("tablet", () => {
  test("a row that fits keeps its columns; spare columns go back to the gaps", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 3, 20] },
      { id: "b", type: "text", rect: [6, 0, 3, 20] },
    ]);
    const { tablet } = deriveResponsive(layout);
    const root = inferStructure(layout).root!;
    // spans 3 → 2, but text needs 3 on tablet: [3, 3] = 6 ≤ 8. Gaps 0/3/3 → 2 spare columns → 0/1/1.
    expect(tablet.nodes[root.id]).toEqual({ mode: "keep", spans: [3, 3], starts: [0, 4] });
    expect(tablet.blocks.a!.rect).toEqual({ col: 0, row: 0, w: 3, h: 20 });
    expect(tablet.blocks.b!.rect).toEqual({ col: 4, row: 0, w: 3, h: 20 });
  });

  test("a full row without gaps grows its spans to fill the frame", () => {
    const layout = makeLayout([
      { id: "a", type: "sidebar", rect: [0, 0, 3, 40] },
      { id: "b", type: "text", rect: [3, 0, 9, 40] },
    ]);
    const { tablet } = deriveResponsive(layout);
    expect(tablet.nodes[inferStructure(layout).root!.id]).toEqual({ mode: "keep", spans: [2, 6], starts: [0, 2] });
  });

  test("a row whose minCols fit is kept: rounded-up spans shrink where they have the most room (spec §5)", () => {
    // nav (sidebar, min 1) 2 → 1, main (text, min 3) 8 → 5, aside (list, min 3) 2 → 3: 9 > 8, but Σ min = 7.
    const { tablet } = deriveResponsive(fixture("holy-grail").layout);
    const structure = inferStructure(fixture("holy-grail").layout);
    const row = structure.root?.kind === "stack" ? structure.root.children[1]!.node : null;
    expect(tablet.nodes[row!.id]).toEqual({ mode: "keep", spans: [1, 4, 3], starts: [0, 1, 5] });
    expect(tablet.blocks.nav!.rect).toEqual({ col: 0, row: 10, w: 1, h: 60 });
    expect(tablet.blocks.main!.rect).toEqual({ col: 1, row: 10, w: 4, h: 60 });
    expect(tablet.blocks.aside!.rect).toEqual({ col: 5, row: 10, w: 3, h: 60 });
    expect(tablet.blocks.footer!.rect).toEqual({ col: 0, row: 72, w: 8, h: 20 });
  });

  test("a row whose minCols don't fit wraps in reading order, each line filling the frame", () => {
    // Three texts of 4 columns: 3 + 3 + 3 = 9 > 8 and every span is already at its minimum (3).
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 4, 20] },
      { id: "b", type: "text", rect: [4, 0, 4, 20] },
      { id: "c", type: "text", rect: [8, 0, 4, 20] },
    ]);
    const { tablet } = deriveResponsive(layout);
    expect(tablet.nodes[inferStructure(layout).root!.id]).toEqual({ mode: "wrap", spans: [4, 4, 8] });
    expect(tablet.blocks.a!.rect).toEqual({ col: 0, row: 0, w: 4, h: 20 });
    expect(tablet.blocks.b!.rect).toEqual({ col: 4, row: 0, w: 4, h: 20 });
    expect(tablet.blocks.c!.rect).toEqual({ col: 0, row: 22, w: 8, h: 20 });
  });

  test("a stack of narrow blocks keeps scaled starts; full-width stacks stay stacks", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [6, 0, 6, 10] },
      { id: "b", type: "text", rect: [0, 12, 12, 10] },
    ]);
    const { tablet } = deriveResponsive(layout);
    const id = inferStructure(layout).root!.id;
    expect(tablet.nodes[id]).toEqual({ mode: "keep", spans: [4, 8], starts: [4, 0] });
    const full = deriveResponsive(fixture("stacked-landing").layout).tablet;
    expect(Object.values(full.nodes)).toEqual([{ mode: "stack" }]);
  });

  test("a grid keeps when every cell fits its min columns, else it stacks", () => {
    const partial = deriveResponsive(fixture("partial-overlap").layout).tablet;
    expect(Object.values(partial.nodes)).toContainEqual({ mode: "keep", spans: [6, 5], starts: [0, 3] });
    const pinwheel = deriveResponsive(fixture("pinwheel").layout).tablet;
    expect(Object.values(pinwheel.nodes)).toEqual([{ mode: "stack" }]);
    expect(pinwheel.order).toEqual(["north", "east", "west", "center", "south"]);
    expect(pinwheel.blocks.east!.rect).toEqual({ col: 0, row: 22, w: 8, h: 40 });
  });

  test("blocks with content: plans under the block id; the content follows the block", () => {
    const layout = fixture("nested-cards").layout;
    const { tablet, mobile } = deriveResponsive(layout);
    expect(tablet.nodes.plans).toEqual({ mode: "wrap", spans: [4, 4, 8] });
    expect(mobile.nodes.plans).toEqual({ mode: "stack" });
    expect(tablet.blocks.plans!.rect).toEqual({ col: 0, row: 10, w: 8, h: 78 });
    expect(tablet.blocks["card-c"]!.rect).toEqual({ col: 0, row: 50, w: 8, h: 36 });
  });

  test("overlays scale on tablet and become full-width sheets on mobile", () => {
    const { tablet, mobile } = deriveResponsive(fixture("modal-overlay").layout);
    expect(tablet.blocks.dialog!.rect).toEqual({ col: 2, row: 10, w: 4, h: 30 });
    expect(mobile.blocks.dialog).toEqual({ rect: { col: 0, row: 10, w: 4, h: 30 }, behavior: "sheet", hidden: false });
    expect(mobile.order).toEqual(["table", "dialog", "invite-form"]);
  });
});

describe("mobile", () => {
  test("everything stacks full width in reading order with type behaviors", () => {
    const { mobile } = deriveResponsive(fixture("dashboard").layout);
    expect(mobile.order).toEqual(["kpis", "chart", "activity", "table"]);
    expect(mobile.blocks.kpis).toEqual({ rect: { col: 0, row: 0, w: 4, h: 28 }, behavior: "grid-2x2", hidden: false });
    expect(mobile.blocks.chart!.rect).toEqual({ col: 0, row: 30, w: 4, h: 40 });
    expect(mobile.blocks.activity!.rect).toEqual({ col: 0, row: 72, w: 4, h: 40 });
    expect(mobile.blocks.table).toEqual({ rect: { col: 0, row: 114, w: 4, h: 50 }, behavior: "card-list", hidden: false });
    for (const plan of Object.values(mobile.nodes)) expect(plan).toEqual({ mode: "stack" });
  });

  test("heights by behavior", () => {
    const item = (type: LayoutBlock["type"], w: number, h: number, count?: number) => ({
      block: { type, label: "", rect: { col: 0, row: 0, w, h }, z: 0, ...(count ? { count } : {}) } as LayoutBlock,
      def: getBlockDef(type),
      rect: { col: 0, row: 0, w, h },
    });
    expect(mobileHeight(item("navbar", 12, 12), "hamburger")).toBe(8);
    expect(mobileHeight(item("navbar", 12, 6), "hamburger")).toBe(6);
    expect(mobileHeight(item("sidebar", 3, 80), "drawer")).toBe(8);
    expect(mobileHeight(item("sidebar", 3, 80), "tabbar")).toBe(8);
    expect(mobileHeight(item("kpis", 12, 14, 2), "grid-2x2")).toBe(14);
    expect(mobileHeight(item("kpis", 12, 14, 5), "grid-2x2")).toBe(42);
    // cards ×6 at 12 columns: 3 per desktop line → 2 lines of 15 rows → 6 × 15.
    expect(mobileHeight(item("cards", 12, 30, 6), "one-column")).toBe(90);
    expect(mobileHeight(item("cards", 12, 30, 6), "carousel")).toBe(15);
    expect(mobileHeight(item("table", 12, 50), "card-list")).toBe(50);
  });

  test("hidden blocks: no rect, not in order; overrides and hide behavior", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 10] },
      { id: "b", type: "text", rect: [0, 12, 12, 10] },
      { id: "c", type: "text", rect: [0, 24, 12, 10] },
      { id: "d", type: "navbar", rect: [0, 36, 12, 10] },
    ]);
    layout.blocks.a!.hidden = true;
    layout.blocks.b!.responsive = { tablet: { hidden: true } };
    layout.blocks.c!.responsive = { mobile: { behavior: "hide" } };
    layout.blocks.d!.responsive = { mobile: { behavior: "stack" } };
    const { tablet, mobile } = deriveResponsive(layout);
    expect(tablet.order).toEqual(["c", "d"]);
    expect(tablet.blocks.a).toEqual({ rect: null, behavior: "stack", hidden: true });
    expect(tablet.blocks.b!.hidden).toBe(true);
    expect(mobile.order).toEqual(["b", "d"]);
    expect(mobile.blocks.c).toEqual({ rect: null, behavior: "hide", hidden: true });
    expect(mobile.blocks.d).toEqual({ rect: { col: 0, row: 12, w: 4, h: 10 }, behavior: "stack", hidden: false });
    // b keeps the gap after the last visible block before it.
    expect(mobile.blocks.b!.rect).toEqual({ col: 0, row: 0, w: 4, h: 10 });
  });

  test("tab bars go after the flow", () => {
    const layout = makeLayout([
      { id: "side", type: "sidebar", rect: [0, 0, 3, 80] },
      { id: "main", type: "table", rect: [3, 0, 9, 80] },
    ]);
    layout.blocks.side!.responsive = { mobile: { behavior: "tabbar" } };
    const { mobile } = deriveResponsive(layout);
    expect(mobile.order).toEqual(["main", "side"]);
    expect(mobile.blocks.side!.rect).toEqual({ col: 0, row: 80, w: 4, h: 8 });
  });

  test("an unknown behavior override falls back to the library default", () => {
    const layout = makeLayout([{ id: "t", type: "table", rect: [0, 0, 12, 40] }]);
    (layout.blocks.t as { responsive: unknown }).responsive = { mobile: { behavior: "explode" } };
    expect(deriveResponsive(layout).mobile.blocks.t!.behavior).toBe("card-list");
  });

  test("a lone narrow root block is scaled on tablet and full width on mobile", () => {
    const { tablet, mobile } = deriveResponsive(fixture("single").layout);
    expect(tablet.blocks.intro!.rect).toEqual({ col: 2, row: 0, w: 4, h: 20 });
    expect(mobile.blocks.intro!.rect).toEqual({ col: 0, row: 0, w: 4, h: 20 });
  });

  test("empty layout", () => {
    const { tablet, mobile } = deriveResponsive(fixture("empty").layout);
    expect(tablet).toEqual({ breakpoint: "tablet", columns: 8, blocks: {}, nodes: {}, order: [] });
    expect(mobile.columns).toBe(4);
  });
});

describe("review regressions", () => {
  test("a tab bar inside an overlay is placed (inline, in the sheet), never lost", () => {
    const layout = makeLayout([
      { id: "table", type: "table", rect: [0, 0, 12, 60] },
      { id: "dialog", type: "modal", rect: [3, 10, 6, 30] },
      { id: "nav", type: "sidebar", rect: [3, 10, 2, 30], parent: "dialog" },
    ]);
    layout.blocks.nav!.responsive = { mobile: { behavior: "tabbar" } };
    const { mobile } = deriveResponsive(layout);
    expect(mobile.order).toEqual(["table", "dialog", "nav"]);
    expect(mobile.blocks.nav).toEqual({ rect: { col: 0, row: 10, w: 4, h: 8 }, behavior: "tabbar", hidden: false });
  });

  test("a tab bar inside a deferred tab bar is placed too", () => {
    const layout = makeLayout([
      { id: "main", type: "table", rect: [3, 0, 9, 80] },
      { id: "side", type: "container", rect: [0, 0, 3, 80] },
      { id: "inner", type: "sidebar", rect: [0, 0, 3, 40], parent: "side" },
    ]);
    layout.blocks.side!.responsive = { mobile: { behavior: "tabbar" } };
    layout.blocks.inner!.responsive = { mobile: { behavior: "tabbar" } };
    const { mobile } = deriveResponsive(layout);
    for (const id of ["main", "side", "inner"]) expect(mobile.blocks[id]!.rect).not.toBeNull();
    expect(mobile.order).toEqual(["main", "side", "inner"]);
  });

  test("the note's count is clamped like the chip; «once» (en) and «una» are not counts", () => {
    const kpis = (note: string) => makeLayout([{ id: "k", type: "kpis", rect: [0, 0, 12, 14], note }]);
    // KPIs: repeatable 1–6, default 4, grid-2x2 on mobile → 14 rows per line of two.
    expect(deriveResponsive(kpis("12 métricas")).mobile.blocks.k!.rect!.h).toBe(14 * 3);
    expect(deriveResponsive(kpis("updated once a day")).mobile.blocks.k!.rect!.h).toBe(14 * 2);
    expect(deriveResponsive(kpis("una por región")).mobile.blocks.k!.rect!.h).toBe(14 * 2);
    const block: LayoutBlock = { type: "kpis", label: "", rect: { col: 0, row: 0, w: 12, h: 14 }, z: 0, count: 40 };
    expect(effectiveCount({ block, def: getBlockDef("kpis") })).toBe(6);
    expect(effectiveCount({ block: { ...block, type: "text", count: 500 }, def: getBlockDef("text") })).toBe(99);
  });
});
