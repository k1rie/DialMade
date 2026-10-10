import { describe, expect, it } from "vitest";

import { fonts, getFontFamily, isWeightAvailable, styleSources, typographySources } from "./sources";
import {
  firstUseQuestion,
  GENERIC_PRODUCT_ID,
  LANDING_SECTION_TYPES,
  landingLayouts,
  motionTiers,
  OUTPUT_KINDS,
  outputKindOptions,
  productChips,
  productGroups,
  productTypes,
  styleRecipes,
  typographyPairings,
} from "./index";

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function filled(text: { es: string; en: string }): boolean {
  return text.es.trim().length > 0 && text.en.trim().length > 0;
}

const styleIds = new Set(styleSources.map((style) => style.id));
const sectionTypes = new Set<string>(LANDING_SECTION_TYPES);

describe("productTypes", () => {
  it("tiene los 192 tipos de uupm con ids únicos en kebab-case", () => {
    expect(productTypes).toHaveLength(192);
    const ids = productTypes.map((product) => product.id);
    expect(duplicates(ids)).toEqual([]);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(ids).not.toContain(GENERIC_PRODUCT_ID);
  });

  it("tiene etiquetas es/en, grupo conocido y keywords", () => {
    const groups = new Set<string>(productGroups.map((group) => group.id));
    for (const product of productTypes) {
      expect(filled(product.label), product.id).toBe(true);
      expect(groups.has(product.group), `${product.id} → ${product.group}`).toBe(true);
      expect(product.keywords.length, product.id).toBeGreaterThan(0);
      expect(duplicates(product.keywords), product.id).toEqual([]);
    }
  });

  it("referencia estilos que existen y nunca prohíbe uno recomendado", () => {
    for (const product of productTypes) {
      expect(duplicates(product.doNotUseStyles), product.id).toEqual([]);
      for (const id of [...product.doNotUseStyles, ...(product.styleIds ?? [])]) {
        expect(styleIds.has(id), `${product.id} → ${id}`).toBe(true);
      }
      const recommended = new Set(product.styleIds);
      expect(product.doNotUseStyles.filter((id) => recommended.has(id)), product.id).toEqual([]);
    }
  });

  it("resuelve el patrón de landing contra un layout y descarta los valores N/A", () => {
    const covered = new Set(landingLayouts.flatMap((layout) => layout.patternIds ?? []));
    for (const product of productTypes) {
      if (product.landingPatternId) expect(covered.has(product.landingPatternId), product.id).toBe(true);
      expect(product.dashboardStyle ?? "", product.id).not.toMatch(/^n\/a/i);
    }
    expect(productTypes.filter((product) => !product.landingPatternId).map((product) => product.id)).toEqual([
      "financial-dashboard",
      "analytics-dashboard",
    ]);
  });

  it("no arrastra columnas de popularidad ni de tendencia", () => {
    for (const record of [...productTypes, ...fonts, ...typographySources]) {
      for (const key of Object.keys(record)) expect(key).not.toMatch(/popular|trend/i);
    }
  });
});

describe("landingLayouts", () => {
  it("son 6, con ids únicos y textos es/en", () => {
    expect(landingLayouts).toHaveLength(6);
    expect(duplicates(landingLayouts.map((layout) => layout.id))).toEqual([]);
    for (const layout of landingLayouts) {
      expect(filled(layout.label), layout.id).toBe(true);
      if (layout.description) expect(filled(layout.description), layout.id).toBe(true);
    }
  });

  it("solo usan secciones del catálogo landing.*, sin repetir, de navbar a footer", () => {
    for (const layout of landingLayouts) {
      for (const section of layout.sections) expect(sectionTypes.has(section), `${layout.id} → ${section}`).toBe(true);
      expect(duplicates(layout.sections), layout.id).toEqual([]);
      expect(layout.sections[0]).toBe("landing.navbar");
      expect(layout.sections.at(-1)).toBe("landing.footer");
      expect(layout.sections).toContain("landing.hero");
      expect(layout.sections).toContain("landing.cta");
    }
  });

  it("reparten los 34 patrones de landing.csv sin solaparse", () => {
    const patterns = landingLayouts.flatMap((layout) => layout.patternIds ?? []);
    expect(patterns).toHaveLength(34);
    expect(duplicates(patterns)).toEqual([]);
    for (const layout of landingLayouts) {
      expect(layout.sourcePatternId && layout.patternIds?.includes(layout.sourcePatternId), layout.id).toBe(true);
    }
  });

  it("alguno usa cada tipo de sección", () => {
    const used = new Set(landingLayouts.flatMap((layout) => layout.sections));
    expect([...sectionTypes].filter((section) => !used.has(section))).toEqual([]);
  });
});

