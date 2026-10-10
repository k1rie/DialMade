// A Modo Layout document (DesignDoc v2 with screens) built the way «Generar» builds it (`buildPageFromLayout`),
// plus a legacy document (pages without screens). The golden tests of the figma-plan and the TSX use them.
import { createDesignDoc, parseDesignDoc, type DesignDoc, type ScreenInput } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type BlockId, type LayoutDoc, type ScreenTemplateId } from "@dialmade/layout";
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
export function screensDoc(specs: readonly ScreenSpec[] = SCREEN_SPECS): DesignDoc {
  const base = addDefaultPage(baseDoc(), "brand");
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

/** A document without screens: the default landing, dashboard and style guide pages. */
export function legacyDoc(): DesignDoc {
  let doc = baseDoc();
  for (const kind of ["landing", "app", "brand"] as const) doc = addDefaultPage(doc, kind);
  return doc;
}
