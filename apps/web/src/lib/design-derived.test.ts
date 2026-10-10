import { applyPatch, compileThemeVars, createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { deriveDesign } from "./design-derived";

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
