import { styleRecipes } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import type { ImportedBrand } from "../types";
import { RECIPE_CLOSE_DISTANCE, classifyShadow, featuresFromBrand, nearestRecipe } from "./recipe";

const layer = (x: number, y: number, blur: number, alpha: number, color = "#000000") => ({ x, y, blur, spread: 0, color, alpha });
const prov = { sourceId: "css-1", locator: "globals.css", confidence: "exact" as const, method: "declared" as const, id: "x" };

describe("nearestRecipe", () => {
  it("finds every catalog recipe from its own attributes", () => {
    for (const recipe of styleRecipes) {
      const match = nearestRecipe({
        radii: recipe.radius,
        shadow: recipe.shadow,
        surface: recipe.surface,
        borderWidth: recipe.borderWidth,
        buttonShape: recipe.button.shape,
        headingWeight: recipe.headingWeight,
        headingTracking: recipe.headingTracking,
      });
      expect(match?.id).toBe(recipe.id);
      expect(match?.distance).toBe(0);
      expect(match?.close).toBe(true);
    }
  });

  it("ranks by radius and shadow when that is all there is", () => {
    const soft = nearestRecipe({ radii: { sm: 6, md: 10, lg: 14, xl: 20 }, shadow: "soft" });
    expect(soft?.id).toBe("soft-ui");
    expect(soft?.basis).toEqual(["radius", "shadow"]);
    expect(soft?.ranking).toHaveLength(3);
    expect(nearestRecipe({ radii: { md: 0 }, shadow: "none" })?.id).toBe("minimal-swiss");
    expect(nearestRecipe({ radii: { md: 3 }, shadow: "crisp", borderWidth: 2 })?.id).toBe("soft-neubrutal");
  });

  it("is not close when nothing fits, and null without features", () => {
    const far = nearestRecipe({ radii: { sm: 40, md: 48, lg: 64, xl: 96 }, shadow: "glow", borderWidth: 6, surface: "glass" });
    expect(far?.close).toBe(false);
    expect(far!.distance).toBeGreaterThan(RECIPE_CLOSE_DISTANCE);
    expect(nearestRecipe({})).toBeNull();
  });
});

describe("classifyShadow", () => {
  it("names shadow styles", () => {
    expect(classifyShadow([])).toBe("none");
    expect(classifyShadow([layer(0, 1, 3, 0.1), layer(0, 1, 2, 0.06)])).toBe("soft");
    expect(classifyShadow([layer(4, 4, 0, 1)])).toBe("crisp");
    expect(classifyShadow([layer(0, 25, 50, 0.25)])).toBe("deep");
    expect(classifyShadow([layer(0, 0, 24, 0.6, "#7c3aed")])).toBe("glow");
    expect(classifyShadow([{ ...layer(0, 2, 4, 0.05), inset: true }])).toBe("none");
  });
});

describe("featuresFromBrand", () => {
  it("expands shadcn's --radius and reads shadows, border and heading metrics", () => {
    const brand: Pick<ImportedBrand, "shape" | "typeScale" | "screenshots" | "colors"> = {
      colors: [],
      shape: {
        radius: { ...prov, value: 0.625, unit: "rem", px: 10, assumed: true },
        shadows: [{ ...prov, name: "md", layers: [layer(0, 4, 6, 0.1)] }],
        borderWidth: { ...prov, value: 1, unit: "px", px: 1 },
      },
      typeScale: [{ ...prov, name: "h1", step: "h1", weight: 700, letterSpacing: -0.02 }],
      screenshots: [],
    };
    expect(featuresFromBrand(brand)).toEqual({
      radii: { sm: 6, md: 8, lg: 10, xl: 14 },
      shadow: "soft",
      borderWidth: 1,
      headingWeight: 700,
      headingTracking: -0.02,
    });
  });
});
