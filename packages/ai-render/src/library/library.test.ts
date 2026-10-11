// The reference library is code the model imitates: every entry must be a clean answer (nothing dropped, nothing
// fixed, no warning) under several palettes in light and dark, and must not carry anything that would leak into a
// user's page (brand names, raw colors, real-looking contacts).
import { compileThemeVars, createDesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { themeColorsFromVars } from "../contrast";
import { AI_AXES } from "@dialmade/doc";
import { processBlock } from "../pipeline";
import { referencesText, MAX_REFERENCE_CHARS, type RenderBrandInput, type RenderScreenInput } from "../prompt";
import { LIBRARY, fitScore, selectReferences } from "./index";

const themes = ["#0f766e", "#4f46e5", "#b4532a", "#be185d"].map((primary, i) => {
  const doc = createDesignDoc({
    brand: { name: "Eval", seeds: { primary } },
    brief: { productType: "saas-general", focus: "landing", locale: "en", recipeId: ["soft-ui", "tech-precision", "editorial", "playful"][i]! },
  });
  return { primary, light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
});

const axes = { composition: "editorial", typeVoice: "quiet", decoration: "rules-and-grids", imagery: "framed-screens", colorStrategy: "neutral-with-pops", rhythm: "airy" } as const;
const brand: RenderBrandInput = {
  name: "Brisa",
  productType: "saas-general: SaaS",
  palette: { hue: 180, chroma: "vivid", preferredMode: "light" },
  recipe: { id: "soft-ui", surface: "flat", shape: "rounded", density: "normal", mood: "" },
};
const screenOf = (kind: "landing" | "app", types: string[]): RenderScreenInput => ({
  id: "s-1",
  name: "Home",
  kind,
  route: "/",
  locale: "en",
  screens: [],
  blocks: types.map((type, i) => ({ id: `b-${i}`, type, label: type, cols: 12, heightPx: 400, draft: [] })),
});

describe("every library entry is a clean answer", () => {
  it("has unique ids and a root that is the entry's own block", () => {
    const ids = LIBRARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of LIBRARY) {
      expect(entry.html.match(/data-block-id=/g), entry.id).toHaveLength(1);
      expect(entry.html.length, entry.id).toBeLessThan(6_000);
      expect(entry.pattern.length, entry.id).toBeGreaterThan(40);
      // The gesture is a few words: the one move that must survive the adaptation, not a second pattern.
      expect(entry.gesture.length, entry.id).toBeGreaterThan(15);
      expect(entry.gesture.length, entry.id).toBeLessThan(100);
    }
  });

  for (const entry of LIBRARY) {
    it(`${entry.id}: nothing dropped, nothing fixed, no warnings, in 4 palettes × light and dark`, () => {
      for (const theme of themes) {
        const block = { id: "b-x", type: entry.type, label: entry.id, cols: 12, heightPx: 400, draft: [], ...(entry.type === "hero" && { h1: true as const }) };
        const html = entry.html.replace(/data-block-id="[^"]*"/, 'data-block-id="b-x"');
        const processed = processBlock(html, { block, screenIds: [], theme });
        if (!processed.ok) throw new Error(`${entry.id}: ${processed.failure}`);
        expect(processed.gates.dropped, `${entry.id} dropped (${theme.primary})`).toBe(0);
        expect(processed.gates.warnings.map((w) => `${w.code} ${w.detail ?? ""}`), `${entry.id} warnings (${theme.primary})`).toEqual([]);
        expect(processed.gates.contrast, `${entry.id} contrast (${theme.primary})`).toBe("ok");
      }
    });
  }

  it("carries no raw colors, brand names, real contacts or scripts", () => {
    const BRANDS = /\b(stripe|linear|vercel|notion|resend|mercury|raycast|figma|slack|github|google|apple|microsoft|amazon|airbnb|shopify|spotify|openai|anthropic)\b/i;
    for (const entry of LIBRARY) {
      const text = `${entry.id} ${entry.pattern} ${entry.html}`;
      expect(text, entry.id).not.toMatch(BRANDS);
      expect(entry.html, entry.id).not.toMatch(/(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b|rgb\(|hsl\(|oklch\(|style=|<script|\son\w+=|https?:\/\//i);
      expect(entry.html, entry.id).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    }
  });
});

describe("selecting references", () => {
  const landing = LIBRARY.filter((entry) => entry.surface === "landing");

  it("returns entries of the block's type and surface only", () => {
    for (const type of ["hero", "features", "pricing"]) {
      const picked = selectReferences(LIBRARY, type, "landing", axes, "b-1", { seed: 1 });
      expect(picked.length).toBeGreaterThan(0);
      expect(picked.every((entry) => entry.type === type && entry.surface === "landing")).toBe(true);
    }
    expect(selectReferences(LIBRARY, "table", "landing", axes, "b-1", { seed: 1 })).toEqual([]);
    expect(selectReferences(LIBRARY, "kpis", "app", axes, "b-1", { seed: 1 }).every((entry) => entry.surface === "app")).toBe(true);
    expect(selectReferences(LIBRARY, "unknown", "landing", axes, "b-1", { seed: 1 })).toEqual([]);
  });

  it("is deterministic, prefers the entries that fit the direction, and varies with the seed on ties", () => {
    const a = selectReferences(LIBRARY, "hero", "landing", axes, "b-1", { seed: 7 }).map((entry) => entry.id);
    expect(selectReferences(LIBRARY, "hero", "landing", axes, "b-1", { seed: 7 }).map((entry) => entry.id)).toEqual(a);
    const editorial = LIBRARY.find((entry) => entry.id === "hero-editorial-type")!;
    expect(fitScore(editorial, { ...axes, composition: "editorial", typeVoice: "bold-display", decoration: "rules-and-grids" })).toBeGreaterThan(fitScore(editorial, { ...axes, composition: "bento", typeVoice: "humanist", decoration: "soft-shapes" }));
    const top = selectReferences(LIBRARY, "hero", "landing", { ...axes, composition: "editorial", typeVoice: "bold-display", decoration: "rules-and-grids" }, "b-1", { seed: 3, count: 1 });
    expect(top[0]!.id).toBe("hero-editorial-type");
  });

  it("an approved entry outranks a draft of the same type when the direction fits about equally", () => {
    const draft = { ...LIBRARY.find((entry) => entry.id === "features-statement-two-tone")!, id: "draft-a" };
    const kept = { ...draft, id: "kept-a", approved: true as const };
    const picked = selectReferences([draft, kept], "features", "landing", axes, "b-1", { seed: 1, count: 1 });
    expect(picked[0]!.id).toBe("kept-a");
    // A clearly better fit still wins over an approved entry that does not fit at all.
    const misfit = { ...kept, id: "kept-misfit", fits: {} };
    const fit = { ...draft, id: "draft-fit", fits: { composition: [axes.composition], typeVoice: [axes.typeVoice], decoration: [axes.decoration] } };
    expect(selectReferences([misfit, fit], "features", "landing", axes, "b-1", { seed: 1, count: 1 })[0]!.id).toBe("draft-fit");
  });

  it("every axis value used by an entry exists", () => {
    for (const entry of LIBRARY) {
      for (const [axis, values] of Object.entries(entry.fits)) {
        for (const value of values as string[]) expect((AI_AXES as Record<string, readonly string[]>)[axis], `${entry.id}.${axis}`).toContain(value);
      }
    }
    expect(landing.length).toBeGreaterThan(10);
  });
});

describe("references in the prompt", () => {
  it("names the target block, skips containers and types without entries, and stays within the cap", () => {
    const screen = screenOf("landing", ["navbar", "hero", "features", "testimonials", "pricing", "cta", "footer", "container", "calendar"]);
    screen.blocks[7]!.container = true;
    const text = referencesText(brand, { axes, moves: [], rationale: "" }, screen);
    expect(text).toContain('<references for="b-1">');
    expect(text).toContain('data-block-id="b-1"');
    expect(text).not.toContain('for="b-7"');
    expect(text).not.toContain('for="b-8"');
    expect(text.length).toBeLessThan(MAX_REFERENCE_CHARS + 4_000);
    // The hand-written html is part of the prompt, with its line breaks gone.
    expect(text).not.toMatch(/\n\s{2,}</);
    // Every reference names the gesture the model has to keep.
    expect(text.match(/<reference /g)?.length).toBe(text.match(/<reference gesture="[^"]{15,}" pattern="/g)?.length);
  });

  it("depends on structured traits, not on the brand's free text", () => {
    const screen = screenOf("landing", ["hero", "features"]);
    const a = referencesText({ ...brand, name: "One", tagline: "a" }, { axes, moves: [], rationale: "x" }, screen);
    const b = referencesText({ ...brand, name: "Another", tagline: "b" }, { axes, moves: [], rationale: "y" }, screen);
    expect(a).toBe(b);
    const other = referencesText({ ...brand, palette: { ...brand.palette, hue: 20 } }, { axes, moves: [], rationale: "" }, screen);
    expect(other).toContain("<references");
  });

  it("an app screen gets app references", () => {
    const text = referencesText(brand, { axes, moves: [], rationale: "" }, screenOf("app", ["kpis", "chart", "table", "activity"]));
    for (const id of ["b-0", "b-1", "b-2", "b-3"]) expect(text).toContain(`<references for="${id}">`);
    expect(text).toContain("data-chart=");
  });
});
