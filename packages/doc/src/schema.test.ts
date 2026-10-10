import { describe, expect, it } from "vitest";
import { createDesignDoc, createPage, parseDesignDoc, safeParseDesignDoc } from "./doc";
import { cloneJson } from "./json";
import { DesignDocSchema, PageSchema, type DesignDoc } from "./schema";
import { CREATED_AT, acmeDoc, acmeInput } from "./testing/fixtures";

type Mutable = Record<string, any>;

function invalidPaths(doc: unknown): string[] {
  const result = safeParseDesignDoc(doc);
  return result.success ? [] : result.issues.map((issue) => issue.path.join("/"));
}

function mutate(fn: (doc: Mutable) => void): Mutable {
  const doc = cloneJson(acmeDoc()) as Mutable;
  fn(doc);
  return doc;
}

const minimal = {
  version: 1,
  brand: { name: "Mini", seeds: { primary: "#112233" }, achromatic: false },
  brief: {
    focus: "brand",
    locale: "en",
    paletteStyleId: "brand",
    recipeId: "minimal-swiss",
    pairingId: "inter-neo-grotesque",
    motionTier: "subtle",
    dials: { variance: 5, motion: 5, density: 5 },
  },
  provenance: { engineVersion: "0.1.0" },
};

describe("DesignDocSchema: valid documents", () => {
  it("accepts a full document with the three pages", () => {
    const doc = acmeDoc();
    expect(DesignDocSchema.parse(doc)).toEqual(doc);
    expect(Object.keys(doc.pages)).toEqual(["brand", "landing", "app"]);
  });

  it("fills defaults for a minimal stored document", () => {
    const doc = parseDesignDoc(minimal);
    expect(doc.brief.productType).toBe("generic");
    expect(doc.brief.locks).toEqual([]);
    expect(doc.references).toEqual([]);
    expect(doc.pages).toEqual({});
    expect(doc.tokens).toEqual({
      color: { light: {}, dark: {} },
      radius: {},
      fontSize: {},
      space: {},
      motion: {},
      typography: { scale: {} },
      elevation: {},
    });
    expect(doc.system).toEqual({ button: {}, card: {}, input: {}, badge: {}, nav: {}, table: {}, sidebar: {} });
  });

  it("accepts overrides, references, locks and bindings", () => {
    const doc = mutate((d) => {
      d.tokens.color.light.primary = "#ABCDEF";
      d.tokens.radius.md = 7;
      d.tokens.fontSize.body = 17;
      d.tokens.space["4"] = 18;
      d.tokens.borderWidth = 2;
      d.tokens.motion = { fast: 100, ease: "ease-out" };
      d.system.button = { shape: "pill", weight: 600, shadow: true };
      d.system.card = { elevation: 3, border: false, padding: "roomy" };
      d.system.sidebar = { width: "wide" };
      d.brief.locks = ["recipeId", "dials.density"];
      d.references = [{ id: "ref-1", kind: "url", sourceUrl: "https://example.com", fingerprint: { colors: ["#000000"], tags: ["dark"] } }];
      d.pages.landing.elements["hero-1"].props = {
        title: { bind: "brand.name" },
        subtitle: { bind: "brand.tagline" },
        items: [{ label: "A", meta: { nested: { bind: "brand.name" } } }],
      };
      d.pages.landing.hidden = ["cta-1"];
      d.pages.app.dials = { density: 9, variance: 2 };
    });
    expect(invalidPaths(doc)).toEqual([]);
  });
});

