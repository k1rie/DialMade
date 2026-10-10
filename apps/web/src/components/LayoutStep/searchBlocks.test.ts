import { LIBRARY, type LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout } from "@/i18n/layout";
import { MAX_QUERY_LENGTH, normalizeSearchText, searchBlocks, type BlockSearchDict } from "./searchBlocks";

const BOTH = [layout.es.blocks, layout.en.blocks] as const;
const ES = layout.es.blocks;
const EN = layout.en.blocks;

const first = (query: string, dict: BlockSearchDict | readonly BlockSearchDict[] = BOTH) => searchBlocks(query, dict)[0];
const isSoon = (type: LibraryBlockType) => LIBRARY.find((def) => def.type === type)?.status === "soon";

/** Hand-made dictionary to pin the ranking rules without depending on the real copy. */
function fakeDict(entries: Partial<Record<LibraryBlockType, { name: string; synonyms?: string[] }>>): BlockSearchDict {
  const dict = {} as Record<LibraryBlockType, { name: string; synonyms: readonly string[] }>;
  for (const def of LIBRARY) {
    const entry = entries[def.type];
    dict[def.type] = { name: entry?.name ?? "", synonyms: entry?.synonyms ?? [] };
  }
  return dict;
}

describe("normalizeSearchText", () => {
  it("drops case, accents and the tilde of ñ", () => {
    expect(normalizeSearchText("Menú Lateral")).toBe("menu lateral");
    expect(normalizeSearchText("PESTAÑAS")).toBe("pestanas");
    expect(normalizeSearchText("Gráfica")).toBe("grafica");
  });

  it("collapses punctuation and spaces, keeps &", () => {
    expect(normalizeSearchText("  pop-up   window ")).toBe("pop up window");
    expect(normalizeSearchText("Q&A")).toBe("q&a");
    expect(normalizeSearchText("«to-do»")).toBe("to do");
    expect(normalizeSearchText(" \t ")).toBe("");
  });
});

describe("searchBlocks · cross-locale", () => {
  it("finds the calendar with «agenda» and the navbar with «header» in both locales' dictionaries", () => {
    expect(first("agenda")).toBe("calendar");
    expect(first("header")).toBe("navbar");
  });

  it("works whatever the UI language when only one dictionary is passed (synonyms mix both languages)", () => {
    expect(first("agenda", EN)).toBe("calendar");
    expect(first("header", ES)).toBe("navbar");
    expect(first("calendar", ES)).toBe("calendar");
    expect(first("calendario", EN)).toBe("calendar");
  });

  it("matches the names of both locales", () => {
    expect(first("Barra lateral")).toBe("sidebar");
    expect(first("Sidebar")).toBe("sidebar");
    expect(first("Pie de página")).toBe("footer");
    expect(first("Footer")).toBe("footer");
  });

  it("finds every block by its own name in each locale", () => {
    for (const dict of BOTH) {
      for (const def of LIBRARY) {
        expect(first(dict[def.type].name), `${def.type} by «${dict[def.type].name}»`).toBe(def.type);
      }
    }
  });
});

describe("searchBlocks · normalization", () => {
  it("is case- and accent-insensitive", () => {
    expect(first("CALENDARIO")).toBe("calendar");
    expect(first("grafica")).toBe("chart");
    expect(first("GRÁFICA")).toBe("chart");
    expect(first("pestanas")).toBe("tabs");
    expect(first("navegacion")).toBe("navbar");
  });

  it("ignores surrounding spaces and punctuation differences", () => {
    expect(first("  tabla  ")).toBe("table");
    expect(first("popup")).toBe("modal");
    expect(first("pop up")).toBe("modal");
    expect(first("todo")).toBe("list");
  });

  it("returns nothing for a blank or punctuation-only query", () => {
    expect(searchBlocks("", BOTH)).toEqual([]);
    expect(searchBlocks("   ", BOTH)).toEqual([]);
    expect(searchBlocks("—", BOTH)).toEqual([]);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchBlocks("xyzzy", BOTH)).toEqual([]);
  });

  it("reads at most MAX_QUERY_LENGTH characters", () => {
    expect(searchBlocks("a".repeat(MAX_QUERY_LENGTH * 10), BOTH)).toEqual([]);
    expect(first(`calendario${" ".repeat(MAX_QUERY_LENGTH)}zzz`)).toBe("calendar");
  });
});

