import { BLOCK_CATEGORIES, emptyLayout, insertBlock, LIBRARY, type LayoutDoc } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import {
  columnsFromTops,
  DEFAULT_OPEN_CATEGORIES,
  gridNeighbor,
  insertParentFor,
  isGridKey,
  isSoon,
  LIBRARY_CATEGORIES,
  tileModeFor,
} from "./libraryModel";

/** container (c1) > text (t1); hero (h1) > media (m1); a root cta (x1); a modal (o1). */
function fixture(): LayoutDoc {
  let layout = emptyLayout();
  layout = insertBlock(layout, { type: "container", label: "Grupo", id: "c1", rect: { col: 0, row: 0, w: 12, h: 40 } }).layout;
  layout = insertBlock(layout, { type: "text", label: "Texto", id: "t1", parentId: "c1" }).layout;
  layout = insertBlock(layout, { type: "hero", label: "Hero", id: "h1", rect: { col: 0, row: 50, w: 12, h: 40 } }).layout;
  layout = insertBlock(layout, { type: "media", label: "Media", id: "m1", parentId: "h1" }).layout;
  layout = insertBlock(layout, { type: "cta", label: "CTA", id: "x1", rect: { col: 0, row: 100, w: 12, h: 20 } }).layout;
  layout = insertBlock(layout, { type: "modal", label: "Modal", id: "o1", rect: { col: 3, row: 10, w: 6, h: 20 } }).layout;
  return layout;
}

describe("tileModeFor", () => {
  it("inserts plain blocks on every screen kind", () => {
    expect(tileModeFor("calendar", "landing")).toBe("block");
    expect(tileModeFor("calendar", "app")).toBe("block");
    expect(tileModeFor("footer", "app")).toBe("block");
  });

  it("turns navbar and sidebar into the navigation frame on app screens", () => {
    expect(tileModeFor("navbar", "app")).toBe("frame");
    expect(tileModeFor("sidebar", "app")).toBe("frame");
  });

  it("keeps the navbar as a block on landings and disables the sidebar there", () => {
    expect(tileModeFor("navbar", "landing")).toBe("block");
    expect(tileModeFor("sidebar", "landing")).toBe("appOnly");
  });

  it("only ever disables frame blocks", () => {
    for (const def of LIBRARY) {
      for (const kind of ["landing", "app"] as const) {
        if (tileModeFor(def.type, kind) !== "block") expect(def.frame, def.type).not.toBeNull();
      }
    }
  });
});

describe("insertParentFor", () => {
  const layout = fixture();

  it("is undefined without a selection", () => {
    expect(insertParentFor(layout, null, "text")).toBeUndefined();
  });

  it("uses the selected container", () => {
    expect(insertParentFor(layout, "c1", "calendar")).toBe("c1");
  });

  it("uses the selected block's container, so consecutive inserts keep filling it", () => {
    expect(insertParentFor(layout, "t1", "calendar")).toBe("c1");
  });

  it("ignores non-container parents and root blocks", () => {
    expect(insertParentFor(layout, "h1", "text")).toBeUndefined();
    expect(insertParentFor(layout, "m1", "text")).toBeUndefined();
    expect(insertParentFor(layout, "x1", "text")).toBeUndefined();
  });

  it("never nests overlays", () => {
    expect(insertParentFor(layout, "c1", "modal")).toBeUndefined();
  });

  it("accepts a modal (container) as the parent of a form", () => {
    expect(insertParentFor(layout, "o1", "form")).toBe("o1");
  });

  it("is undefined for a selection that is not in the layout", () => {
    expect(insertParentFor(layout, "nope", "text")).toBeUndefined();
  });
});

