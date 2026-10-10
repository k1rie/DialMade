// A Modo Layout document (DesignDoc v2 with screens) built the way «Generar» builds it (`buildPageFromLayout`),
// plus a legacy document (pages without screens). The golden tests of the figma-plan and the TSX use them.
import { createDesignDoc, parseDesignDoc, type DesignDoc, type ScreenInput } from "@dialmade/doc";
import {
  LIBRARY,
  emptyLayout,
  getScreenTemplate,
  instantiateTemplate,
  type AppShell,
  type BlockId,
  type LayoutBlock,
  type LayoutDoc,
  type ScreenKind,
  type ScreenTemplateId,
} from "@dialmade/layout";
import { addDefaultPage, buildPageFromLayout, contentContextFromDoc, type NavScreen } from "@dialmade/sections";

export const CREATED_AT = "2026-10-09T12:00:00.000Z";

type ScreenSpec = {
  id: string;
  name: string;
  route: string;
  template: ScreenTemplateId;
  /** Block type → screen: the first block of that type links there. */
  links?: Record<string, string>;
  edit?: (layout: LayoutDoc, ids: BlockId[]) => LayoutDoc;
};

/** Inicio, Precios, Entrar, Dashboard and Ajustes, linked like a small SaaS. */
export const SCREEN_SPECS: readonly ScreenSpec[] = [
  { id: "s-home", name: "Inicio", route: "/", template: "home", links: { navbar: "s-pricing", hero: "s-login", cta: "s-pricing" } },
  { id: "s-pricing", name: "Precios", route: "/precios", template: "pricing", links: { pricing: "s-login" } },
  { id: "s-login", name: "Entrar", route: "/entrar", template: "login", links: { form: "s-dashboard" } },
  { id: "s-dashboard", name: "Dashboard", route: "/app/dashboard", template: "dashboard", links: { table: "s-settings" } },
  { id: "s-settings", name: "Ajustes", route: "/app/ajustes", template: "settings" },
];

function baseDoc(): DesignDoc {
  const doc = createDesignDoc({
    brand: { name: "Brisa", tagline: "Pagos sin fricción", seeds: { primary: "#7c5cff" } },
    brief: { productType: "saas-general", locale: "es", focus: "landing" },
  });
  return { ...doc, provenance: { ...doc.provenance, createdAt: CREATED_AT } };
}

function linkFirst(layout: LayoutDoc, links: Record<string, string>): LayoutDoc {
  const blocks = { ...layout.blocks };
  const done = new Set<string>();
  for (const [id, block] of Object.entries(blocks)) {
    const to = links[block.type];
    if (to && !done.has(block.type)) {
      blocks[id] = { ...block, linkTo: to };
      done.add(block.type);
    }
  }
  return { ...layout, blocks };
}

/** The document the app writes after «Generar»: screens in order and the style guide in `pages.brand`. */
export function screensDoc(specs: readonly ScreenSpec[] = SCREEN_SPECS, options: { styleGuide?: boolean } = {}): DesignDoc {
  const base = options.styleGuide === false ? baseDoc() : addDefaultPage(baseDoc(), "brand");
  const ctx = contentContextFromDoc(base);
  const navScreens: NavScreen[] = [];
  const made = specs.map((spec) => {
    let n = 0;
    const { layout, shell, kind } = instantiateTemplate(getScreenTemplate(spec.template), {
      label: (type) => `${type[0]!.toUpperCase()}${type.slice(1)}`,
      newId: () => `${spec.id}-${n++}`,
    });
    const ids = Object.keys(layout.blocks);
    const edited = linkFirst(spec.edit ? spec.edit(layout, ids) : layout, spec.links ?? {});
    if (kind === "app" && shell && shell.nav !== "none") navScreens.push({ id: spec.id, name: spec.name });
    return { spec, layout: edited, shell, kind: kind ?? "landing" };
  });
  const landingScreens = made.filter((entry) => entry.kind === "landing").map(({ spec }) => ({ id: spec.id, name: spec.name }));
  const screens: ScreenInput[] = made.map(({ spec, layout, shell, kind }) => {
    const result = buildPageFromLayout(layout, kind, kind === "app" ? shell : null, ctx, {
      screenId: spec.id,
      screenTitle: spec.name,
      navScreens,
      landingScreens,
    });
    return { id: spec.id, name: spec.name, kind, route: spec.route, layout, page: result.page, shell: kind === "app" ? shell : null };
  });
  return parseDesignDoc({
    ...base,
    brief: { ...base.brief, focus: screens[0]!.kind },
    screens: Object.fromEntries(screens.map((screen) => [screen.id, screen])),
    screenOrder: screens.map((screen) => screen.id),
  });
}

