import { LAYOUT_PAGE_ID } from "../constants";
import { addPage, createDesignDoc, type CreateDesignDocInput } from "../doc";
import type { DesignDoc, Page, ScreenInput, ScreenLayoutBlock } from "../schema";

export const CREATED_AT = "2026-10-09T12:00:00.000Z";

export const acmeInput: CreateDesignDocInput = {
  brand: { name: "Acme Cloud", tagline: "Ship faster, sleep better", seeds: { primary: "#3A5BD9", secondary: "#f0a024" } },
  brief: { productType: "saas-general", focus: "landing", locale: "en" },
  provenance: { createdAt: CREATED_AT },
};

/** A doc with every page, the landing focused. */
export function acmeDoc(): DesignDoc {
  let doc = createDesignDoc(acmeInput);
  doc = addPage(doc, "landing");
  doc = addPage(doc, "brand");
  doc = addPage(doc, "app");
  return doc;
}

export const monoDoc = (): DesignDoc =>
  createDesignDoc({
    brand: { name: "Noir", seeds: { primary: "#171717" } },
    brief: { productType: "developer-tool-ide", focus: "app", locale: "es" },
    provenance: { createdAt: CREATED_AT },
  });

export const IMPORT_SHA = "3f".repeat(32);

/** Acme after importing its (fictional) `globals.css`: accepted values in `tokens`, locks and provenance. */
export const importedInput: CreateDesignDocInput = {
  ...acmeInput,
  brief: {
    ...acmeInput.brief,
    locks: ["/tokens/color/light/primary", "/tokens/color/dark/border", "/tokens/radius/md", "/tokens/typography/heading", "pairingId"],
  },
  tokens: {
    color: {
      light: { primary: "#2f4fd0", "primary-foreground": "#ffffff" },
      dark: { border: "#ffffff1a", input: "#ffffff26" },
    },
    radius: { md: 10 },
    space: { "4": 18 },
    borderWidth: 1,
    typography: {
      heading: { family: "Brand Grotesk", source: "local", substitute: "Arimo", fallback: ["system-ui", "sans-serif"], weights: [600, 700] },
      body: { family: "Inter", source: "google", weights: [400, 500, 600] },
      scale: { h1: { lineHeight: 1.1, letterSpacing: -0.02, weight: 700 }, body: { lineHeight: 1.5, weight: 400 } },
    },
    elevation: { sm: [{ x: 0, y: 1, blur: 2, spread: 0, color: "#000000", alpha: 0.05 }], lg: [] },
  },
  provenance: {
    createdAt: CREATED_AT,
    imports: [
      {
        sourceId: "src-1",
        kind: "css",
        format: "shadcn-oklch",
        fileName: "globals.css",
        sha256: IMPORT_SHA,
        bytes: 4096,
        parser: "css@1.0.0",
        ownership: "own",
        rightsConfirmedAt: CREATED_AT,
        fields: [
          { path: "/tokens/color/light/primary", locator: "globals.css:12 --primary", confidence: "exact", method: "declared" },
          { path: "/tokens/color/dark/border", locator: "globals.css:58 --border", confidence: "exact", method: "declared" },
          { path: "/tokens/radius/md", locator: "globals.css:40 --radius", confidence: "high", method: "declared" },
          { path: "/tokens/typography/heading/family", locator: "globals.css:129 --font-heading", confidence: "medium", method: "named" },
        ],
        dismissed: ["globals.css:20 --chart-1"],
      },
    ],
  },
};

export const importedDoc = (): DesignDoc => createDesignDoc(importedInput);

// ── screens (DesignDoc v2) ─────────────────────────────────────────────────────────
// Pages are written by hand here (sections' `buildPageFromLayout` makes the real ones): element ids are
// the block ids, `layout` is the scope region, `r-…` the inferred regions. A media inside the hero has
// no element of its own (the hero absorbs it).

type FixtureBlock = ScreenLayoutBlock;
type FixtureElement = { type: string; props?: Record<string, unknown>; children?: string[] };

const block = (type: FixtureBlock["type"], label: string, rect: FixtureBlock["rect"], z: number, extra: Partial<FixtureBlock> = {}): FixtureBlock => ({
  type,
  label,
  rect,
  z,
  ...extra,
});

function fixturePage(kind: "landing" | "app", elements: Record<string, FixtureElement>): Page {
  return {
    kind,
    layoutId: LAYOUT_PAGE_ID,
    root: "root",
    elements: Object.fromEntries(
      Object.entries(elements).map(([id, element]) => [id, { type: element.type, props: element.props ?? {}, children: element.children ?? [] }]),
    ),
  };
}

