import { getStyleRecipe, styleRecipes } from "@dialmade/catalog";
import { compileThemeVars, createDesignDoc, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import { beforeEach, describe, expect, it } from "vitest";
import { GUIDE_STYLE, PREVIEW_SCALE } from "./constants";
import { clearStyleVarsCache, getStyleVars, scaleShadow, themeInputsFor, themeSignature } from "./styleVars";

/** Fictional brand (never a real one). */
const makeDoc = (overrides: { primary?: string; name?: string; locks?: ("pairingId" | "motionTier")[] } = {}): DesignDoc =>
  createDesignDoc({
    brand: { name: overrides.name ?? "Lumen", seeds: { primary: overrides.primary ?? "#7c5cff" } },
    brief: { productType: "saas-general", ...(overrides.locks && { locks: overrides.locks }) },
  });

beforeEach(() => clearStyleVarsCache());

describe("scaleShadow", () => {
  it("scales every px length and keeps colors", () => {
    expect(scaleShadow("0 4px 12px -2px rgb(9 10 13 / 0.08), 0 2px 4px -2px rgb(9 10 13 / 0.06)", 0.5)).toBe(
      "0 2px 6px -1px rgb(9 10 13 / 0.08), 0 1px 2px -1px rgb(9 10 13 / 0.06)",
    );
    expect(scaleShadow("0 0 0 1.5px rgb(1 2 3 / 1)", 0.45)).toBe("0 0 0 0.68px rgb(1 2 3 / 1)");
  });

  it("leaves none alone", () => {
    expect(scaleShadow("none", 0.45)).toBe("none");
  });
});

describe("themeInputsFor", () => {
  it("swaps the recipe and cascades its pairing and motion, like setRecipe(id, { cascade: true })", () => {
    const doc = makeDoc();
    const editorial = getStyleRecipe("editorial")!;
    const inputs = themeInputsFor(doc, "editorial");
    expect(inputs.recipe.id).toBe("editorial");
    expect(inputs.pairing.id).toBe(editorial.pairingId);
    expect(inputs.motionTier.id).toBe(editorial.defaultMotion);
  });

  it("keeps a locked pairing and motion tier", () => {
    const doc = makeDoc({ locks: ["pairingId", "motionTier"] });
    const inputs = themeInputsFor(doc, "editorial");
    expect(inputs.recipe.id).toBe("editorial");
    expect(inputs.pairing.id).toBe(doc.brief.pairingId);
    expect(inputs.motionTier.id).toBe(doc.brief.motionTier);
  });

  it("uses the doc as it is for the guide and for unknown ids", () => {
    const doc = makeDoc();
    expect(themeInputsFor(doc, GUIDE_STYLE).recipe.id).toBe(doc.brief.recipeId);
    expect(themeInputsFor(doc, "no-such-recipe").recipe.id).toBe(doc.brief.recipeId);
  });

  it("generates the base theme once per theme", () => {
    const doc = makeDoc();
    expect(themeInputsFor(doc, "glass").theme).toBe(themeInputsFor(makeDoc(), "bento").theme);
  });
});

describe("getStyleVars", () => {
  it("compiles the recipe's variables with the user's brand", () => {
    const doc = makeDoc();
    const recipe = getStyleRecipe("playful")!;
    const base = resolveThemeInputs(doc);
    const raw = compileThemeVars(doc, { ...base, recipe, mode: "light", colorFormat: "hex" });
    const { vars, mode, recipeId } = getStyleVars(doc, "playful", "light");
    expect(recipeId).toBe("playful");
    expect(mode).toBe("light");
    expect(vars["--primary"]).toBe(raw["--primary"]);
    expect(vars["--dl-radius-lg"]).toBe(raw["--dl-radius-lg"]);
    expect(vars["--dl-card-radius"]).toBe("var(--dl-radius-lg)");
    expect(vars["--dl-shadow-md"]).toBe(scaleShadow(raw["--dl-shadow-md"]!, PREVIEW_SCALE));
  });

  it("keeps only what the preview reads", () => {
    const { vars } = getStyleVars(makeDoc(), "soft-ui");
    for (const name of ["--background", "--card", "--muted", "--chart-1", "--chart-5", "--dl-card-border", "--dl-button-radius", "--dl-input-radius", "--dl-border-width"]) {
      expect(vars, name).toHaveProperty([name]);
    }
    for (const name of ["--color-brand-500", "--dl-font-heading", "--dl-fs-h1", "--dl-space-5", "--dl-duration-fast"]) {
      expect(vars, name).not.toHaveProperty([name]);
    }
  });

  it("gives every recipe its own shape", () => {
    const doc = makeDoc();
    expect(getStyleVars(doc, "minimal-swiss").vars["--dl-radius-lg"]).not.toBe(getStyleVars(doc, "playful").vars["--dl-radius-lg"]);
  });

  it("paints in the recipe's preferred mode, else the palette's default", () => {
    const doc = makeDoc();
    const defaultMode = resolveThemeInputs(doc).theme.defaultMode;
    for (const recipe of styleRecipes) {
      expect(getStyleVars(doc, recipe.id).mode, recipe.id).toBe(recipe.preferredMode ?? defaultMode);
    }
    expect(getStyleVars(doc, "dark-luxury").mode).toBe("dark");
    expect(getStyleVars(doc, "glass", "dark").mode).toBe("dark");
  });

  it("reports the surface (glass has no theme variable)", () => {
    const doc = makeDoc();
    expect(getStyleVars(doc, "glass").surface).toBe("glass");
    expect(getStyleVars(doc, "soft-neubrutal").surface).toBe("outlined");
    expect(getStyleVars(doc, GUIDE_STYLE).surface).toBe(getStyleRecipe(doc.brief.recipeId)!.surface);
  });

  it("returns the same object for the same theme, whatever the doc's identity", () => {
    const first = getStyleVars(makeDoc(), "bento");
    expect(getStyleVars(makeDoc(), "bento")).toBe(first);
    expect(getStyleVars(makeDoc({ name: "Otra marca" }), "bento")).toBe(first);
    expect(Object.isFrozen(first.vars)).toBe(true);
  });

  it("recomputes when the theme changes", () => {
    const first = getStyleVars(makeDoc(), "bento");
    const other = getStyleVars(makeDoc({ primary: "#0e9f6e" }), "bento");
    expect(other).not.toBe(first);
    expect(other.vars["--primary"]).not.toBe(first.vars["--primary"]);
    expect(themeSignature(makeDoc())).not.toBe(themeSignature(makeDoc({ primary: "#0e9f6e" })));
  });

  it("is deterministic", () => {
    const first = getStyleVars(makeDoc(), "tech-precision");
    clearStyleVarsCache();
    const second = getStyleVars(makeDoc(), "tech-precision");
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
    expect(Object.keys(second.vars)).toEqual(Object.keys(first.vars));
  });
});
