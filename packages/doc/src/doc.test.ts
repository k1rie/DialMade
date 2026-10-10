import { defaultsFor, getLandingLayout } from "@dialmade/catalog";
import { ENGINE_VERSION } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { isBinding, resolveBindings } from "./bindings";
import { APP_SHELL_TYPE, APP_SHELL_WIDGETS, DEFAULT_PAGE_SECTIONS } from "./constants";
import {
  DesignDocError,
  addPage,
  createDesignDoc,
  createPage,
  defaultLayoutId,
  effectiveDials,
  elementIdBase,
} from "./doc";
import { cloneJson } from "./json";
import { acmeDoc, acmeInput, monoDoc } from "./testing/fixtures";

describe("createDesignDoc", () => {
  it("normalizes seeds and fills catalog defaults for the product type", () => {
    const doc = createDesignDoc(acmeInput);
    const defaults = defaultsFor("saas-general");
    expect(doc.version).toBe(1);
    expect(doc.brand.seeds).toEqual({ primary: "#3a5bd9", secondary: "#f0a024" });
    expect(doc.brand.achromatic).toBe(false);
    expect(doc.brief).toEqual({
      productType: "saas-general",
      focus: "landing",
      locale: "en",
      paletteStyleId: "brand",
      recipeId: defaults.recipe.id,
      pairingId: defaults.pairing.id,
      motionTier: defaults.motion.id,
      dials: { variance: 5, motion: 5, density: 5 },
      locks: [],
    });
    expect(doc.provenance.engineVersion).toBe(ENGINE_VERSION);
    expect(doc.pages).toEqual({});
  });

  it("defaults to the generic product, brand focus and Spanish", () => {
    const doc = createDesignDoc({ brand: { name: "X", seeds: { primary: "rgb(255, 0, 0)" } } });
    expect(doc.brief.productType).toBe("generic");
    expect(doc.brief.focus).toBe("brand");
    expect(doc.brief.locale).toBe("es");
    expect(doc.brief.recipeId).toBe(defaultsFor("generic").recipe.id);
    expect(doc.brand.seeds.primary).toBe("#ff0000");
    expect(doc.brand).not.toHaveProperty("tagline");
    expect(doc.brand).not.toHaveProperty("logoRef");
  });

  it("detects achromatic logos like @dialmade/palette", () => {
    expect(monoDoc().brand.achromatic).toBe(true);
    expect(createDesignDoc({ brand: { name: "Y", seeds: { primary: "#171717" }, achromatic: false } }).brand.achromatic).toBe(false);
  });

  it("merges partial dials and keeps explicit choices", () => {
    const doc = createDesignDoc({
      brand: { name: "Z", seeds: { primary: "#00aa88" }, logoRef: "upload:logo-1" },
      brief: { recipeId: "editorial", pairingId: "editorial-serif", motionTier: "expressive", dials: { density: 2 }, locks: ["recipeId"] },
      system: { button: { shape: "pill" } },
      tokens: { radius: { md: 3 } },
    });
    expect(doc.brief.dials).toEqual({ variance: 5, motion: 5, density: 2 });
    expect(doc.brief.recipeId).toBe("editorial");
    expect(doc.brief.locks).toEqual(["recipeId"]);
    expect(doc.system.button).toEqual({ shape: "pill" });
    expect(doc.system.card).toEqual({});
    expect(doc.tokens.radius).toEqual({ md: 3 });
    expect(doc.brand.logoRef).toBe("upload:logo-1");
  });

  it("throws DesignDocError with readable issues", () => {
    expect(() => createDesignDoc({ brand: { name: "X", seeds: { primary: "not a color" } } })).toThrow(DesignDocError);
    expect(() => createDesignDoc({ brand: { name: "", seeds: { primary: "#000000" } } })).toThrow(/\/brand\/name/);
    expect(() => createDesignDoc({ brand: { name: "X", seeds: { primary: "#000" } }, brief: { recipeId: "nope" } })).toThrow(
      /Unknown style recipe/,
    );
  });

  it("does not keep references to the input", () => {
    const input = cloneJson(acmeInput);
    const doc = createDesignDoc(input);
    input.brand.name = "Changed";
    expect(doc.brand.name).toBe("Acme Cloud");
  });
});