const homeScreen: ScreenInput = {
  id: "s-home",
  name: "Inicio",
  kind: "landing",
  route: "/",
  shell: null,
  layout: {
    version: 1,
    columns: 12,
    rowUnit: 8,
    blocks: {
      "b-nav": block("navbar", "Barra de navegación", { col: 0, row: 0, w: 12, h: 8 }, 1, { linkTo: "s-dash" }),
      "b-hero": block("hero", "Hero", { col: 0, row: 10, w: 12, h: 60 }, 2, { note: "con captura del producto", pinned: ["/title"] }),
      "b-shot": block("media", "Captura", { col: 6, row: 14, w: 6, h: 50 }, 3, { parentId: "b-hero" }),
      "b-feat": block("features", "Características", { col: 0, row: 74, w: 12, h: 40 }, 4, {
        count: 3,
        generated: { type: "features", w: 12, h: 40, count: 3, variant: "default" },
      }),
      "b-cal": block("calendar", "Calendario", { col: 0, row: 118, w: 8, h: 50 }, 5, { note: 'calendario "semanal"' }),
      "b-list": block("list", "Próximos", { col: 8, row: 118, w: 4, h: 50 }, 6, { responsive: { mobile: { hidden: true } } }),
      "b-cta": block("cta", "Llamada", { col: 0, row: 172, w: 12, h: 24 }, 7, { linkTo: "s-settings" }),
      "b-foot": block("footer", "Pie", { col: 0, row: 200, w: 12, h: 20 }, 8, { hidden: true }),
    },
  },
  page: fixturePage("landing", {
    root: { type: "landing.page", children: ["layout"] },
    layout: { type: "ui.region", props: { role: "scope" }, children: ["b-nav", "b-hero", "b-feat", "r-row", "b-cta", "b-foot"] },
    "b-nav": { type: "landing.navbar", props: { variant: "simple", links: [{ label: "Producto", href: "#" }, { label: "Panel", href: "/dashboard", screen: "s-dash", route: "/dashboard" }] } },
    "b-hero": { type: "landing.hero", props: { variant: "split", title: "Lanza más rápido", subtitle: "Despliega en segundos" } },
    "b-feat": { type: "landing.features", props: { items: [{ title: "Rápido" }, { title: "Seguro" }, { title: "Simple" }] } },
    "r-row": { type: "ui.region", props: { role: "inferred" }, children: ["b-cal", "b-list"] },
    "b-cal": { type: "ui.calendar", props: { variant: "week", title: "Agenda" } },
    "b-list": { type: "ui.list", props: { title: "Próximos eventos" } },
    "b-cta": { type: "landing.cta", props: { variant: "banner", title: "Empieza hoy" } },
    "b-foot": { type: "landing.footer" },
  }),
};
homeScreen.page.hidden = ["b-foot"];

const dashboardScreen: ScreenInput = {
  id: "s-dash",
  name: "Dashboard",
  kind: "app",
  route: "/dashboard",
  shell: { nav: "sidebar", header: true },
  layout: {
    version: 1,
    columns: 12,
    rowUnit: 8,
    blocks: {
      "b-kpis": block("kpis", "KPIs", { col: 0, row: 0, w: 12, h: 14 }, 1, { count: 4 }),
      // A bento (no clean cut): a grid region with grid-template-areas.
      "b-a": block("chart", "Gráfica", { col: 0, row: 16, w: 6, h: 40 }, 2),
      "b-b": block("activity", "Actividad", { col: 6, row: 16, w: 6, h: 20 }, 3),
      "b-c": block("table", "Tabla", { col: 6, row: 36, w: 3, h: 20 }, 4),
      "b-d": block("cards", "Tarjetas", { col: 9, row: 36, w: 3, h: 40 }, 5, { count: 2, linkTo: "s-settings" }),
      "b-e": block("text", "Texto", { col: 0, row: 56, w: 3, h: 20 }, 6),
      "b-f": block("list", "Lista", { col: 3, row: 56, w: 6, h: 20 }, 7),
    },
  },
  page: fixturePage("app", {
    root: { type: "app.page", children: ["shell"] },
    shell: { type: "app.shell", props: { showPageHeader: true }, children: ["layout"] },
    layout: { type: "ui.region", props: { role: "scope" }, children: ["b-kpis", "r-bento"] },
    "b-kpis": { type: "app.kpiRow", props: { items: [{ label: "MRR", value: "12k" }] } },
    "r-bento": { type: "ui.region", props: { role: "inferred" }, children: ["b-a", "b-b", "b-c", "b-d", "b-e", "b-f"] },
    "b-a": { type: "app.chartCard", props: { variant: "area", title: "Ingresos", series: [1, 2, 3] } },
    "b-b": { type: "app.activity", props: { title: "Actividad" } },
    "b-c": { type: "app.dataTable", props: { title: "Clientes" } },
    "b-d": { type: "ui.cards", props: { items: [{ title: "Plan", linkTo: "s-settings" }, { title: "Equipo" }] } },
    "b-e": { type: "ui.text", props: { title: "Notas" } },
    "b-f": { type: "ui.list", props: { title: "Tareas" } },
  }),
};

const settingsScreen: ScreenInput = {
  id: "s-settings",
  name: "Ajustes",
  kind: "app",
  route: "/ajustes",
  shell: { nav: "sidebar", header: false },
  layout: {
    version: 1,
    columns: 12,
    rowUnit: 8,
    blocks: {
      "b-settings": block("settings", "Ajustes", { col: 0, row: 0, w: 8, h: 60 }, 1, {
        pinned: ["/title", "/fields/0/label"],
        generated: { type: "settings", w: 8, h: 60, variant: "stacked" },
      }),
      "b-form": block("form", "Formulario", { col: 8, row: 0, w: 4, h: 40 }, 2, { note: "cambiar contraseña" }),
    },
  },
  page: fixturePage("app", {
    root: { type: "app.page", children: ["shell"] },
    shell: { type: "app.shell", props: { showPageHeader: false }, children: ["layout"] },
    layout: { type: "ui.region", props: { role: "scope" }, children: ["r-cols"] },
    "r-cols": { type: "ui.region", props: { role: "inferred" }, children: ["b-settings", "b-form"] },
    "b-settings": { type: "app.settingsForm", props: { variant: "stacked", title: "Ajustes" } },
    "b-form": { type: "ui.form", props: { title: "Contraseña" } },
  }),
};

/** Acme with three screens (Inicio landing, Dashboard and Ajustes app screens) and the style guide. */
export const screensInput: CreateDesignDocInput = { ...acmeInput, screens: [homeScreen, dashboardScreen, settingsScreen] };

export function screensDoc(): DesignDoc {
  return addPage(createDesignDoc(screensInput), "brand");
}