describe("motionTiers", () => {
  it("son subtle, standard y expressive, cada vez más largos", () => {
    expect(motionTiers.map((tier) => tier.id)).toEqual(["subtle", "standard", "expressive"]);
    for (const tier of motionTiers) {
      const { fast, base, slow } = tier.durations;
      expect(fast).toBeGreaterThan(0);
      expect(fast).toBeLessThan(base);
      expect(base).toBeLessThan(slow);
      expect(slow).toBeLessThanOrEqual(900);
      expect(tier.ease).toMatch(/^cubic-bezier\(-?[\d.]+, -?[\d.]+, -?[\d.]+, -?[\d.]+\)$/);
      expect(filled(tier.label), tier.id).toBe(true);
    }
    const bases = motionTiers.map((tier) => tier.durations.base);
    expect([...bases].sort((a, b) => a - b)).toEqual(bases);
  });
});

describe("styleRecipes", () => {
  it("son 12 con ids únicos y textos es/en", () => {
    expect(styleRecipes).toHaveLength(12);
    expect(duplicates(styleRecipes.map((recipe) => recipe.id))).toEqual([]);
    for (const recipe of styleRecipes) {
      expect(filled(recipe.label) && filled(recipe.description), recipe.id).toBe(true);
      expect(recipe.tags.length, recipe.id).toBeGreaterThan(0);
    }
  });

  it("citan estilos activos de uupm y cada estilo apunta a una sola receta", () => {
    const owners: string[] = [];
    for (const recipe of styleRecipes) {
      const cited = [recipe.sourceStyleId, ...(recipe.relatedStyleIds ?? [])].filter((id): id is string => Boolean(id));
      for (const id of cited) expect(styleIds.has(id), `${recipe.id} → ${id}`).toBe(true);
      owners.push(...cited);
    }
    expect(duplicates(owners)).toEqual([]);
  });

  it("tienen valores coherentes", () => {
    const pairings = new Set(typographyPairings.map((pairing) => pairing.id));
    for (const recipe of styleRecipes) {
      const { sm, md, lg, xl } = recipe.radius;
      expect(sm, recipe.id).toBeGreaterThanOrEqual(0);
      expect(sm <= md && md <= lg && lg <= xl, recipe.id).toBe(true);
      expect(xl, recipe.id).toBeLessThanOrEqual(40);
      expect(recipe.borderWidth, recipe.id).toBeGreaterThanOrEqual(0);
      expect(recipe.borderWidth, recipe.id).toBeLessThanOrEqual(4);
      for (const weight of [recipe.headingWeight, recipe.button.weight]) {
        expect(weight % 100, recipe.id).toBe(0);
        expect(weight >= 100 && weight <= 900, recipe.id).toBe(true);
      }
      expect(Math.abs(recipe.headingTracking), recipe.id).toBeLessThanOrEqual(0.06);
      if (recipe.surface === "outlined") expect(recipe.borderWidth, recipe.id).toBeGreaterThan(0);
      if (recipe.pairingId) expect(pairings.has(recipe.pairingId), recipe.id).toBe(true);
    }
  });
});

