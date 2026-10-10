// The screens of a Modo Layout document as the export packs write them: a safe folder per screen, the
// layout compiled exactly as the page was built (`buildPageFromLayout`), the element → screen links and the
// `layout.json` of each screen. Pure and deterministic, like exportPack.
import { orderedScreens, type DesignDoc, type Page, type Screen, type ScreenId, type ScreenKind } from "@dialmade/doc";
import type { BreakpointLayout } from "@dialmade/layout";
import { compileScreenLayout, screenLinks, type CompiledScreenLayout } from "@/lib/screen-layout";
import { slugify } from "./files";

// The compile and the links live in @/lib/screen-layout: the Composer's preview uses the same ones.
export { compileScreenLayout, screenLinks, type CompiledScreenLayout };

/** `format` of every `layout.json`. Bump it when the shape changes. */
export const LAYOUT_JSON_FORMAT = "dialmade-layout/1";

/** Windows device names: a folder called like this cannot be extracted there. */
const DEVICE_NAMES = ["con", "prn", "aux", "nul", ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [`com${n}`, `lpt${n}`])];

/**
 * Folder names a screen never takes (it gets `-2`): the pack's own folders, the folders of documents without
 * screens and Windows device names.
 */
export const RESERVED_DIRS: readonly string[] = ["assets", "prompts", "brand", "landing", "app", "screens", ...DEVICE_NAMES];

export type PackScreen = CompiledScreenLayout & {
  id: ScreenId;
  name: string;
  kind: ScreenKind;
  route: string;
  /** Unique and safe (`[a-z0-9-]+`): never the raw route. Names the folder and the Claude Design preview. */
  slug: string;
  /** Folder of the screen in the code pack: `""` for the root screen (route `/`, else the first), else `slug`. */
  dir: string;
  screen: Screen;
  page: Page;
  /** Element id → the screen its primary action links to (`linkTo`; an absorbed block's link goes to its host). */
  links: Record<string, ScreenId>;
};

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** `slugify(route)`, de-duplicated against `taken`; `index` for `/`, `screen-{n}` when nothing is left. */
function uniqueSlug(route: unknown, index: number, taken: Set<string>): string {
  const path = typeof route === "string" ? route.replace(/^\/+/, "") : "";
  const base = slugify(path, route === "/" ? "index" : `screen-${index + 1}`);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

/**
 * Every screen of the document in `screenOrder`, ready to export: its folder, its compiled layout and its
 * links. The screen with route `/` (else the first one) goes at the root. Empty for documents without screens.
 */
export function screenPages(doc: DesignDoc): PackScreen[] {
  const screens = orderedScreens(doc);
  if (screens.length === 0) return [];
  const rootIndex = Math.max(0, screens.findIndex((screen) => screen.route === "/"));
  const taken = new Set(RESERVED_DIRS);
  return screens.map((screen, index) => {
    const slug = uniqueSlug(screen.route, index, taken);
    const compiled = compileScreenLayout(screen);
    return {
      ...compiled,
      id: screen.id,
      name: screen.name,
      kind: screen.kind,
      route: screen.route,
      slug,
      dir: index === rootIndex ? "" : slug,
      screen,
      page: screen.page,
      links: screenLinks(doc, screen, compiled.absorbed),
    };
  });
}

/** Path of a screen's HTML inside the code pack. */
export const screenPath = (screen: Pick<PackScreen, "dir">): string => (screen.dir ? `${screen.dir}/index.html` : "index.html");

/**
 * Relative link from one screen's `index.html` to another's. Always the explicit `…/index.html`: under
 * `file://` a link to a folder does not open its index.
 */
export const relativeHref = (from: Pick<PackScreen, "dir">, to: Pick<PackScreen, "dir">): string =>
  `${from.dir ? "../" : ""}${screenPath(to)}`;

/**
 * `linkHref` for `renderStaticPage`: a screen id resolves to that screen; any other id is a nav item of the
 * app shell and resolves to the app screen whose `shell.activeItem` it is (first in order). `null` otherwise.
 */
export function linkResolver(screens: readonly PackScreen[], hrefOf: (to: PackScreen) => string): (id: string) => string | null {
  const byId = new Map(screens.map((screen) => [screen.id, screen]));
  const byNavItem = new Map<string, PackScreen>();
  for (const screen of screens) {
    const item = screen.kind === "app" ? screen.screen.shell?.activeItem : undefined;
    if (item && !byId.has(item) && !byNavItem.has(item)) byNavItem.set(item, screen);
  }
  return (id) => {
    const target = byId.get(id) ?? byNavItem.get(id);
    return target ? hrefOf(target) : null;
  };
}

const breakpointSummary = (layout: BreakpointLayout) => ({
  columns: layout.columns,
  order: layout.order,
  blocks: Object.fromEntries(
    Object.entries(layout.blocks).map(([id, block]) => [id, { rect: block.rect, behavior: block.behavior, hidden: block.hidden }]),
  ),
});

/**
 * `layout.json` of a screen (format `dialmade-layout/1`): the screen, its layout verbatim (to import it again),
 * the blocks absorbed by their parent, the reading order, the warnings, what tablet and phone do with each block
 * and the links of the page with the href each one has next to this file.
 */
export function layoutJson(screen: PackScreen, hrefOf: (to: ScreenId) => string | null) {
  const position = new Map(screen.structure.order.map((id, i) => [id, i]));
  const rank = (id: string) => position.get(id) ?? Number.MAX_SAFE_INTEGER;
  const links = Object.entries(screen.links)
    .sort(([a], [b]) => rank(a) - rank(b) || compareIds(a, b))
    .map(([from, to]) => ({ from, to, href: hrefOf(to) }));
  return {
    format: LAYOUT_JSON_FORMAT,
    screen: { id: screen.id, name: screen.name, kind: screen.kind, route: screen.route, shell: screen.screen.shell },
    layout: screen.screen.layout,
    absorbed: screen.absorbed,
    order: screen.structure.order,
    warnings: screen.warnings.map(({ code, ids }) => ({ code, ids })),
    responsive: { tablet: breakpointSummary(screen.responsive.tablet), mobile: breakpointSummary(screen.responsive.mobile) },
    links,
  };
}
