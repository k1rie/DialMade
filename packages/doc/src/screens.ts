import type { OutputKind } from "@dialmade/catalog";
import { sanitizeLabel } from "@dialmade/layout";
import { OUTPUT_KIND_IDS } from "./constants";
import type { PatchOperation } from "./patch";
import { coversPointer, toPointer, type DocPointer } from "./pointer";
import type { DesignDoc, Page, Screen, ScreenId } from "./schema";

/**
 * What the app and the exporters address a page by: a screen id, or `"brand"` (the style guide). In a legacy
 * document (no screens) the keys are the page kinds (`"landing"`, `"app"`, `"brand"`). Screen ids can never be
 * one of the kinds (`RESERVED_SCREEN_IDS`), so a key is never ambiguous.
 */
export type PageKey = OutputKind | ScreenId;

/** One page to render or export, in order: a screen (with its `screen`) or a legacy/brand page. */
export interface RenderTarget {
  key: PageKey;
  kind: OutputKind;
  page: Page;
  screen?: Screen;
}

const isOutputKind = (key: string): key is OutputKind => (OUTPUT_KIND_IDS as readonly string[]).includes(key);

/** The document has screens (Modo Layout): `pages.landing`/`pages.app` are then absent. */
export const hasScreens = (doc: Pick<DesignDoc, "screens" | "screenOrder">): boolean =>
  doc.screenOrder.length > 0 || Object.keys(doc.screens).length > 0;

/** Something to render or export: a screen or any page. */
export const hasDesign = (doc: DesignDoc): boolean => hasScreens(doc) || OUTPUT_KIND_IDS.some((kind) => doc.pages[kind] !== undefined);

/** The screens in `screenOrder`. */
export function orderedScreens(doc: Pick<DesignDoc, "screens" | "screenOrder">): Screen[] {
  return doc.screenOrder.flatMap((id) => (Object.hasOwn(doc.screens, id) ? [doc.screens[id]!] : []));
}

/** `screenPointer("s-1", "layout", "blocks", "b-1")` → `"/screens/s-1/layout/blocks/b-1"` (segments escaped). */
export function screenPointer(id: ScreenId, ...segments: (string | number)[]): DocPointer {
  return toPointer(["screens", id, ...segments]) as DocPointer;
}

/** Pages of a legacy document in their export order: brand, landing, app, with the focus first. */
export function legacyPageKinds(doc: Pick<DesignDoc, "pages" | "brief">): OutputKind[] {
  const kinds = OUTPUT_KIND_IDS.filter((kind) => doc.pages[kind]);
  return [...kinds].sort((a, b) => (a === doc.brief.focus ? -1 : b === doc.brief.focus ? 1 : 0));
}

/**
 * Every page to render or export, in order. With screens: the screens in `screenOrder`, then the style guide
 * (`pages.brand`) if there is one. Without screens (legacy): today's order (`legacyPageKinds`).
 */
export function renderTargets(doc: DesignDoc): RenderTarget[] {
  if (hasScreens(doc)) {
    const out: RenderTarget[] = orderedScreens(doc).map((screen) => ({ key: screen.id, kind: screen.kind, page: screen.page, screen }));
    if (doc.pages.brand) out.push({ key: "brand", kind: "brand", page: doc.pages.brand });
    return out;
  }
  return legacyPageKinds(doc).map((kind) => ({ key: kind, kind, page: doc.pages[kind]! }));
}

/** The page of a key: `pages[kind]` for a kind, else the screen's page. */
export function pageForKey(doc: DesignDoc, key: PageKey): Page | undefined {
  if (isOutputKind(key)) return doc.pages[key];
  return Object.hasOwn(doc.screens, key) ? doc.screens[key]!.page : undefined;
}

/**
 * The patch that deletes a screen: strips the `linkTo`s of other screens' blocks that point to it, removes
 * the lock entries under it, takes it out of `screenOrder` and removes it. Empty when the screen does not
 * exist. A lock under the screen (or on a stripped link) makes `applyPatch` fail with `locked`: deleting it
 * is an explicit action («¿Desbloquear y borrar?»), so apply it with `allowLocked` after asking.
 */
