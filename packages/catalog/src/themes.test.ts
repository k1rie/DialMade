import { describe, expect, it } from "vitest";

import { styleRecipes, typographyPairings } from "./index";
import { themeArchetypes } from "./data/themeArchetypes";
import { archetypeOf, getThemePreset, getThemeRecipe, nearestArchetype, resolveRecipe, themeColors, themePresets, themeShapes, themesByArchetype, themeToRecipe } from "./themes";

const HEX = /^#[0-9a-f]{6}$/;
const REQUIRED_ROLES = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "border",
  "destructive",
] as const;

const pairingIds = new Set(typographyPairings.map((pairing) => pairing.id));
const archetypeIds = new Set(styleRecipes.map((recipe) => recipe.id));

function preset(id: string) {
  const found = getThemePreset(id);
  if (!found) throw new Error(`falta el tema ${id}`);
  return found;
}

describe("themePresets", () => {
  it("trae los 35 de daisyUI y los 36 de tweakcn que no llevan nombre de marca, con ids únicos", () => {
    expect(themePresets.filter((theme) => theme.source === "daisyui")).toHaveLength(35);
    expect(themePresets.filter((theme) => theme.source === "tweakcn")).toHaveLength(36);
    const ids = themePresets.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of themePresets) expect(theme.id).toBe(`${theme.source}-${theme.sourceKey}`);
  });

  it("no incluye los presets con nombre de marca o de producto", () => {
    const keys = themePresets.filter((theme) => theme.source === "tweakcn").map((theme) => theme.sourceKey);
    for (const dropped of ["twitter", "t3-chat", "supabase", "claude", "vercel", "doom-64"]) expect(keys).not.toContain(dropped);
  });

  it("todos los colores son hex de 6 dígitos y todos los roles obligatorios están presentes", () => {
    for (const theme of themePresets) {
      expect(theme.modes.length).toBeGreaterThan(0);
      for (const mode of theme.modes) {
        const colors = theme.colors[mode];
        expect(colors, `${theme.id} ${mode}`).toBeDefined();
        for (const role of REQUIRED_ROLES) expect(colors?.[role], `${theme.id} ${mode} ${role}`).toMatch(HEX);
        for (const value of [colors?.destructiveForeground, colors?.success, colors?.warning, colors?.info, ...(colors?.chart ?? [])]) {
          if (value !== undefined) expect(value).toMatch(HEX);
        }
      }
    }
  });

  it("convierte bien oklch: blanco y negro exactos", () => {
    expect(themeColors(preset("daisyui-light"), "light").background).toBe("#ffffff");
    expect(themeColors(preset("daisyui-black"), "dark").background).toBe("#000000");
  });

  it("los radios y el borde son números finitos y no negativos", () => {
    for (const theme of themePresets) {
      for (const value of [theme.radius.selector, theme.radius.field, theme.radius.box, theme.border]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("themeColors cae al otro modo cuando el tema solo tiene uno", () => {
    const light = preset("daisyui-light");
    expect(light.modes).toEqual(["light"]);
    expect(themeColors(light, "dark")).toBe(light.colors.light);
  });
});

describe("themeToRecipe", () => {
  it("devuelve recetas completas con valores válidos y un arquetipo y pairing que existen", () => {
    for (const theme of themePresets) {
      const recipe = themeToRecipe(theme);
      expect(recipe.id).toBe(theme.id);
      expect(recipe.themeId).toBe(theme.id);
      expect(archetypeIds.has(recipe.archetypeId)).toBe(true);
      expect(recipe.pairingId && pairingIds.has(recipe.pairingId)).toBe(true);
      expect(recipe.label.es.length).toBeGreaterThan(0);
      expect(recipe.description.es.length).toBeGreaterThan(0);
      expect(recipe.description.en.length).toBeGreaterThan(0);
      expect(["none", "soft", "crisp", "deep", "glow"]).toContain(recipe.shadow);
      expect(["flat", "layered", "glass", "outlined"]).toContain(recipe.surface);
      expect(["square", "rounded", "pill"]).toContain(recipe.button.shape);
      for (const radius of Object.values(recipe.radius)) expect(Number.isFinite(radius)).toBe(true);
      expect(recipe.radius.xl).toBeGreaterThanOrEqual(recipe.radius.lg);
    }
  });

  it("cumple los invariantes de las recetas del catálogo (catalog.test.ts)", () => {
    for (const theme of themePresets) {
      const recipe = themeToRecipe(theme);
      const { sm, md, lg, xl } = recipe.radius;
      expect(sm, theme.id).toBeGreaterThanOrEqual(0);
      expect(sm <= md && md <= lg && lg <= xl, `${theme.id} radios monótonos`).toBe(true);
      expect(xl, theme.id).toBeLessThanOrEqual(40);
      expect(recipe.borderWidth, theme.id).toBeLessThanOrEqual(4);
      for (const weight of [recipe.headingWeight, recipe.button.weight]) expect(weight % 100, theme.id).toBe(0);
      expect(Math.abs(recipe.headingTracking), theme.id).toBeLessThanOrEqual(0.06);
      if (recipe.surface === "outlined") expect(recipe.borderWidth, theme.id).toBeGreaterThan(0);
    }
  });

  it("un campo más redondo que la card se expresa con el botón píldora, no con un radio no monótono", () => {
    const cupcake = themeToRecipe(preset("daisyui-cupcake"));
    expect(cupcake.button.shape).toBe("pill");
    expect(cupcake.radius.md).toBeLessThanOrEqual(cupcake.radius.lg);
  });

  it("neo-brutalism: sombra dura, superficie con contorno, esquinas rectas y arquetipo neubrutal", () => {
    const recipe = themeToRecipe(preset("tweakcn-neo-brutalism"));
    expect(recipe.shadow).toBe("crisp");
    expect(recipe.surface).toBe("outlined");
    expect(recipe.button.shape).toBe("square");
    expect(recipe.radius).toEqual({ sm: 0, md: 0, lg: 0, xl: 0 });
    expect(recipe.archetypeId).toBe("soft-neubrutal");
  });

  it("cupcake (daisyUI): botones píldora, borde de 2 px y modo claro", () => {
    const recipe = themeToRecipe(preset("daisyui-cupcake"));
    expect(recipe.button.shape).toBe("pill");
    expect(recipe.borderWidth).toBe(2);
    expect(recipe.preferredMode).toBe("light");
  });

  it("modern-minimal (tweakcn): sin sombra, plano, sin preferencia de modo", () => {
    const recipe = themeToRecipe(preset("tweakcn-modern-minimal"));
    expect(recipe.shadow).toBe("none");
    expect(recipe.surface).toBe("flat");
    expect(recipe.preferredMode).toBeUndefined();
  });

  it("respeta el tracking del tema y hereda el del arquetipo cuando no lo trae", () => {
    expect(themeToRecipe(preset("tweakcn-violet-bloom")).headingTracking).toBe(-0.025);
    const plain = themeToRecipe(preset("daisyui-nord"));
    const archetype = styleRecipes.find((recipe) => recipe.id === plain.archetypeId);
    expect(plain.headingTracking).toBe(archetype?.headingTracking);
  });
});

describe("arquetipos", () => {
  it("cada tema tiene un arquetipo asignado a mano que existe (los nuevos del upstream hay que clasificarlos)", () => {
    const unassigned = themePresets.filter((theme) => themeArchetypes[theme.id] === undefined).map((theme) => theme.id);
    expect(unassigned).toEqual([]);
    for (const [themeId, archetypeId] of Object.entries(themeArchetypes)) {
      expect(getThemePreset(themeId), `${themeId} ya no existe`).toBeDefined();
      expect(archetypeIds.has(archetypeId), `${themeId} → ${archetypeId}`).toBe(true);
    }
  });

  it("la asignación manual manda; la forma es solo el respaldo", () => {
    expect(archetypeOf(preset("daisyui-cyberpunk")).id).toBe("retro-futurist");
    expect(nearestArchetype(preset("tweakcn-neo-brutalism")).id).toBe("soft-neubrutal");
    const unclassified = { ...preset("daisyui-cupcake"), id: "daisyui-no-existe" };
    expect(archetypeOf(unclassified).id).toBe(nearestArchetype(unclassified).id);
  });

  it("nearestArchetype es determinista", () => {
    for (const theme of themePresets) expect(nearestArchetype(theme).id).toBe(nearestArchetype(theme).id);
  });

  it("reparte todos los temas entre arquetipos que existen, sin perder ninguno", () => {
    const groups = themesByArchetype();
    expect(new Set(Object.keys(groups))).toEqual(archetypeIds);
    expect(Object.values(groups).flat()).toHaveLength(themePresets.length);
  });
});

describe("themeShapes (bundle principal)", () => {
  it("es themePresets sin colores, en el mismo orden", () => {
    expect(themeShapes.map((shape) => shape.id)).toEqual(themePresets.map((theme) => theme.id));
    for (const shape of themeShapes) {
      expect(shape).not.toHaveProperty("colors");
      const { colors: _colors, ...rest } = preset(shape.id);
      expect(shape).toEqual(rest);
    }
  });
});

describe("resolveRecipe", () => {
  it("sin tema devuelve la receta; un id desconocido, undefined", () => {
    expect(resolveRecipe("soft-ui")?.id).toBe("soft-ui");
    expect(resolveRecipe("no-existe")).toBeUndefined();
  });

  it("con un tema de ese arquetipo devuelve la receta del tema", () => {
    const recipe = resolveRecipe("playful", "daisyui-cupcake");
    expect(recipe?.id).toBe("daisyui-cupcake");
    expect(recipe).toBe(getThemeRecipe("daisyui-cupcake"));
  });

  it("ignora un tema de otro arquetipo o desconocido (un themeId que quedó atrás)", () => {
    expect(resolveRecipe("editorial", "daisyui-cupcake")?.id).toBe("editorial");
    expect(resolveRecipe("playful", "daisyui-no-existe")?.id).toBe("playful");
  });

  it("getThemeRecipe está memoizada y es la de themeToRecipe", () => {
    expect(getThemeRecipe("tweakcn-neo-brutalism")).toBe(getThemeRecipe("tweakcn-neo-brutalism"));
    expect(getThemeRecipe("tweakcn-neo-brutalism")).toEqual(themeToRecipe(preset("tweakcn-neo-brutalism")));
    expect(getThemeRecipe("nope")).toBeUndefined();
  });
});
