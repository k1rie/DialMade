import { createDesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { recipeChoice, sampleVars } from "./previewVars";

const base = createDesignDoc({
  brand: { name: "Lumen", seeds: { primary: "#0f766e", secondary: "#f59e0b" } },
  brief: { productType: "saas-general", locale: "es", recipeId: "playful" },
  provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
});
const themed = { ...base, brief: { ...base.brief, themeId: "daisyui-cupcake" } };

describe("sampleVars with variants", () => {
  it("a variant card differs from the plain recipe and keeps the user's colors", () => {
    const plain = sampleVars(base, recipeChoice(base, "playful"), "light");
    const variant = sampleVars(base, { ...recipeChoice(base, "playful"), themeId: "daisyui-cupcake" }, "light");
    // Cupcake is a variant of playful with 16 px cards; playful alone has bigger ones.
    expect(variant["--dl-radius-lg"]).toBe("16px");
    expect(variant["--dl-radius-lg"]).not.toBe(plain["--dl-radius-lg"]);
    expect(variant["--primary"]).toBe(plain["--primary"]);
  });

  it("a variant of another recipe is ignored: the card shows the plain recipe", () => {
    const plain = sampleVars(base, recipeChoice(base, "playful"), "light");
    const foreign = sampleVars(base, { ...recipeChoice(base, "playful"), themeId: "tweakcn-neo-brutalism" }, "light");
    expect(foreign).toEqual(plain);
  });

  it("a recipe card shows the plain recipe even when the doc has a variant", () => {
    const fromBase = sampleVars(base, recipeChoice(base, "playful"), "light");
    const fromThemed = sampleVars(themed, recipeChoice(themed, "playful"), "light");
    expect(fromThemed).toEqual(fromBase);
  });

  it("a card that does not mention the variant inherits the doc's one (the cache keys them apart)", () => {
    const inheriting = sampleVars(themed, { paletteStyleId: "pastel" }, "light");
    const plainPastel = sampleVars(base, { paletteStyleId: "pastel" }, "light");
    expect(inheriting["--dl-radius-lg"]).not.toBe(plainPastel["--dl-radius-lg"]);
  });
});
