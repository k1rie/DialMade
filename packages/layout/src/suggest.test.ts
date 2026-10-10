import { describe, expect, test } from "vitest";
import { getBlockDef } from "./library";
import { suggestBlocks, suggestTypesForShape } from "./suggest";
import { emptyLayout } from "./edit";
import { makeLayout } from "./testing/fixtures";
import type { GridRect, LayoutDoc, LibraryBlockType, ScreenKind } from "./types";

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });
const withTypes = (...types: LibraryBlockType[]): LayoutDoc =>
  makeLayout(types.map((type, i) => ({ id: `x${i}`, type, rect: [0, i * 10, 12, 10] as [number, number, number, number] })));

function checkShape(list: LibraryBlockType[], kind: ScreenKind) {
  expect(list).toHaveLength(5);
  expect(new Set(list).size).toBe(5);
  for (const type of list) {
    const def = getBlockDef(type);
    expect(def.status).toBe("ready");
    expect(type).not.toBe("free");
    if (type === "sidebar") expect(kind).toBe("app");
  }
}

describe("suggestBlocks", () => {
  test("empty landing", () => {
    expect(suggestBlocks(emptyLayout(), "landing")).toEqual(["navbar", "hero", "features", "cta", "footer"]);
  });

  test("landing with a navbar: the next missing ones", () => {
    expect(suggestBlocks(withTypes("navbar"), "landing")).toEqual(["hero", "features", "logos", "testimonials", "pricing"]);
    expect(suggestBlocks(withTypes("navbar", "hero", "features", "logos", "testimonials", "pricing"), "landing")).toEqual([
      "cta",
      "footer",
      "cards",
      "text",
      "media",
    ]);
  });

  test("full landing still gives five", () => {
    const full = withTypes("navbar", "hero", "features", "logos", "testimonials", "pricing", "cta", "footer");
    const list = suggestBlocks(full, "landing");
    expect(list.slice(0, 4)).toEqual(["cards", "text", "media", "form"]);
    expect(list).toHaveLength(5);
    expect(list[4]).toBe("container");
  });

  test("app: data blocks first, never frames or soon blocks", () => {
    expect(suggestBlocks(emptyLayout(), "app")).toEqual(["kpis", "chart", "table", "activity", "cards"]);
    const list = suggestBlocks(withTypes("kpis", "chart", "table", "activity", "cards", "list", "calendar", "form", "settings", "empty"), "app");
    expect(list.slice(0, 3)).toEqual(["text", "media", "container"]);
    for (const type of list) {
      expect(getBlockDef(type).frame).toBeNull();
      expect(getBlockDef(type).status).toBe("ready");
    }
    expect(list).toHaveLength(5);
  });
});

describe("suggestTypesForShape", () => {
  test("a strip at the top is a navbar", () => {
    const list = suggestTypesForShape(rect(0, 0, 12, 8), emptyLayout(), "landing");
    expect(list[0]).toBe("navbar");
    checkShape(list, "landing");
    expect(suggestTypesForShape(rect(0, 0, 12, 8), emptyLayout(), "app")[0]).toBe("navbar");
  });

  test("a tall box on an edge is a sidebar on app screens only", () => {
    expect(suggestTypesForShape(rect(0, 0, 3, 80), emptyLayout(), "app")[0]).toBe("sidebar");
    expect(suggestTypesForShape(rect(10, 0, 2, 50), emptyLayout(), "app")[0]).toBe("sidebar");
    const landing = suggestTypesForShape(rect(0, 0, 3, 80), emptyLayout(), "landing");
    expect(landing).not.toContain("sidebar");
    expect(landing.slice(0, 2)).toEqual(["list", "activity"]);
    checkShape(landing, "landing");
  });

  test("a big box near the top is a hero (first on landing, later on app)", () => {
    const landing = suggestTypesForShape(rect(0, 8, 12, 50), emptyLayout(), "landing");
    expect(landing[0]).toBe("hero");
    expect(landing).toContain("features");
    const app = suggestTypesForShape(rect(0, 8, 12, 50), emptyLayout(), "app");
    expect(app.slice(0, 3)).toEqual(["table", "calendar", "hero"]);
    checkShape(app, "app");
  });

  test("a wide box at the end is a footer", () => {
    const layout = makeLayout([
      { id: "nav", type: "navbar", rect: [0, 0, 12, 8] },
      { id: "hero", type: "hero", rect: [0, 8, 12, 60] },
    ]);
    const list = suggestTypesForShape(rect(0, 70, 12, 20), layout, "landing");
    expect(list[0]).toBe("footer");
    // The drawn block itself (same rect, or its id) is not «another block».
    const drawn = makeLayout([
      { id: "hero", type: "hero", rect: [0, 8, 12, 60] },
      { id: "new", type: "free", rect: [0, 70, 12, 20] },
    ]);
    expect(suggestTypesForShape(rect(0, 70, 12, 20), drawn, "landing")[0]).toBe("footer");
    expect(suggestTypesForShape(rect(0, 70, 12, 20), drawn, "landing", { id: "new" })[0]).toBe("footer");
    expect(suggestTypesForShape(rect(0, 70, 12, 20), emptyLayout(), "landing")).not.toContain("footer");
  });

  test("wide and low: KPIs on app, logos and CTA on landing", () => {
    expect(suggestTypesForShape(rect(0, 30, 12, 14), emptyLayout(), "app")[0]).toBe("kpis");
    expect(suggestTypesForShape(rect(0, 30, 12, 14), emptyLayout(), "landing").slice(0, 2)).toEqual(["logos", "cta"]);
  });

  test("medium boxes and the fill", () => {
    const app = suggestTypesForShape(rect(2, 30, 6, 24), emptyLayout(), "app");
    expect(app).toEqual(["cards", "chart", "text", "media", "form"]);
    const landing = suggestTypesForShape(rect(2, 30, 6, 24), emptyLayout(), "landing");
    expect(landing).toEqual(["cards", "text", "media", "form", "list"]);
  });

  test("always five unique ready types for any shape", () => {
    for (const kind of ["landing", "app"] as const) {
      for (let w = 1; w <= 12; w += 1) {
        for (const h of [1, 6, 10, 16, 30, 40, 80]) {
          for (const row of [0, 2, 12, 40]) checkShape(suggestTypesForShape(rect(0, row, w, h), emptyLayout(), kind), kind);
        }
      }
    }
  });
});
