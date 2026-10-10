import { describe, expect, it } from "vitest";
import { PROMO_LANGS, PROMO_SCENES, PROMO_SCENE_IDS, promoFileName, promoPath } from "../../../promo/scenes";
import { partLocators } from "./parts";

describe("promo manifest", () => {
  it("has every scene once", () => {
    expect(PROMO_SCENES.map((scene) => scene.id)).toEqual([...PROMO_SCENE_IDS]);
  });

  it("uses kebab-case part ids, unique per scene", () => {
    for (const scene of PROMO_SCENES) {
      const ids = scene.parts.map((part) => part.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("gives every capture its own stable file name", () => {
    const files = PROMO_SCENES.flatMap((scene) => [
      ...scene.viewports.map((viewport) => promoFileName(scene.id, { viewport })),
      ...scene.parts.map((part) => promoFileName(scene.id, { part: part.id })),
    ]);
    expect(new Set(files).size).toBe(files.length);
    expect(promoFileName("home")).toBe("home.png");
    expect(promoFileName("home", { viewport: "mobile" })).toBe("home-mobile.png");
    expect(promoFileName("home", { part: "hero" })).toBe("home__hero.png");
  });

  it("builds the route's URLs", () => {
    expect(promoPath({ scene: "palette" })).toBe("/promo?scene=palette");
    expect(promoPath({ scene: "home", lang: "en", only: "hero", transparent: true, viewport: "mobile" })).toBe(
      "/promo?scene=home&lang=en&only=hero&bg=transparent&viewport=mobile",
    );
  });

  it("is what the route can find: one locator per part, in both languages", () => {
    for (const lang of PROMO_LANGS) {
      for (const scene of PROMO_SCENES) {
        expect(Object.keys(partLocators(scene.id, lang)).sort()).toEqual(scene.parts.map((part) => part.id).sort());
      }
    }
  });
});
