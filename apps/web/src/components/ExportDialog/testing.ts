// Test fixtures of the export packs: a Modo Layout document (DesignDoc v2 with screens) built the way
// «Generar» builds it (`buildPageFromLayout`), plus the results of each build to compare against.
import { parseDesignDoc, type DesignDoc, type ScreenInput } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type BlockId, type LayoutDoc, type ScreenTemplateId } from "@dialmade/layout";
import { buildPageFromLayout, contentContextFromDoc, type BuildFromLayoutResult, type NavScreen } from "@dialmade/sections";
import { sampleDoc } from "@/lib/ai/testing";

type ScreenSpec = {
  id: string;
  name: string;
  route: string;
  template: ScreenTemplateId;
  /** Block type → screen: the first block of that type links there. */
  links?: Record<string, string>;
  /** Extra edits on the instantiated layout (ids are `{screen}-{n}` in template order). */
  edit?: (layout: LayoutDoc, ids: BlockId[]) => LayoutDoc;
  dials?: { density?: number; variance?: number; motion?: number };
};

/**
 * Inicio (`/`), Precios (`/precios`), Entrar (`/entrar`), Dashboard (`/app/dashboard`) and Ajustes (`/app`, a
 * reserved folder name). The hero of Inicio absorbs a media block that links elsewhere (the hero's own link wins).
 */
export const SCREEN_SPECS: readonly ScreenSpec[] = [
  {
    id: "s-home",
    name: "Inicio",
    route: "/",
    template: "home",
    links: { navbar: "s-pricing", hero: "s-login", cta: "s-pricing" },
    edit: (layout, ids) => {
      const hero = ids[1]!;
      return {
        ...layout,
        blocks: {
          ...layout.blocks,
          "s-home-media": { type: "media", label: "Captura", rect: { col: 7, row: 12, w: 5, h: 40 }, parentId: hero, z: 20, linkTo: "s-dashboard" },
        },
      };
    },
  },
  { id: "s-pricing", name: "Precios", route: "/precios", template: "pricing", links: { pricing: "s-login" }, dials: { density: 2 } },
  { id: "s-login", name: "Entrar", route: "/entrar", template: "login", links: { form: "s-dashboard" } },
  { id: "s-dashboard", name: "Dashboard", route: "/app/dashboard", template: "dashboard", links: { table: "s-settings" } },
  { id: "s-settings", name: "Ajustes", route: "/app", template: "settings" },
];

/** The first block of each linked type links to its screen; links to screens left out of the doc are dropped. */
function linkFirst(layout: LayoutDoc, links: Record<string, string>, screens: ReadonlySet<string>): LayoutDoc {
  const blocks = { ...layout.blocks };
  const done = new Set<string>();
  for (const [id, block] of Object.entries(blocks)) {
    const to = links[block.type];
    if (to && !done.has(block.type)) {
      blocks[id] = { ...block, linkTo: to };
      done.add(block.type);
    }
    const linkTo = blocks[id]!.linkTo;
    if (linkTo !== undefined && !screens.has(linkTo)) {
      const unlinked = { ...blocks[id]! };
      delete unlinked.linkTo;
      blocks[id] = unlinked;
    }
  }
  return { ...layout, blocks };
}

export type ScreensFixture = { doc: DesignDoc; built: Record<string, BuildFromLayoutResult> };

/** The document the app writes after «Generar» (screens in `order`, the style guide in `pages.brand`), parsed. */
export function screensFixture(order: readonly string[] = SCREEN_SPECS.map((spec) => spec.id)): ScreensFixture {
  const base = sampleDoc(["brand"]);
  const ctx = contentContextFromDoc(base);
  const specs = order.map((id) => SCREEN_SPECS.find((spec) => spec.id === id)!);
  const navScreens: NavScreen[] = [];
  const instantiated = specs.map((spec) => {
    let n = 0;
    const { layout, shell, kind } = instantiateTemplate(getScreenTemplate(spec.template), {
      label: (type) => `${type[0]!.toUpperCase()}${type.slice(1)}`,
      newId: () => `${spec.id}-${n++}`,
    });
    const ids = Object.keys(layout.blocks);
    const edited = linkFirst(spec.edit ? spec.edit(layout, ids) : layout, spec.links ?? {}, new Set(order));
    if (kind === "app" && shell && shell.nav !== "none") navScreens.push({ id: spec.id, name: spec.name });
    return { spec, layout: edited, shell, kind: kind ?? "landing" };
  });
  const built: Record<string, BuildFromLayoutResult> = {};
  const screens: ScreenInput[] = instantiated.map(({ spec, layout, shell, kind }) => {
    const result = buildPageFromLayout(layout, kind, kind === "app" ? shell : null, ctx, {
      screenId: spec.id,
      screenTitle: spec.name,
      navScreens,
      ...(spec.dials && { dials: spec.dials }),
    });
    built[spec.id] = result;
    return { id: spec.id, name: spec.name, kind, route: spec.route, layout, page: result.page, shell: kind === "app" ? shell : null };
  });
  const doc = parseDesignDoc({
    ...base,
    brief: { ...base.brief, focus: screens[0]!.kind },
    screens: Object.fromEntries(screens.map((screen) => [screen.id, screen])),
    screenOrder: screens.map((screen) => screen.id),
  });
  return { doc, built };
}
