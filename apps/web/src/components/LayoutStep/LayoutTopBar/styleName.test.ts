import { styleRecipes } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import { GUIDE_STYLE, styleName } from "./styleName";

const [first, second] = styleRecipes;

describe("styleName", () => {
  it("names a recipe in the UI language", () => {
    expect(styleName(first!.id, "es", "Tu guía de estilo")).toBe(first!.label.es);
    expect(styleName(first!.id, "en", "Your style guide")).toBe(first!.label.en);
  });

  it("names the imported guide", () => {
    expect(styleName(GUIDE_STYLE, "es", "Tu guía de estilo", first!.id)).toBe("Tu guía de estilo");
  });

  it("falls back to the doc's recipe, then to the raw value", () => {
    expect(styleName("", "es", "Guía", second!.id)).toBe(second!.label.es);
    expect(styleName("unknown-recipe", "en", "Guide", second!.id)).toBe(second!.label.en);
    expect(styleName("unknown-recipe", "en", "Guide")).toBe("unknown-recipe");
  });
});