export function removeScreenOps(doc: DesignDoc, id: ScreenId): PatchOperation[] {
  if (!Object.hasOwn(doc.screens, id)) return [];
  const ops: PatchOperation[] = [];
  const others = [...orderedScreens(doc), ...Object.values(doc.screens)].filter(
    (screen, i, all) => screen.id !== id && all.indexOf(screen) === i,
  );
  for (const screen of others) {
    for (const [blockId, block] of Object.entries(screen.layout.blocks)) {
      if (block.linkTo === id) ops.push({ op: "remove", path: screenPointer(screen.id, "layout", "blocks", blockId, "linkTo") });
    }
  }
  const root = screenPointer(id);
  doc.brief.locks
    .map((lock, index) => ({ lock, index }))
    .filter(({ lock }) => lock.startsWith("/") && coversPointer(root, lock))
    .reverse()
    .forEach(({ index }) => ops.push({ op: "remove", path: `/brief/locks/${index}` }));
  const at = doc.screenOrder.indexOf(id);
  if (at >= 0) ops.push({ op: "remove", path: `/screenOrder/${at}` });
  ops.push({ op: "remove", path: root });
  return ops;
}

/* ------------------------------------------------------------------------------------------------ */
/* Renaming a screen outside the Layout step                                                        */
/* ------------------------------------------------------------------------------------------------ */

/** Longest slug of an automatic route (the Layout store's rule). */
const ROUTE_SLUG_MAX = 48;

/** `"Ajustes (copia)"` → `"ajustes-copia"`; `"screen"` when nothing is left. */
function routeSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ROUTE_SLUG_MAX)
    .replace(/-+$/, "");
  return slug || "screen";
}

/** `/ajustes` or `/ajustes-2` for «Ajustes»: a route made from the name, which follows a rename. */
function isAutoRoute(route: string, name: string): boolean {
  const base = `/${routeSlug(name)}`;
  if (route === base) return true;
  const suffix = route.startsWith(`${base}-`) ? route.slice(base.length + 1) : "";
  return /^\d+$/.test(suffix);
}

function uniqueRoute(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** `name`, else `name 2`, `name 3`…, shortening `name` so the number always fits the label limit. */
function uniqueScreenName(name: string, taken: ReadonlySet<string>): string {
  if (!taken.has(name)) return name;
  for (let n = 2; n <= taken.size + 2; n++) {
    const suffix = ` ${n}`;
    let base = [...name];
    let candidate = sanitizeLabel(`${base.join("")}${suffix}`);
    while (!candidate.endsWith(suffix) && base.length > 0) {
      base = base.slice(0, -1);
      candidate = sanitizeLabel(`${base.join("").trimEnd()}${suffix}`);
    }
    if (!taken.has(candidate)) return candidate;
  }
  return name;
}

/**
 * The patch that renames a screen with the Layout step's rules (decision 43): the name is cleaned
 * (`sanitizeLabel`) and kept unique («Ajustes» next to another «Ajustes» becomes «Ajustes 2»), and an
 * automatic route (`/<slug of the old name>`, never `/`) follows the new name, unique among the routes.
 * Empty when the screen does not exist, the name cleans to nothing or nothing changes. A lock on the name
 * makes `applyPatch` fail with `locked`.
 */
export function renameScreenOps(doc: Pick<DesignDoc, "screens">, id: ScreenId, rawName: string): PatchOperation[] {
  const screen = Object.hasOwn(doc.screens, id) ? doc.screens[id] : undefined;
  const sanitized = sanitizeLabel(rawName);
  if (!screen || !sanitized) return [];
  const others = Object.values(doc.screens).filter((other) => other.id !== id);
  const name = uniqueScreenName(sanitized, new Set(others.map((other) => other.name)));
  if (name === screen.name) return [];
  const ops: PatchOperation[] = [{ op: "replace", path: screenPointer(id, "name"), value: name }];
  if (screen.route !== "/" && isAutoRoute(screen.route, screen.name)) {
    const route = uniqueRoute(`/${routeSlug(name)}`, new Set(others.map((other) => other.route)));
    if (route !== screen.route) ops.push({ op: "replace", path: screenPointer(id, "route"), value: route });
  }
  return ops;
}