describe("typographyPairings", () => {
  it("son 10 con ids únicos", () => {
    expect(typographyPairings).toHaveLength(10);
    expect(duplicates(typographyPairings.map((pairing) => pairing.id))).toEqual([]);
  });

  it("tienen una URL css2 válida que coincide con familias y pesos", () => {
    for (const pairing of typographyPairings) {
      const url = new URL(pairing.googleFontsUrl);
      expect(url.origin + url.pathname, pairing.id).toBe("https://fonts.googleapis.com/css2");
      expect(url.searchParams.get("display"), pairing.id).toBe("swap");
      expect([...url.searchParams.keys()].filter((key) => key !== "family" && key !== "display")).toEqual([]);

      const expected = new Map<string, Set<number>>();
      for (const { family, weights } of [pairing.heading, pairing.body]) {
        const merged = expected.get(family) ?? new Set<number>();
        for (const weight of weights) merged.add(weight);
        expected.set(family, merged);
      }

      const requested = url.searchParams.getAll("family");
      expect(requested, pairing.id).toHaveLength(expected.size);
      for (const entry of requested) {
        const match = /^([A-Za-z0-9 ]+):wght@(\d{3}(?:;\d{3})*)$/.exec(entry);
        expect(match, `${pairing.id}: ${entry}`).not.toBeNull();
        const [, family = "", list = ""] = match ?? [];
        const weights = list.split(";").map(Number);
        expect([...weights].sort((a, b) => a - b), entry).toEqual(weights);
        expect(new Set(weights).size, entry).toBe(weights.length);
        expect(weights, entry).toEqual([...(expected.get(family) ?? [])].sort((a, b) => a - b));
      }
    }
  });

  it("solo piden familias y pesos que Google Fonts ofrece", () => {
    for (const pairing of typographyPairings) {
      for (const { family, weights, fallback } of [pairing.heading, pairing.body]) {
        expect(getFontFamily(family), `${pairing.id} → ${family}`).toBeDefined();
        for (const weight of weights) expect(isWeightAvailable(family, weight), `${family} ${weight}`).toBe(true);
        expect(fallback, pairing.id).toMatch(/(sans-serif|serif|monospace)$/);
      }
      expect(pairing.mood.length, pairing.id).toBeGreaterThan(0);
      expect(filled(pairing.label), pairing.id).toBe(true);
      if (pairing.sourcePairingId) {
        expect(typographySources.some((source) => source.id === pairing.sourcePairingId), pairing.id).toBe(true);
      }
    }
  });

  it("cubren neo-grotesca tipo Apple, serif editorial, geométrica y mono", () => {
    const category = (family: string) => getFontFamily(family)?.category;
    expect(typographyPairings.some((p) => p.heading.family === "Inter" && p.body.family === "Inter")).toBe(true);
    expect(typographyPairings.some((p) => category(p.heading.family) === "serif" && p.mood.includes("editorial"))).toBe(true);
    expect(typographyPairings.some((p) => p.mood.includes("geometric"))).toBe(true);
    expect(typographyPairings.some((p) => category(p.heading.family) === "monospace")).toBe(true);
  });
});

describe("productChips, grupos y tipos de salida", () => {
  it("hay 12 chips de tipos reales más «generic»", () => {
    expect(productChips).toHaveLength(13);
    expect(duplicates(productChips.map((chip) => chip.id))).toEqual([]);
    expect(productChips.at(-1)?.id).toBe(GENERIC_PRODUCT_ID);
    const ids = new Set(productTypes.map((product) => product.id));
    for (const chip of productChips.slice(0, -1)) expect(ids.has(chip.id), chip.id).toBe(true);
    for (const chip of productChips) expect(filled(chip.label), chip.id).toBe(true);
  });

  it("cada grupo tiene etiqueta y al menos un producto", () => {
    expect(duplicates(productGroups.map((group) => group.id))).toEqual([]);
    for (const group of productGroups) {
      expect(filled(group.label), group.id).toBe(true);
      expect(productTypes.some((product) => product.group === group.id), group.id).toBe(true);
    }
  });

  it("nombra las 3 salidas y la pregunta las cubre todas", () => {
    expect(outputKindOptions.map((option) => option.id)).toEqual(OUTPUT_KINDS);
    expect(outputKindOptions.map((option) => option.label)).toEqual([
      { es: "Guía de estilo", en: "Style guide" },
      { es: "Landing page", en: "Landing page" },
      { es: "Dashboard y componentes", en: "Dashboard & components" },
    ]);
    expect(new Set(firstUseQuestion.options.map((option) => option.kind))).toEqual(new Set(OUTPUT_KINDS));
  });
});

describe("índices de referencia", () => {
  it("styleSources no incluye estilos deprecados", () => {
    expect(duplicates(styleSources.map((style) => style.id))).toEqual([]);
    expect(styleSources.filter((style) => style.status === "deprecated")).toEqual([]);
  });

  it("fonts tiene familias únicas con pesos ordenados", () => {
    expect(duplicates(fonts.map((font) => font.family))).toEqual([]);
    for (const font of fonts) expect([...font.weights].sort((a, b) => a - b)).toEqual(font.weights);
  });
});
