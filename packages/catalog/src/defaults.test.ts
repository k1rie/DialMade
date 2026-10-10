import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANDING_LAYOUT_ID,
  DEFAULT_PAIRING_ID,
  DEFAULT_RECIPE_ID,
  defaultLandingLayout,
  defaultMotionTier,
  defaultPairing,
  defaultRecipe,
  defaultsFor,
  GENERIC_PRODUCT_ID,
  getProductType,
  googleFontsCss2Url,
  landingLayouts,
  productChips,
  productTypes,
  recommendKind,
  styleRecipes,
  typographyPairings,
} from "./index";

describe("recommendKind", () => {
  it("traduce la respuesta a la pregunta determinista", () => {
    expect(recommendKind("launch")).toBe("landing");
    expect(recommendKind("build")).toBe("app");
    expect(recommendKind("handoff")).toBe("brand");
  });
});

describe("getProductType", () => {
  it("devuelve el tipo por id y nada para generic o ids desconocidos", () => {
    expect(getProductType("saas-general")?.label).toEqual({ es: "SaaS (general)", en: "SaaS (General)" });
    expect(getProductType(GENERIC_PRODUCT_ID)).toBeUndefined();
    expect(getProductType("no-existe")).toBeUndefined();
  });
});

describe("defaults", () => {
  const ids = [...productTypes.map((product) => product.id), GENERIC_PRODUCT_ID, "no-existe"];

  it("siempre devuelven elementos del catálogo y son deterministas", () => {
    for (const id of ids) {
      const first = defaultsFor(id);
      expect(landingLayouts, id).toContain(first.landingLayout);
      expect(styleRecipes, id).toContain(first.recipe);
      expect(typographyPairings, id).toContain(first.pairing);
      expect(first.motion.id, id).toBe(first.recipe.defaultMotion);
      expect(defaultsFor(id), id).toEqual(first);
    }
  });

  it("nunca proponen una receta cuyo estilo de origen está prohibido para el producto", () => {
    for (const product of productTypes) {
      const recipe = defaultRecipe(product.id);
      expect(product.doNotUseStyles, `${product.id} → ${recipe.id}`).not.toContain(recipe.sourceStyleId);
    }
  });

  it("usan los valores por defecto para generic y para ids desconocidos", () => {
    for (const id of [GENERIC_PRODUCT_ID, "no-existe"]) {
      expect(defaultRecipe(id).id).toBe(DEFAULT_RECIPE_ID);
      expect(defaultPairing(id).id).toBe(DEFAULT_PAIRING_ID);
      expect(defaultLandingLayout(id).id).toBe(DEFAULT_LANDING_LAYOUT_ID);
      expect(defaultMotionTier(id).id).toBe("subtle");
    }
  });

  it("siguen el patrón de landing de products.csv", () => {
    expect(defaultLandingLayout("saas-general").id).toBe("minimal");
    expect(defaultLandingLayout("healthcare-app").id).toBe("social-proof");
    expect(defaultLandingLayout("portfolio-personal").id).toBe("storytelling");
    expect(defaultLandingLayout("e-commerce").id).toBe("feature-rich");
    expect(defaultLandingLayout("fintech-crypto").id).toBe("conversion");
    expect(defaultLandingLayout("analytics-dashboard").id).toBe("product-demo");
  });

  it("eligen receta y tipografía con criterio", () => {
    expect(defaultRecipe("developer-tool-ide").id).toBe("tech-precision");
    expect(defaultPairing("developer-tool-ide").id).toBe("mono-tech");
    expect(defaultRecipe("theater-cinema").id).toBe("dark-luxury");
    expect(defaultRecipe("magazine-blog").id).toBe("editorial");
    expect(defaultRecipe("habit-tracker").id).toBe("playful");
    expect(defaultPairing("banking-traditional-finance").id).toBe("plex-corporate");
    expect(defaultRecipe("healthcare-app").preferredMode).not.toBe("dark");
  });

  it("dan un punto de partida para cada chip", () => {
    for (const chip of productChips) {
      const defaults = defaultsFor(chip.id);
      expect(defaults.productType?.id ?? GENERIC_PRODUCT_ID).toBe(chip.id);
    }
  });
});

describe("googleFontsCss2Url", () => {
  it("une pesos por familia y ordena familias y pesos", () => {
    expect(
      googleFontsCss2Url([
        { family: "Source Sans 3", weights: [600, 400] },
        { family: "Inter", weights: [700] },
        { family: "Inter", weights: [400, 700] },
      ]),
    ).toBe("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Sans+3:wght@400;600&display=swap");
  });
});
