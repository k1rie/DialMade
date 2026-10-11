// Fixtures of the quality eval: for each fictional brand ONE document with two screens, a landing of 7 blocks and an
// app dashboard (sidebar frame + 4 blocks). Same layouts for every brand and model, so only the model changes.
import { compileThemeVars, createDesignDoc, safeParseDesignDoc, formatIssues, type DesignDoc } from "@dialmade/doc";
import { emptyLayout, type AppShell, type LayoutDoc, type LibraryBlockType } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc, visibleProps } from "@dialmade/sections";
import { draftTexts } from "../src/input";
import { themeColorsFromVars, type ThemeColors } from "../src/contrast";
import type { EvalBrand } from "./fixtures";

export const LANDING_ID = "s-home";
export const DASH_ID = "s-dash";

const block = (type: LibraryBlockType, label: string, col: number, row: number, w: number, h: number, z: number, extra: { count?: number; note?: string } = {}) => ({
  type,
  label,
  rect: { col, row, w, h },
  z,
  ...extra,
});

/** Landing: navbar, hero, features ×3, testimonials ×3, pricing ×3, cta, footer. */
export function landingLayout(locale: "es" | "en"): LayoutDoc {
  const es = locale === "es";
  const layout = emptyLayout();
  layout.blocks = {
    "b-nav": block("navbar", es ? "Navegación" : "Navigation", 0, 0, 12, 8, 1),
    "b-hero": block("hero", "Hero", 0, 8, 12, 64, 2),
    "b-features": block("features", es ? "Ventajas" : "Features", 0, 72, 12, 44, 3, { count: 3 }),
    "b-proof": block("testimonials", es ? "Opiniones" : "Testimonials", 0, 116, 12, 36, 4, { count: 3 }),
    "b-pricing": block("pricing", es ? "Precios" : "Pricing", 0, 152, 12, 56, 5, { count: 3 }),
    "b-cta": block("cta", es ? "Llamada a la acción" : "Call to action", 0, 208, 12, 24, 6),
    "b-footer": block("footer", es ? "Pie" : "Footer", 0, 232, 12, 20, 7),
  } as LayoutDoc["blocks"];
  return layout;
}

/** Dashboard: KPIs, a chart next to the activity feed, and a table. The sidebar and header are the app frame. */
export function dashboardLayout(locale: "es" | "en"): LayoutDoc {
  const es = locale === "es";
  const layout = emptyLayout();
  layout.blocks = {
    "b-kpis": block("kpis", es ? "Indicadores" : "Key metrics", 0, 0, 12, 14, 1, { count: 4 }),
    "b-chart": block("chart", es ? "Evolución" : "Trend", 0, 14, 8, 40, 2, { note: es ? "ingresos de las últimas 8 semanas" : "cash in vs cash out, last 8 weeks" }),
    "b-activity": block("activity", es ? "Actividad reciente" : "Recent activity", 8, 14, 4, 40, 3, { count: 5 }),
    "b-table": block("table", es ? "Próximas citas" : "Open invoices", 0, 54, 12, 44, 4, { count: 6, note: es ? "cliente, servicio, hora y estado" : "client, amount, due date and status" }),
  } as LayoutDoc["blocks"];
  return layout;
}

const SHELL: AppShell = { nav: "sidebar", header: true };

export type QualityDoc = {
  doc: DesignDoc;
  theme: ThemeColors;
  screens: Record<string, { layoutCss: string; kind: "landing" | "app"; draftOf: (blockId: string) => string[] }>;
};

export function qualityDoc(brand: EvalBrand): QualityDoc {
  const base = createDesignDoc({
    brand: { name: brand.name, tagline: brand.tagline, seeds: { primary: brand.primary, ...(brand.secondary && { secondary: brand.secondary }) } },
    brief: { productType: brand.productType, focus: "landing", locale: brand.locale, recipeId: brand.recipeId },
    provenance: { createdAt: "2026-10-10T12:00:00.000Z", layoutBrief: { description: brand.description, source: "fallback" } },
  });
  const ctx = contentContextFromDoc(base);
  const es = brand.locale === "es";
  const defs = [
    { id: LANDING_ID, name: es ? "Inicio" : "Home", kind: "landing" as const, route: "/", layout: landingLayout(brand.locale), shell: null },
    { id: DASH_ID, name: es ? "Panel" : "Dashboard", kind: "app" as const, route: "/app", layout: dashboardLayout(brand.locale), shell: SHELL },
  ];
  const screens: Record<string, unknown> = {};
  const css: Record<string, string> = {};
  for (const def of defs) {
    const built = buildPageFromLayout(def.layout, def.kind, def.shell, ctx, { screenId: def.id, screenTitle: def.name });
    const blocks = Object.fromEntries(Object.entries(def.layout.blocks).map(([id, b]) => [id, built.fingerprints[id] ? { ...b, generated: built.fingerprints[id] } : b]));
    screens[def.id] = { id: def.id, name: def.name, kind: def.kind, route: def.route, shell: def.shell, layout: { ...def.layout, blocks }, page: built.page };
    css[def.id] = built.css;
  }
  const parsed = safeParseDesignDoc({ ...base, screens, screenOrder: defs.map((d) => d.id) });
  if (!parsed.success) throw new Error(formatIssues(parsed.issues));
  const doc = parsed.data;
  const theme = {
    light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })),
    dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })),
  };
  return {
    doc,
    theme,
    screens: Object.fromEntries(
      defs.map((def) => [
        def.id,
        {
          layoutCss: css[def.id]!,
          kind: def.kind,
          draftOf: (blockId: string) => {
            const element = doc.screens[def.id]!.page.elements[blockId];
            return element ? draftTexts(visibleProps(element)) : [];
          },
        },
      ]),
    ),
  };
}
