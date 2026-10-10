import { applyPatch, compileThemeVars, createDesignDoc, screenPointer, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { deriveDesign } from "./design-derived";
import { withGeneratedScreens } from "./design-engine";

function lockedPrimaryDoc(): DesignDoc {
  const base = createDesignDoc({
    brand: { name: "Nimbo", seeds: { primary: "#facc15" } },
    brief: { paletteStyleId: "pastel", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
  const result = applyPatch(base, [
    { op: "add", path: "/tokens/color/light/primary", value: "#facc15" },
    { op: "add", path: "/brief/locks/-", value: "/tokens/color/light/primary" },
    { op: "add", path: "/brief/locks/-", value: "/brand/seeds/primary" },
  ]);
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

describe("deriveDesign", () => {
  it("anchors the theme to the locked imported colors (same vars as compileThemeVars)", () => {
    const doc = lockedPrimaryDoc();
    const derived = deriveDesign(doc);
    expect(derived.theme.light.primary).toBe("#facc15");
    for (const mode of ["light", "dark"] as const) {
      const expected = compileThemeVars(doc, { mode });
      for (const name of ["--color-brand-500", "--cta", "--brand", "--ring", "--chart-1"]) expect(derived.vars[mode][name], `${mode} ${name}`).toBe(expected[name]);
    }
  });

  it("links the doc's own families", () => {
    const doc = lockedPrimaryDoc();
    const own = applyPatch(doc, [{ op: "add", path: "/tokens/typography/body", value: { family: "Lora", source: "google" } }]);
    if (!own.ok) throw new Error(own.error.message);
    expect(deriveDesign(own.doc).fontsUrl).toContain("family=Lora");
    expect(deriveDesign(doc).fontsUrl).toBe(deriveDesign(doc).pairing.googleFontsUrl);
  });
});

describe("deriveDesign with screens", () => {
  it("applies a screen's own dials when given its id; an unknown key means the global dials", () => {
    let n = 0;
    const template = getScreenTemplate("dashboard");
    const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId: () => `b-${(++n).toString(36).padStart(6, "0")}` });
    const generated = withGeneratedScreens(lockedPrimaryDoc(), [
      { screenId: "s-dash", name: "Dashboard", kind: "app", route: "/dashboard", shell, layout },
    ]);
    if (!generated.ok) throw new Error(generated.error.message);
    const dense = applyPatch(generated.doc, [{ op: "add", path: screenPointer("s-dash", "page", "dials"), value: { density: 9 } }]);
    if (!dense.ok) throw new Error(dense.error.message);
    const derived = deriveDesign(dense.doc, "s-dash");
    expect(derived.key).toBe("s-dash");
    expect(derived.kind).toBe("app");
    expect(derived.dials.density).toBe(9);
    expect(deriveDesign(dense.doc, "missing")).toMatchObject({ key: null, kind: null, dials: dense.doc.brief.dials });
  });
});