describe("DesignDocSchema: invalid documents", () => {
  it.each([
    ["wrong version", (d: Mutable) => (d.version = 3), "version"],
    ["unknown top-level key", (d: Mutable) => (d.extra = true), ""],
    ["blank name", (d: Mutable) => (d.brand.name = "   "), "brand/name"],
    ["multi-line name", (d: Mutable) => (d.brand.name = "A\nB"), "brand/name"],
    ["bad seed", (d: Mutable) => (d.brand.seeds.primary = "blue"), "brand/seeds/primary"],
    ["short hex", (d: Mutable) => (d.brand.seeds.primary = "#abc"), "brand/seeds/primary"],
    ["missing achromatic", (d: Mutable) => delete d.brand.achromatic, "brand/achromatic"],
    ["unknown focus", (d: Mutable) => (d.brief.focus = "mobile"), "brief/focus"],
    ["unknown locale", (d: Mutable) => (d.brief.locale = "fr"), "brief/locale"],
    ["unknown palette style", (d: Mutable) => (d.brief.paletteStyleId = "rainbow"), "brief/paletteStyleId"],
    ["unknown product type", (d: Mutable) => (d.brief.productType = "spaceship"), "brief/productType"],
    ["unknown recipe", (d: Mutable) => (d.brief.recipeId = "baroque"), "brief/recipeId"],
    ["unknown pairing", (d: Mutable) => (d.brief.pairingId = "comic-sans"), "brief/pairingId"],
    ["unknown motion tier", (d: Mutable) => (d.brief.motionTier = "wild"), "brief/motionTier"],
    ["dial below 1", (d: Mutable) => (d.brief.dials.density = 0), "brief/dials/density"],
    ["dial above 10", (d: Mutable) => (d.brief.dials.variance = 11), "brief/dials/variance"],
    ["fractional dial", (d: Mutable) => (d.brief.dials.motion = 5.5), "brief/dials/motion"],
    ["unknown lock", (d: Mutable) => (d.brief.locks = ["everything"]), "brief/locks/0"],
    ["duplicate lock", (d: Mutable) => (d.brief.locks = ["recipeId", "recipeId"]), "brief/locks"],
    ["unknown color role override", (d: Mutable) => (d.tokens.color.light.banana = "#000000"), "tokens/color/light"],
    ["bad color override", (d: Mutable) => (d.tokens.color.dark.primary = "red"), "tokens/color/dark/primary"],
    ["negative radius", (d: Mutable) => (d.tokens.radius.md = -1), "tokens/radius/md"],
    ["unknown token group", (d: Mutable) => (d.tokens.gradients = {}), "tokens"],
    ["unknown space step", (d: Mutable) => (d.tokens.space["11"] = 4), "tokens/space"],
    ["bad ease", (d: Mutable) => (d.tokens.motion.ease = "url(x)"), "tokens/motion/ease"],
    ["unknown button shape", (d: Mutable) => (d.system.button.shape = "blob"), "system/button/shape"],
    ["odd button weight", (d: Mutable) => (d.system.button.weight = 550), "system/button/weight"],
    ["unknown card elevation", (d: Mutable) => (d.system.card.elevation = 4), "system/card/elevation"],
    ["unknown system component", (d: Mutable) => (d.system.carousel = {}), "system"],
    ["unknown system key", (d: Mutable) => (d.system.card.glow = true), "system/card"],
    ["javascript reference url", (d: Mutable) => (d.references = [{ id: "r", kind: "url", sourceUrl: "javascript:alert(1)" }]), "references/0/sourceUrl"],
    ["duplicate reference ids", (d: Mutable) => (d.references = [{ id: "r", kind: "upload" }, { id: "r", kind: "upload" }]), "references"],
    ["bad createdAt", (d: Mutable) => (d.provenance.createdAt = "yesterday"), "provenance/createdAt"],
    ["unknown page kind", (d: Mutable) => (d.pages.mobile = d.pages.app), "pages"],
  ])("rejects %s", (_label, fn, path) => {
    expect(invalidPaths(mutate(fn))).toContain(path);
  });

  it("rejects a non-object", () => {
    expect(safeParseDesignDoc(null).success).toBe(false);
    expect(() => parseDesignDoc("doc")).toThrow(/Invalid DesignDoc/);
  });
});