/** Two linked screens (Precios → Entrar) without the style guide: small enough for a full golden. */
export const goldenDoc = (): DesignDoc =>
  screensDoc(
    SCREEN_SPECS.filter((spec) => spec.id === "s-pricing" || spec.id === "s-login").map((spec) => (spec.id === "s-login" ? { ...spec, links: {} } : spec)),
    { styleGuide: false },
  );

/** A document without screens: the default landing, dashboard and style guide pages. */
export function legacyDoc(): DesignDoc {
  let doc = baseDoc();
  for (const kind of ["landing", "app", "brand"] as const) doc = addDefaultPage(doc, kind);
  return doc;
}

/**
 * One stacked block of every ready library type (default sizes), a hero with an absorbed media, a container
 * with a text and a modal with a form. Frame blocks are left out of app screens (they are the shell).
 */
export function everyBlockLayout(kind: ScreenKind): LayoutDoc {
  const layout = emptyLayout();
  let row = 0;
  let z = 0;
  const add = (id: BlockId, block: Omit<LayoutBlock, "z">) => {
    layout.blocks[id] = { ...block, z: ++z };
  };
  for (const def of LIBRARY) {
    if (def.status !== "ready" || def.overlay || (kind === "app" && def.frame)) continue;
    const { w, h } = def.defaultSize;
    const id = `${kind}-${def.type}`;
    add(id, { type: def.type, label: def.type, rect: { col: 0, row, w, h } });
    if (def.type === "hero") add(`${id}-media`, { type: "media", label: "media", rect: { col: 7, row: row + 2, w: 5, h: h - 4 }, parentId: id });
    if (def.type === "container") add(`${id}-text`, { type: "text", label: "text", rect: { col: 1, row: row + 2, w: 6, h: 10 }, parentId: id });
    row += h + 2;
  }
  add(`${kind}-modal`, { type: "modal", label: "modal", rect: { col: 3, row: 4, w: 6, h: 40 } });
  add(`${kind}-modal-form`, { type: "form", label: "form", rect: { col: 4, row: 6, w: 4, h: 30 }, parentId: `${kind}-modal` });
  return layout;
}

/** Two screens (web and app) with every block type, plus the style guide: covers every section builder. */
export function everyBlockDoc(): DesignDoc {
  const base = addDefaultPage(baseDoc(), "brand");
  const ctx = contentContextFromDoc(base);
  const shell: AppShell = { nav: "sidebar", header: true, activeItem: "s-app" };
  const specs = [
    { id: "s-web", name: "Web", route: "/", kind: "landing" as const, shell: null },
    { id: "s-app", name: "App", route: "/app", kind: "app" as const, shell },
  ];
  const navScreens: NavScreen[] = [{ id: "s-app", name: "App" }];
  const screens: ScreenInput[] = specs.map((spec) => {
    const layout = everyBlockLayout(spec.kind);
    const result = buildPageFromLayout(layout, spec.kind, spec.shell, ctx, { screenId: spec.id, screenTitle: spec.name, navScreens });
    return { id: spec.id, name: spec.name, kind: spec.kind, route: spec.route, layout, page: result.page, shell: spec.shell };
  });
  return parseDesignDoc({
    ...base,
    screens: Object.fromEntries(screens.map((screen) => [screen.id, screen])),
    screenOrder: screens.map((screen) => screen.id),
  });
}