describe("createPage", () => {
  it("builds a landing skeleton from the layout's sections", () => {
    const page = createPage("landing", { layoutId: "social-proof" });
    const layout = getLandingLayout("social-proof")!;
    expect(page.kind).toBe("landing");
    expect(page.root).toBe("root");
    expect(page.elements.root!.type).toBe("landing.page");
    expect(page.elements.root!.children.map((id) => page.elements[id]!.type)).toEqual(layout.sections);
    expect(page.elements.root!.children).toContain("hero-1");
    expect(page.elements.root!.children).toContain("social-proof-1");
    expect(page).not.toHaveProperty("dials");
  });

  it("picks the landing layout from the product type", () => {
    expect(createPage("landing", { productType: "saas-general" }).layoutId).toBe(defaultsFor("saas-general").landingLayout.id);
    expect(defaultLayoutId("landing")).toBe("feature-rich");
    expect(defaultLayoutId("brand")).toBe("brand-board");
  });

  it("gives the App page density 7 and the default widgets", () => {
    const page = createPage("app");
    expect(page.dials).toEqual({ density: 7 });
    expect(page.elements.root!.children.map((id) => page.elements[id]!.type)).toEqual(DEFAULT_PAGE_SECTIONS.app.map((s) => s.type));
    expect(page.elements.root!.children).toEqual(["shell-1"]);
    expect(page.elements["shell-1"]!.type).toBe(APP_SHELL_TYPE);
    expect(page.elements["shell-1"]!.children.map((id) => page.elements[id]!.type)).toEqual(APP_SHELL_WIDGETS);
    expect(createPage("app", { dials: { density: 4, variance: 8 } }).dials).toEqual({ density: 4, variance: 8 });
  });

  it("numbers repeated sections and accepts ids and props", () => {
    const page = createPage("landing", {
      layoutId: "minimal",
      sections: ["landing.features", "landing.features", { type: "landing.hero", id: "intro", props: { title: { bind: "brand.name" } } }],
    });
    expect(page.elements.root!.children).toEqual(["features-1", "features-2", "intro"]);
    expect(page.elements.intro!.props).toEqual({ title: { bind: "brand.name" } });
  });

  it("rejects duplicate ids and invalid sections", () => {
    expect(() => createPage("brand", { sections: [{ type: "brand.cover", id: "a" }, { type: "brand.cover", id: "a" }] })).toThrow(/Duplicate/);
    expect(() => createPage("brand", { sections: [{ type: "brand.cover", id: "root" }] })).toThrow(/Duplicate/);
    expect(() => createPage("brand", { sections: ["landing.hero"] })).toThrow(DesignDocError);
    expect(() => createPage("landing", { layoutId: "nope" })).toThrow(/Unknown landing layout/);
  });

  it("derives ids from types", () => {
    expect(elementIdBase("landing.socialProof")).toBe("social-proof");
    expect(elementIdBase("brand.artDirection")).toBe("art-direction");
    expect(elementIdBase("ui.button")).toBe("button");
  });
});

describe("addPage", () => {
  it("adds a default page without touching the original doc", () => {
    const doc = createDesignDoc(acmeInput);
    const before = cloneJson(doc);
    const next = addPage(doc, "landing");
    expect(doc).toEqual(before);
    expect(next.pages.landing?.kind).toBe("landing");
    expect(next.pages.landing?.layoutId).toBe(defaultsFor("saas-general").landingLayout.id);
    expect(next).not.toBe(doc);
  });

  it("accepts a given page and refuses mismatches and duplicates", () => {
    const doc = createDesignDoc(acmeInput);
    const brand = createPage("brand");
    const next = addPage(doc, "brand", brand);
    expect(next.pages.brand).toEqual(brand);
    expect(next.pages.brand).not.toBe(brand);
    expect(() => addPage(doc, "landing", brand)).toThrow(/does not match/);
    expect(() => addPage(next, "brand")).toThrow(/already exists/);
    const replaced = addPage(next, "brand", createPage("brand", { sections: ["brand.cover"] }), { replace: true });
    expect(replaced.pages.brand?.elements.root?.children).toEqual(["cover-1"]);
  });

  it("validates the page it adds", () => {
    const doc = createDesignDoc(acmeInput);
    const broken = { ...createPage("landing"), root: "missing" };
    expect(() => addPage(doc, "landing", broken)).toThrow(/not in elements/);
  });
});

describe("effectiveDials", () => {
  it("puts page dials on top of the global ones", () => {
    const doc = acmeDoc();
    expect(effectiveDials(doc)).toEqual({ variance: 5, motion: 5, density: 5 });
    expect(effectiveDials(doc, "landing")).toEqual({ variance: 5, motion: 5, density: 5 });
    expect(effectiveDials(doc, "app")).toEqual({ variance: 5, motion: 5, density: 7 });
  });
});

describe("resolveBindings", () => {
  it("replaces bindings at any depth and leaves the rest", () => {
    const doc = acmeDoc();
    const props = {
      title: { bind: "brand.name" },
      subtitle: { bind: "brand.tagline" },
      count: 3,
      items: [{ label: { bind: "brand.name" }, href: "#" }],
      nested: { deep: { bind: "brand.tagline" }, keep: null },
    };
    const snapshot = cloneJson(props);
    expect(resolveBindings(doc, props)).toEqual({
      title: "Acme Cloud",
      subtitle: "Ship faster, sleep better",
      count: 3,
      items: [{ label: "Acme Cloud", href: "#" }],
      nested: { deep: "Ship faster, sleep better", keep: null },
    });
    expect(props).toEqual(snapshot);
  });

  it("resolves a missing tagline to an empty string", () => {
    expect(resolveBindings({ brand: { name: "N" } }, { t: { bind: "brand.tagline" } })).toEqual({ t: "" });
  });

  it("only treats exact bindings as bindings", () => {
    expect(isBinding({ bind: "brand.name" })).toBe(true);
    expect(isBinding({ bind: "brand.name", extra: 1 })).toBe(false);
    expect(isBinding({ bind: "brand.logo" })).toBe(false);
    expect(resolveBindings({ brand: { name: "N" } }, { x: { bind: "brand.logo" } })).toEqual({ x: { bind: "brand.logo" } });
  });
});