describe("LIBRARY_CATEGORIES", () => {
  it("follows BLOCK_CATEGORIES and holds every block once, in library order", () => {
    expect(LIBRARY_CATEGORIES.map((group) => group.category)).toEqual([...BLOCK_CATEGORIES]);
    const flat = LIBRARY_CATEGORIES.flatMap((group) => group.types);
    expect(new Set(flat).size).toBe(LIBRARY.length);
    for (const group of LIBRARY_CATEGORIES) {
      const order = group.types.map((type) => LIBRARY.findIndex((def) => def.type === type));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("puts «Bloque libre» and «Contenedor» first, in basics", () => {
    expect(LIBRARY_CATEGORIES[0]).toEqual({ category: "basics", types: ["free", "container"] });
  });

  it("opens the first two categories", () => {
    expect(DEFAULT_OPEN_CATEGORIES).toEqual(BLOCK_CATEGORIES.slice(0, 2));
  });
});

describe("isSoon", () => {
  it("reads the library status", () => {
    expect(isSoon("kanban")).toBe(true);
    expect(isSoon("calendar")).toBe(false);
  });
});

describe("gridNeighbor", () => {
  // 3 columns, 7 tiles:  0 1 2 / 3 4 5 / 6
  it("walks the reading order with Left/Right and wraps rows", () => {
    expect(gridNeighbor(0, 7, 3, "ArrowRight")).toBe(1);
    expect(gridNeighbor(2, 7, 3, "ArrowRight")).toBe(3);
    expect(gridNeighbor(3, 7, 3, "ArrowLeft")).toBe(2);
  });

  it("keeps the column with Up/Down", () => {
    expect(gridNeighbor(1, 7, 3, "ArrowDown")).toBe(4);
    expect(gridNeighbor(4, 7, 3, "ArrowUp")).toBe(1);
    expect(gridNeighbor(3, 7, 3, "ArrowDown")).toBe(6);
  });

  it("returns null when the move leaves the grid", () => {
    expect(gridNeighbor(0, 7, 3, "ArrowLeft")).toBeNull();
    expect(gridNeighbor(6, 7, 3, "ArrowRight")).toBeNull();
    expect(gridNeighbor(1, 7, 3, "ArrowUp")).toBeNull();
    expect(gridNeighbor(4, 7, 3, "ArrowDown")).toBeNull(); // nothing under 4 in the last row
  });

  it("goes to the ends with Home/End, and null when already there", () => {
    expect(gridNeighbor(4, 7, 3, "Home")).toBe(0);
    expect(gridNeighbor(4, 7, 3, "End")).toBe(6);
    expect(gridNeighbor(0, 7, 3, "Home")).toBeNull();
    expect(gridNeighbor(6, 7, 3, "End")).toBeNull();
  });

  it("mirrors Left/Right in RTL", () => {
    expect(gridNeighbor(1, 7, 3, "ArrowLeft", true)).toBe(2);
    expect(gridNeighbor(1, 7, 3, "ArrowRight", true)).toBe(0);
  });

  it("handles degenerate input", () => {
    expect(gridNeighbor(0, 0, 3, "ArrowRight")).toBeNull();
    expect(gridNeighbor(9, 3, 3, "ArrowLeft")).toBeNull();
    expect(gridNeighbor(0, 3, 0, "ArrowDown")).toBe(1); // columns < 1 behaves as one column
  });
});

describe("columnsFromTops", () => {
  it("counts the tiles on the first row", () => {
    expect(columnsFromTops([0, 0, 0, 80, 80, 80, 160])).toBe(3);
    expect(columnsFromTops([0, 0.5, 80])).toBe(2); // sub-pixel differences are the same row
    expect(columnsFromTops([0, 80, 160])).toBe(1);
    expect(columnsFromTops([])).toBe(1);
  });
});

describe("isGridKey", () => {
  it("accepts arrows, Home and End only", () => {
    expect(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].every(isGridKey)).toBe(true);
    expect(isGridKey("Enter")).toBe(false);
    expect(isGridKey(" ")).toBe(false);
    expect(isGridKey("Tab")).toBe(false);
  });
});
