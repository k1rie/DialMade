import { describe, expect, test } from "vitest";
import { acceptsChild, BLOCK_CATEGORIES, blockDefOrFree, blocksInCategory, getBlockDef, isLibraryBlockType, LIBRARY } from "./library";
import type { LibraryBlockType, ReadyBlockType, SoonBlockType } from "./types";

const READY: readonly ReadyBlockType[] = [
  "navbar", "sidebar", "footer", "hero", "features", "logos", "testimonials", "pricing", "cta", "kpis", "chart",
  "table", "activity", "settings", "modal", "empty", "text", "media", "cards", "calendar", "list", "form", "free",
  "container",
];
const SOON: readonly SoonBlockType[] = [
  "tabs", "stepper", "pagination", "faq", "banner", "timeline", "kanban", "search", "upload", "notifications",
  "gallery", "chat", "profile", "map", "cart", "checkout", "video",
];

describe("LIBRARY", () => {
  test("one entry per type, nothing else", () => {
    const types = LIBRARY.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    expect([...types].sort()).toEqual([...READY, ...SOON].sort());
    for (const type of READY) expect(getBlockDef(type).status).toBe("ready");
    for (const type of SOON) expect(getBlockDef(type).status).toBe("soon");
  });

  test("display order: categories in order, ready before soon inside each", () => {
    const rank = (d: (typeof LIBRARY)[number]) => BLOCK_CATEGORIES.indexOf(d.category) * 2 + (d.status === "soon" ? 1 : 0);
    const ranks = LIBRARY.map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(BLOCK_CATEGORIES).toEqual(["basics", "navigation", "content", "data", "forms", "overlays", "commerce"]);
    expect(blocksInCategory("basics").map((d) => d.type)).toEqual(["free", "container"]);
  });

  test("defs are coherent", () => {
    for (const def of LIBRARY) {
      expect(def.icon).toBe(def.type);
      expect(def.mobileOptions[0]).toBe(def.mobile);
      expect(def.mobileOptions).toContain("hide");
      expect(def.defaultSize.w).toBeGreaterThanOrEqual(def.minCols.desktop);
      expect(def.defaultSize.w).toBeLessThanOrEqual(12);
      expect(def.minCols.tablet).toBeLessThanOrEqual(8);
      expect(def.minCols.mobile).toBe(4);
      if (def.repeatable) {
        expect(def.repeatable.min).toBeLessThanOrEqual(def.repeatable.default);
        expect(def.repeatable.default).toBeLessThanOrEqual(def.repeatable.max);
      }
      if (def.status === "soon") {
        expect(def.sectionType).toBe("ui.placeholder");
        expect(def.container || def.overlay || def.frame !== null).toBe(false);
      }
      if (def.container) expect(def.accepts === "any" || def.accepts.length > 0).toBe(true);
    }
  });

  test("key facts from the spec", () => {
    expect(getBlockDef("navbar")).toMatchObject({ sectionType: "landing.navbar", frame: "topnav", mobile: "hamburger" });
    expect(getBlockDef("sidebar")).toMatchObject({ sectionType: "app.shell", frame: "sidebar", mobile: "drawer" });
    expect(getBlockDef("modal")).toMatchObject({ overlay: true, container: true, mobile: "sheet" });
    expect(getBlockDef("container")).toMatchObject({ sectionType: "ui.region", container: true, accepts: "any" });
    expect(getBlockDef("kpis")).toMatchObject({ mobile: "grid-2x2", repeatable: { min: 1, max: 6, default: 4 } });
    expect(getBlockDef("table").mobile).toBe("card-list");
    expect(getBlockDef("calendar").mobile).toBe("agenda");
    expect(getBlockDef("hero")).toMatchObject({ mobile: "text-first", accepts: ["media", "text", "form"] });
    expect(getBlockDef("free").defaultSize).toEqual({ w: 4, h: 20 });
  });

  test("guards", () => {
    expect(isLibraryBlockType("hero")).toBe(true);
    expect(isLibraryBlockType("banana")).toBe(false);
    expect(isLibraryBlockType(3)).toBe(false);
    expect(() => getBlockDef("banana" as LibraryBlockType)).toThrow(/Unknown/);
    expect(blockDefOrFree("banana").type).toBe("free");
    expect(acceptsChild("hero", "media")).toBe(true);
    expect(acceptsChild("hero", "table")).toBe(false);
    expect(acceptsChild("container", "table")).toBe(true);
    expect(acceptsChild("modal", "kpis")).toBe(true);
  });
});