describe("searchBlocks · ranking", () => {
  it("exact name > name prefix > synonym prefix > substring", () => {
    const dict = fakeDict({
      hero: { name: "x", synonyms: ["xabc"] }, // substring, mid-word (in a synonym)
      cta: { name: "foo abc" }, // substring, word start (in a name)
      chart: { name: "y", synonyms: ["abcd"] }, // synonym prefix
      table: { name: "abcdef" }, // name prefix
      text: { name: "ABC" }, // exact name
    });
    expect(searchBlocks("abc", dict)).toEqual(["text", "table", "chart", "cta", "hero"]);
  });

  it("orders tiers strictly, regardless of display order", () => {
    const dict = fakeDict({
      navbar: { name: "zz", synonyms: ["the calendar"] }, // substring
      sidebar: { name: "zz", synonyms: ["calendars"] }, // synonym prefix
      footer: { name: "calendar view" }, // name prefix
      hero: { name: "Calendar" }, // exact name
    });
    expect(searchBlocks("calendar", dict)).toEqual(["hero", "footer", "sidebar", "navbar"]);
  });

  it("puts ready blocks before soon ones inside the same tier", () => {
    // `tabs` (soon) comes first in display order; `table` (ready) still wins the tie.
    const dict = fakeDict({ tabs: { name: "Grid A" }, table: { name: "Grid B" } });
    expect(isSoon("tabs")).toBe(true);
    expect(isSoon("table")).toBe(false);
    expect(searchBlocks("grid", dict, { types: ["tabs", "table"] })).toEqual(["table", "tabs"]);
  });

  it("keeps a better tier above status: an exact name of a soon block beats a ready synonym", () => {
    // «Video» is the name of `video` (soon) and a synonym of `media` (ready).
    expect(searchBlocks("video", BOTH).slice(0, 2)).toEqual(["video", "media"]);
    // «Mapa» is the name of `map` (soon) and a substring of footer's «mapa del sitio».
    expect(first("mapa")).toBe("map");
  });

  it("inside the synonym tier, an exact synonym beats a longer prefix", () => {
    const dict = fakeDict({ navbar: { name: "a", synonyms: ["navigation bar"] }, sidebar: { name: "b", synonyms: ["navigation"] } });
    expect(searchBlocks("navigation", dict)).toEqual(["sidebar", "navbar"]);
  });

  it("inside the substring tier, a word start beats a mid-word match", () => {
    const dict = fakeDict({ navbar: { name: "superbar" }, sidebar: { name: "top bar" } });
    expect(searchBlocks("bar", dict)).toEqual(["sidebar", "navbar"]);
  });

  it("falls back to display order on a full tie", () => {
    const dict = fakeDict({ hero: { name: "same" }, cta: { name: "same" } });
    expect(searchBlocks("same", dict, { types: ["cta", "hero"] })).toEqual(["cta", "hero"]);
    expect(searchBlocks("same", dict, { types: ["hero", "cta"] })).toEqual(["hero", "cta"]);
  });

  it("ranks real queries sensibly", () => {
    expect(searchBlocks("tab", BOTH).slice(0, 2)).toEqual(["table", "tabs"]);
    expect(first("alert")).toBe("modal");
    expect(searchBlocks("alert", BOTH)).toContain("notifications");
    expect(first("precio")).toBe("pricing");
    expect(first("login")).toBe("form");
    expect(first("kpi")).toBe("kpis");
  });

  it("matches multi-word queries word by word when no term holds the whole query", () => {
    expect(searchBlocks("lateral nav", BOTH)).toContain("sidebar");
    expect(first("lateral nav")).toBe("sidebar");
    expect(searchBlocks("lateral xyzzy", BOTH)).toEqual([]);
  });
});

describe("searchBlocks · options", () => {
  it("only returns candidates from `types`", () => {
    expect(searchBlocks("barra", BOTH, { types: ["sidebar"] })).toEqual(["sidebar"]);
    expect(searchBlocks("agenda", BOTH, { types: ["navbar", "hero"] })).toEqual([]);
  });

  it("ignores duplicated candidates", () => {
    expect(searchBlocks("calendario", BOTH, { types: ["calendar", "calendar"] })).toEqual(["calendar"]);
  });

  it("honors `limit`", () => {
    const all = searchBlocks("a", BOTH);
    expect(all.length).toBeGreaterThan(3);
    expect(searchBlocks("a", BOTH, { limit: 3 })).toEqual(all.slice(0, 3));
    expect(searchBlocks("a", BOTH, { limit: 0 })).toEqual([]);
  });

  it("returns each type once and only library types", () => {
    const result = searchBlocks("a", BOTH);
    expect(new Set(result).size).toBe(result.length);
    const known = new Set(LIBRARY.map((def) => def.type));
    expect(result.every((type) => known.has(type))).toBe(true);
  });

  it("gives the same result for one dictionary or the same dictionary twice", () => {
    expect(searchBlocks("menu", [ES, ES])).toEqual(searchBlocks("menu", ES));
  });

  it("is deterministic across calls (cached index)", () => {
    expect(searchBlocks("chat", BOTH)).toEqual(searchBlocks("chat", BOTH));
  });
});
