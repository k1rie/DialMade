// Fixtures of the variety eval (spec §4.4): ONE landing layout and fictional brands (no real names or logos).
import { compileThemeVars, createDesignDoc, safeParseDesignDoc, formatIssues, type DesignDoc } from "@dialmade/doc";
import { emptyLayout, type LayoutDoc, type LibraryBlockType } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc, visibleProps } from "@dialmade/sections";
import { draftTexts } from "../src/input";
import { themeColorsFromVars, type ThemeColors } from "../src/contrast";

export type EvalBrand = {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  secondary?: string;
  productType: string;
  recipeId: string;
  locale: "es" | "en";
  description: string;
};

/** Three fictional brands with separated hues, product types and recipes. */
export const BRANDS: readonly EvalBrand[] = [
  {
    id: "brisa",
    name: "Brisa",
    tagline: "Tu barbería, sin llamadas",
    primary: "#0f766e",
    secondary: "#f59e0b",
    productType: "saas-general",
    recipeId: "soft-ui",
    locale: "es",
    description: "app de reservas para barberías: agenda semanal, clientes, recordatorios y pagos",
  },
  {
    id: "ollaria",
    name: "Ollaria",
    tagline: "Handmade stoneware, fired in small batches",
    primary: "#b4532a",
    productType: "e-commerce",
    recipeId: "editorial",
    locale: "en",
    description: "online shop of a ceramics studio that also sells weekend pottery workshops",
  },
  {
    id: "vectora",
    name: "Vectora",
    tagline: "Cash-flow forecasts for freelancers",
    primary: "#4f46e5",
    secondary: "#10b981",
    productType: "fintech-crypto",
    recipeId: "tech-precision",
    locale: "en",
    description: "invoicing and cash-flow forecasting for freelancers and small studios, with bank sync",
  },
];

const row = (type: LibraryBlockType, label: string, rowAt: number, h: number, z: number, extra: { count?: number; note?: string } = {}) => ({
  type,
  label,
  rect: { col: 0, row: rowAt, w: 12, h },
  z,
  ...extra,
});

/** The same 5-block landing for every brand. */
export function evalLayout(locale: "es" | "en"): LayoutDoc {
  const layout = emptyLayout();
  const es = locale === "es";
  layout.blocks = {
    "b-nav": row("navbar", es ? "Navegación" : "Navigation", 0, 8, 1),
    "b-hero": row("hero", "Hero", 8, 64, 2),
    "b-features": row("features", es ? "Ventajas" : "Features", 72, 44, 3, { count: 3 }),
    "b-pricing": row("pricing", es ? "Precios" : "Pricing", 116, 56, 4, { count: 3 }),
    "b-footer": row("footer", es ? "Pie" : "Footer", 172, 20, 5),
  } as LayoutDoc["blocks"];
  return layout;
}

export type EvalDoc = { doc: DesignDoc; screenId: string; layoutCss: string; theme: ThemeColors; draftOf: (id: string) => string[] };

export function evalDoc(brand: EvalBrand): EvalDoc {
  const base = createDesignDoc({
    brand: { name: brand.name, tagline: brand.tagline, seeds: { primary: brand.primary, ...(brand.secondary && { secondary: brand.secondary }) } },
    brief: { productType: brand.productType, focus: "landing", locale: brand.locale, recipeId: brand.recipeId },
    provenance: { createdAt: "2026-10-10T12:00:00.000Z", layoutBrief: { description: brand.description, source: "fallback" } },
  });
  const layout = evalLayout(brand.locale);
  const ctx = contentContextFromDoc(base);
  const screenId = "s-home";
  const built = buildPageFromLayout(layout, "landing", null, ctx, { screenId, screenTitle: brand.locale === "es" ? "Inicio" : "Home" });
  const blocks = Object.fromEntries(Object.entries(layout.blocks).map(([id, block]) => [id, built.fingerprints[id] ? { ...block, generated: built.fingerprints[id] } : block]));
  const parsed = safeParseDesignDoc({
    ...base,
    screens: { [screenId]: { id: screenId, name: brand.locale === "es" ? "Inicio" : "Home", kind: "landing", route: "/", shell: null, layout: { ...layout, blocks }, page: built.page } },
    screenOrder: [screenId],
  });
  if (!parsed.success) throw new Error(formatIssues(parsed.issues));
  const doc = parsed.data;
  const theme = {
    light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })),
    dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })),
  };
  const page = doc.screens[screenId]!.page;
  return {
    doc,
    screenId,
    layoutCss: built.css,
    theme,
    draftOf: (id) => {
      const element = page.elements[id];
      return element ? draftTexts(visibleProps(element)) : [];
    },
  };
}

/** The same document painted in grays: the variety metric must not count the palette. */
export function grayDoc(doc: DesignDoc): DesignDoc {
  return createDesignDoc({
    brand: { name: doc.brand.name, seeds: { primary: "#6b6b6b" }, achromatic: true },
    brief: { productType: doc.brief.productType, focus: "landing", locale: doc.brief.locale, recipeId: doc.brief.recipeId, pairingId: doc.brief.pairingId },
  });
}
