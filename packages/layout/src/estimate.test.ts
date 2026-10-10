import { describe, expect, test } from "vitest";
import { estimateContent } from "./estimate";
import { makeLayout } from "./testing/fixtures";
import type { LayoutBlock, LibraryBlockType } from "./types";

const block = (type: LibraryBlockType, w: number, h: number, extra: Partial<LayoutBlock> = {}): LayoutBlock => ({
  type,
  label: type,
  rect: { col: 0, row: 0, w, h },
  z: 1,
  ...extra,
});

describe("estimateContent", () => {
  test("table rows from height", () => {
    expect(estimateContent(block("table", 12, 50))).toEqual({ kind: "count", unit: "rows", value: 5 });
    expect(estimateContent(block("table", 12, 10))).toEqual({ kind: "count", unit: "rows", value: 3 });
    expect(estimateContent(block("table", 12, 200))).toEqual({ kind: "count", unit: "rows", value: 10 });
  });

  test("repeatables: count, then the note, then the default (capped)", () => {
    expect(estimateContent(block("kpis", 12, 14))).toEqual({ kind: "count", unit: "items", value: 4 });
    expect(estimateContent(block("kpis", 12, 14, { count: 3 }))).toEqual({ kind: "count", unit: "items", value: 3 });
    expect(estimateContent(block("cards", 12, 30, { note: "cinco tarjetas" }))).toEqual({ kind: "count", unit: "items", value: 5 });
    expect(estimateContent(block("cards", 12, 30, { count: 2, note: "5" }))?.value).toBe(2);
    expect(estimateContent(block("pricing", 12, 60, { note: "9 planes" }))).toEqual({ kind: "count", unit: "plans", value: 4 });
    expect(estimateContent(block("logos", 12, 12))).toEqual({ kind: "count", unit: "logos", value: 6 });
    expect(estimateContent(block("features", 12, 40))).toEqual({ kind: "count", unit: "items", value: 3 });
    expect(estimateContent(block("testimonials", 12, 40, { count: 1 }))?.value).toBe(1);
    expect(estimateContent(block("faq", 8, 40))).toEqual({ kind: "count", unit: "items", value: 5 });
    expect(estimateContent(block("gallery", 12, 40, { count: 30 }))?.value).toBe(24);
  });

  test("lists and forms from height", () => {
    expect(estimateContent(block("activity", 4, 40))).toEqual({ kind: "count", unit: "items", value: 4 });
    expect(estimateContent(block("list", 4, 100))?.value).toBe(8);
    expect(estimateContent(block("list", 4, 5))?.value).toBe(3);
    expect(estimateContent(block("form", 6, 50))).toEqual({ kind: "count", unit: "fields", value: 4 });
    expect(estimateContent(block("form", 6, 10))?.value).toBe(2);
    expect(estimateContent(block("settings", 8, 50))).toEqual({ kind: "count", unit: "fields", value: 3 });
    expect(estimateContent(block("settings", 8, 200))?.value).toBe(8);
  });

  test("footer columns and navbar links from width", () => {
    expect(estimateContent(block("footer", 12, 25))).toEqual({ kind: "count", unit: "columns", value: 3 });
    expect(estimateContent(block("footer", 6, 25))?.value).toBe(1);
    expect(estimateContent(block("navbar", 12, 8))).toEqual({ kind: "count", unit: "links", value: 4 });
    expect(estimateContent(block("navbar", 7, 8))?.value).toBe(3);
    expect(estimateContent(block("navbar", 5, 8))).toBeNull();
  });

  test("calendar variant: keywords first, then size", () => {
    expect(estimateContent(block("calendar", 8, 60, { note: "calendario semanal" }))).toEqual({ kind: "variant", value: "week" });
    expect(estimateContent(block("calendar", 3, 60, { note: "mensual" }))?.value).toBe("month");
    expect(estimateContent(block("calendar", 8, 60, { note: "agenda" }))?.value).toBe("agenda");
    expect(estimateContent(block("calendar", 8, 60, { note: "vista diaria del día" }))?.value).toBe("agenda");
    expect(estimateContent(block("calendar", 3, 60))?.value).toBe("mini");
    expect(estimateContent(block("calendar", 8, 60))?.value).toBe("month");
    expect(estimateContent(block("calendar", 8, 40))?.value).toBe("week");
    expect(estimateContent(block("calendar", 5, 60))?.value).toBe("agenda");
  });

  test("chart and media from proportions", () => {
    expect(estimateContent(block("chart", 8, 40))).toEqual({ kind: "variant", value: "area" });
    expect(estimateContent(block("chart", 4, 40))?.value).toBe("bar");
    expect(estimateContent(block("media", 6, 40))).toEqual({ kind: "ratio", value: "21:9" });
    expect(estimateContent(block("media", 6, 90))?.value).toBe("1:1");
    expect(estimateContent(block("media", 3, 60))?.value).toBe("3:4");
    expect(estimateContent(block("media", 12, 101))?.value).toBe("16:9");
    expect(estimateContent(block("media", 12, 112))?.value).toBe("3:2");
  });

  test("hero: split with a media/form child, the split keyword or a narrow box", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "shot", type: "media", rect: [6, 4, 5, 40], parent: "hero" },
      { id: "plain", type: "hero", rect: [0, 70, 12, 60] },
    ]);
    expect(estimateContent(layout.blocks.hero!, layout)).toEqual({ kind: "variant", value: "split" });
    expect(estimateContent({ ...layout.blocks.hero! }, layout, "hero")?.value).toBe("split");
    expect(estimateContent(layout.blocks.plain!, layout)?.value).toBe("centered");
    expect(estimateContent(block("hero", 12, 60))?.value).toBe("centered");
    expect(estimateContent(block("hero", 12, 60, { note: "texto e imagen lado a lado" }))?.value).toBe("split");
    expect(estimateContent(block("hero", 8, 60))?.value).toBe("split");
  });

  test("nothing to say", () => {
    for (const type of ["cta", "text", "empty", "modal", "free", "container", "banner", "sidebar"] as const) {
      expect(estimateContent(block(type, 6, 30))).toBeNull();
    }
  });
});
