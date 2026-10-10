import type { LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { moveActive, RESULT_LIMIT, SUGGESTION_COUNT, whatIsThisOptions } from "./options";

const none = () => [] as LibraryBlockType[];

describe("whatIsThisOptions", () => {
  it("shows the shape suggestions while the search is blank", () => {
    const suggestions: LibraryBlockType[] = ["navbar", "hero", "cards", "text", "media"];
    expect(whatIsThisOptions({ query: "  ", suggestions, search: none, kind: "landing" })).toEqual({ mode: "suggestions", types: suggestions });
  });

  it("shows the search results once something is typed", () => {
    const search = (query: string): LibraryBlockType[] => (query === "agenda" ? ["calendar", "list"] : []);
    expect(whatIsThisOptions({ query: "agenda", suggestions: ["hero"], search, kind: "app" })).toEqual({ mode: "results", types: ["calendar", "list"] });
    expect(whatIsThisOptions({ query: "zzz", suggestions: ["hero"], search, kind: "app" })).toEqual({ mode: "results", types: [] });
  });

  it("never offers «Bloque libre», nor a sidebar on a landing screen", () => {
    const search = (): LibraryBlockType[] => ["free", "sidebar", "navbar"];
    expect(whatIsThisOptions({ query: "x", suggestions: [], search, kind: "landing" }).types).toEqual(["navbar"]);
    expect(whatIsThisOptions({ query: "x", suggestions: [], search, kind: "app" }).types).toEqual(["sidebar", "navbar"]);
    expect(whatIsThisOptions({ query: "", suggestions: ["free", "hero"], search, kind: "landing" }).types).toEqual(["hero"]);
  });

  it("caps and de-duplicates both lists", () => {
    const many: LibraryBlockType[] = ["hero", "hero", "cards", "text", "media", "form", "list", "table", "chart", "kpis", "calendar"];
    expect(whatIsThisOptions({ query: "", suggestions: many, search: none, kind: "app" }).types).toHaveLength(SUGGESTION_COUNT);
    const results = whatIsThisOptions({ query: "a", suggestions: [], search: () => many, kind: "app" }).types;
    expect(results).toHaveLength(RESULT_LIMIT);
    expect(new Set(results).size).toBe(results.length);
  });
});

describe("moveActive", () => {
  it("wraps around in both directions", () => {
    expect(moveActive(0, 1, 3)).toBe(1);
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
  });

  it("starts at the first or last option when nothing is highlighted", () => {
    expect(moveActive(-1, 1, 4)).toBe(0);
    expect(moveActive(-1, -1, 4)).toBe(3);
  });

  it("returns -1 for an empty list", () => {
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});