describe("pages: superRefine and tree rules", () => {
  it("requires pages[k].kind === k", () => {
    const doc = mutate((d) => (d.pages.brand = { ...d.pages.app }));
    const result = safeParseDesignDoc(doc);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.issues.find((i) => i.path.join("/") === "pages/brand/kind");
      expect(issue?.message).toBe('pages.brand.kind must be "brand", got "app"');
    }
  });

  it("rejects elements outside the page's catalog namespace (ui.* is allowed)", () => {
    const ok = mutate((d) => {
      d.pages.landing.elements["btn-1"] = { type: "ui.button", props: {}, children: [] };
      d.pages.landing.elements["hero-1"].children = ["btn-1"];
    });
    expect(invalidPaths(ok)).toEqual([]);
    const bad = mutate((d) => (d.pages.landing.elements["hero-1"].type = "app.kpiRow"));
    expect(invalidPaths(bad)).toContain("pages/landing/elements/hero-1/type");
  });

  it.each([
    ["missing root", (p: Mutable) => (p.root = "nope"), "root"],
    ["unknown child", (p: Mutable) => p.elements.root.children.push("ghost"), "elements/root/children/5"],
    ["root as child", (p: Mutable) => (p.elements["hero-1"].children = ["root"]), "elements/hero-1/children/0"],
    ["two parents", (p: Mutable) => (p.elements["hero-1"].children = ["cta-1"]), "elements/hero-1/children/0"],
    ["orphan", (p: Mutable) => (p.elements.root.children = p.elements.root.children.filter((c: string) => c !== "cta-1")), "elements/cta-1"],
    ["cycle", (p: Mutable) => {
      p.elements.root.children = p.elements.root.children.filter((c: string) => c !== "cta-1");
      p.elements["cta-1"].children = ["footer-1"];
      p.elements.root.children = p.elements.root.children.filter((c: string) => c !== "footer-1");
      p.elements["footer-1"].children = ["cta-1"];
    }, "elements/cta-1"],
    ["unknown hidden", (p: Mutable) => (p.hidden = ["ghost"]), "hidden/0"],
    ["hidden root", (p: Mutable) => (p.hidden = ["root"]), "hidden/0"],
    ["duplicate hidden", (p: Mutable) => (p.hidden = ["cta-1", "cta-1"]), "hidden"],
    ["bad element id", (p: Mutable) => {
      p.elements["bad/id"] = { type: "landing.cta", props: {}, children: [] };
      p.elements.root.children.push("bad/id");
    }, "elements/bad/id"],
    ["un-namespaced type", (p: Mutable) => (p.elements["hero-1"].type = "hero"), "elements/hero-1/type"],
    ["unknown landing layout", (p: Mutable) => (p.layoutId = "carousel"), "layoutId"],
    ["page dial out of range", (p: Mutable) => (p.dials = { density: 12 }), "dials/density"],
    ["non-JSON prop", (p: Mutable) => (p.elements["hero-1"].props = { at: new Date(0) }), "elements/hero-1/props/at"],
    ["NaN prop", (p: Mutable) => (p.elements["hero-1"].props = { n: Number.NaN }), "elements/hero-1/props/n"],
    ["unknown binding", (p: Mutable) => (p.elements["hero-1"].props = { title: { bind: "brand.logo" } }), "elements/hero-1/props/title"],
    ["binding with extras", (p: Mutable) => (p.elements["hero-1"].props = { title: { bind: "brand.name", x: 1 } }), "elements/hero-1/props/title"],
    ["nested bad binding", (p: Mutable) => (p.elements["hero-1"].props = { items: [{ label: { bind: 3 } }] }), "elements/hero-1/props/items/0/label"],
  ])("rejects a page with %s", (_label, fn, path) => {
    const doc = mutate((d) => fn(d.pages.landing));
    expect(invalidPaths(doc)).toContain(`pages/landing/${path}`);
  });

  it("PageSchema validates a page on its own", () => {
    const page = createPage("landing", { layoutId: "conversion" });
    expect(PageSchema.parse(page)).toEqual(page);
    expect(PageSchema.safeParse({ ...page, root: "x" }).success).toBe(false);
  });
});

describe("createDesignDoc output", () => {
  it("is always valid and round-trips through JSON", () => {
    const doc: DesignDoc = createDesignDoc(acmeInput);
    expect(parseDesignDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(doc.provenance.createdAt).toBe(CREATED_AT);
  });
});
