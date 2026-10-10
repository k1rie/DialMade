import { OUTPUT_KINDS, type OutputKind } from "@dialmade/catalog";
import { MAX_PINNED, orderedScreens, renameScreenOps, type DesignDoc, type Page, type PageKey, type PatchOperation, type Screen } from "@dialmade/doc";
import { getBlockDef, isLibraryBlockType, type AppNav } from "@dialmade/layout";
import { APP_SHELL_TYPE, SHELL_ELEMENT_ID, SHELL_SCREEN_KEYS, VARIANT_PROP, isStructuralElement, type SectionRegistry } from "@dialmade/sections";

/**
 * The page the Composer shows and edits: a page kind's page (`"brand"`, legacy `"landing"`/`"app"`), or a
 * Modo Layout screen with its page. `kind` is the kind the page renders as (a screen's own kind).
 */
export type PageTarget = { key: PageKey; kind: OutputKind; page: Page; screen?: Screen };

/** RFC 6901 escaping of one path segment. */
export const pointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");

/** A page kind; anything else is a screen id (screen ids can never be `brand`, `landing` or `app`). */
export const isPageKind = (key: string): key is OutputKind => (OUTPUT_KINDS as readonly string[]).includes(key);

/** The page of `key`: its kind's page, or the screen and its page. `null` when the doc has no such page. */
export function pageTarget(doc: DesignDoc, key: PageKey): PageTarget | null {
  if (isPageKind(key)) {
    const page = doc.pages[key];
    return page ? { key, kind: key, page } : null;
  }
  const screen = Object.hasOwn(doc.screens, key) ? doc.screens[key] : undefined;
  return screen ? { key, kind: screen.kind, page: screen.page, screen } : null;
}

/** Pointer of the page of `key`: `/pages/{kind}` or `/screens/{id}/page`. */
export const pageBase = (key: PageKey) => (isPageKind(key) ? `/pages/${key}` : `/screens/${pointer(key)}/page`);

export const elementPath = (key: PageKey, id: string) => `${pageBase(key)}/elements/${pointer(id)}`;

export const propPath = (key: PageKey, id: string, prop: string) => `${elementPath(key, id)}/props/${pointer(prop)}`;

const blockPath = (screen: Screen, id: string) => `/screens/${pointer(screen.id)}/layout/blocks/${pointer(id)}`;

/** The layout block behind an element of a screen page (block id = element id), if it has one. */
const blockOf = (target: PageTarget, id: string) =>
  target.screen && Object.hasOwn(target.screen.layout.blocks, id) ? target.screen.layout.blocks[id] : undefined;

/** Ops that add `/prop` to the block's `pinned` (props the user edited: regenerating never touches them). */
function pinOps(target: PageTarget, id: string, prop: string): PatchOperation[] {
  const block = blockOf(target, id);
  if (!block || !target.screen) return [];
  const pin = `/${pointer(prop)}`;
  const pinned = block.pinned ?? [];
  if (pinned.includes(pin) || pinned.length >= MAX_PINNED) return [];
  const path = `${blockPath(target.screen, id)}/pinned`;
  return block.pinned ? [{ op: "add", path: `${path}/-`, value: pin }] : [{ op: "add", path, value: [pin] }];
}

/** The prop of a repeatable section that mirrors its block's ×N (`block.count`, the chip of the Layout canvas). */
export const COUNT_PROP = "count";

/**
 * A count edit on a repeatable block (Features, Logos, Testimonials, Pricing, KPIs, Cards) as layout data: writes
 * `block.count`, so the Layout canvas shows the same ×N, and drops a `/count` pin left by an older edit. The count
 * is NOT pinned: the layout is its single source of truth, so a later ×N change in «Editar layout» wins on «Generar»
 * (a pin would silently override it and the canvas chip would lie). `null` when the edit is not that: another prop,
 * not a block, a block that is not repeatable, or a value outside the block's range (then it is pinned as usual).
 */
function countOps(target: PageTarget, id: string, prop: string, value: unknown): PatchOperation[] | null {
  const block = prop === COUNT_PROP ? blockOf(target, id) : undefined;
  if (!block || !target.screen || !isLibraryBlockType(block.type)) return null;
  const def = getBlockDef(block.type);
  const range = def.repeatable;
  if (!range || target.page.elements[id]?.type !== def.sectionType) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < range.min || value > range.max) return null;
  const path = blockPath(target.screen, id);
  const ops: PatchOperation[] = block.count === value ? [] : [{ op: "add", path: `${path}/count`, value }];
  const pinned = block.pinned ?? [];
  const pin = pinned.indexOf(`/${COUNT_PROP}`);
  if (pin >= 0) ops.push(pinned.length === 1 ? { op: "remove", path: `${path}/pinned` } : { op: "remove", path: `${path}/pinned/${pin}` });
  return ops;
}

/** `app.shell` props of one screen (its page header, its active nav item): an edit stays on that screen. */
const isScreenShellKey = (prop: string) => (SHELL_SCREEN_KEYS as readonly string[]).includes(prop);

/**
 * App frame props that are not copy: the layout owns the navigation (`variant` ↔ `shell.nav`), the page header
 * (`shell.header`), the title (the screen's name), the nav items and the active item, and the settings (tone,
 * density, search) survive every rebuild as they are. Every other frame prop the user edits is pinned.
 */
const FRAME_UNPINNED: ReadonlySet<string> = new Set([VARIANT_PROP, "showPageHeader", "title", "nav", "activeId", "tone", "density", "showSearch"]);

/** The navigation (`shell.nav`) each frame variant draws: «Panel flotante» is a sidebar. */
const NAV_OF_VARIANT: Readonly<Record<string, AppNav>> = { sidebar: "sidebar", inset: "sidebar", rail: "rail", topnav: "topnav" };

const shellPath = (screen: Screen, ...segments: string[]) => `/screens/${pointer(screen.id)}/shell${segments.map((segment) => `/${pointer(segment)}`).join("")}`;

/** The frame is an `app.shell` element of an app screen with navigation (not a loose Sidebar block). */
const isFrame = (target: PageTarget, id: string): target is PageTarget & { screen: Screen } =>
  id === SHELL_ELEMENT_ID &&
  target.screen?.kind === "app" &&
  target.screen.shell !== null &&
  target.screen.shell.nav !== "none" &&
  target.page.elements[id]?.type === APP_SHELL_TYPE;

/** Ops that add `/prop` to a screen frame's `shell.pinned` (its copy edited in «Ajustar»). */
function framePinOps(screen: Screen, prop: string): PatchOperation[] {
  const shell = screen.shell;
  if (!shell || FRAME_UNPINNED.has(prop)) return [];
  const pin = `/${pointer(prop)}`;
  const pinned = shell.pinned ?? [];
  if (pinned.includes(pin) || pinned.length >= MAX_PINNED) return [];
  return shell.pinned ? [{ op: "add", path: `${shellPath(screen, "pinned")}/-`, value: pin }] : [{ op: "add", path: shellPath(screen, "pinned"), value: [pin] }];
}

/** Every app screen with a frame like `screen`'s (the frame edit of a shared key goes to all of them). */
function framedScreens(doc: DesignDoc, screen: Screen): Screen[] {
  const type = screen.page.elements[SHELL_ELEMENT_ID]?.type;
  return orderedScreens(doc).filter((other) => other.kind === "app" && other.page.elements[SHELL_ELEMENT_ID]?.type === type);
}

/**
 * An edit of a screen's app frame, as layout data where the layout owns it, so «Generar» never reverts it:
 * - «Navegación» (`variant`): the variant on every frame and `shell.nav` on every app screen with navigation
 *   (they share it, decision 40; «Panel flotante» is a sidebar);
 * - «Cabecera de página» (`showPageHeader`): this screen's `shell.header`;
 * - «Título de la página» (`title`): renames the screen (`renameScreenOps`: unique name, an automatic route
 *   follows) and updates the frames' nav items; nothing when the name cleans to nothing or does not change;
 * - copy (primary action, subtitle…): written and pinned (`shell.pinned`) on this screen, or on every frame for
 *   a shared key, so a rebuild (also a language or product change) and the AI keep it.
 */
function frameOps(doc: DesignDoc, target: PageTarget & { screen: Screen }, prop: string, value: unknown): PatchOperation[] {
  const { screen } = target;
  if (prop === "title") {
    if (typeof value !== "string") return [];
    const rename = renameScreenOps(doc, screen.id, value);
    const name = rename.find((op) => op.path.endsWith("/name"));
    if (!name || name.op !== "replace") return [];
    const ops: PatchOperation[] = [...rename, { op: "add", path: propPath(target.key, SHELL_ELEMENT_ID, "title"), value: name.value }];
    for (const other of framedScreens(doc, screen)) {
      const nav = other.page.elements[SHELL_ELEMENT_ID]!.props.nav;
      if (!Array.isArray(nav)) continue;
      nav.forEach((item: unknown, index) => {
        if (item && typeof item === "object" && (item as { id?: unknown }).id === screen.id) {
          ops.push({ op: "add", path: `${elementPath(other.id, SHELL_ELEMENT_ID)}/props/nav/${index}/label`, value: name.value });
        }
      });
    }
    return ops;
  }
  const ops: PatchOperation[] = [{ op: "add", path: propPath(target.key, SHELL_ELEMENT_ID, prop), value }];
  if (prop === "showPageHeader") {
    if (typeof value === "boolean" && screen.shell?.header !== value) ops.push({ op: "replace", path: shellPath(screen, "header"), value });
    return ops;
  }
  const shared = !isScreenShellKey(prop);
  const others = shared ? framedScreens(doc, screen).filter((other) => other.id !== screen.id) : [];
  for (const other of others) ops.push({ op: "add", path: propPath(other.id, SHELL_ELEMENT_ID, prop), value });
  if (prop === VARIANT_PROP) {
    const nav = typeof value === "string" && Object.hasOwn(NAV_OF_VARIANT, value) ? NAV_OF_VARIANT[value]! : undefined;
    if (!nav) return ops;
    for (const other of orderedScreens(doc)) {
      if (other.kind !== "app" || !other.shell || other.shell.nav === "none" || other.shell.nav === nav) continue;
      ops.push({ op: "replace", path: shellPath(other, "nav"), value: nav });
    }
    return ops;
  }
  for (const pinned of [screen, ...others]) ops.push(...framePinOps(pinned, prop));
  return ops;
}

/**
 * Sets one prop (`add` creates or replaces an object member, so it works for stored and default-only props).
 * On a screen, in the same patch: a block's edited prop is pinned, so «Generar» again keeps it, except a
 * repeatable block's count, which is written to `block.count` instead (`countOps`); and the app frame's edits
 * go where the layout owns them, or are pinned on the frame (`frameOps`). A frame edit of a shared key goes to
 * every app screen that has a frame; the keys of one screen (`SHELL_SCREEN_KEYS`: title, subtitle, primary
 * action, active item, page header) stay on it. Can be empty (a title that cleans to the current name).
 */
export function setPropOps(doc: DesignDoc, target: PageTarget, id: string, prop: string, value: unknown): PatchOperation[] {
  if (isFrame(target, id)) return frameOps(doc, target, prop, value);
  const ops: PatchOperation[] = [{ op: "add", path: propPath(target.key, id, prop), value }];
  if (!target.screen) return ops;
  ops.push(...(countOps(target, id, prop, value) ?? pinOps(target, id, prop)));
  return ops;
}

export function parentOf(page: Page, id: string): string | null {
  for (const [parentId, element] of Object.entries(page.elements)) {
    if (element.children.includes(id)) return parentId;
  }
  return null;
}

/**
 * The element whose children are the page's sections: the root, or the single container under it
 * (the App page nests its widgets in `app.shell`).
 */
export function sectionContainerOf(page: Page, registry: SectionRegistry): string {
  const root = page.elements[page.root];
  if (root?.children.length === 1) {
    const only = root.children[0]!;
    const element = page.elements[only];
    if (element && registry.get(element.type)?.container) return only;
  }
  return page.root;
}

/** What the section list shows for a page. */
export type SectionRows = {
  /** Row above the list (the App page's shell, an app screen's frame), or `null`. */
  containerId: string | null;
  /** The sections, in order. */
  ids: string[];
  /** Legacy pages reorder their sections; on a screen the layout decides the order («Editar layout»). */
  reorderable: boolean;
};

/**
 * Legacy pages: the children of `sectionContainerOf`. Screens: the blocks of the layout that have an element,
 * in reading order (the page tree is built in reading order), never the structural regions (`layout`, `r-…`).
 */
export function sectionRows(target: PageTarget, registry: SectionRegistry): SectionRows {
  const { page, screen } = target;
  if (!screen) {
    const containerId = sectionContainerOf(page, registry);
    return { containerId: containerId !== page.root ? containerId : null, ids: [...(page.elements[containerId]?.children ?? [])], reorderable: true };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const element = page.elements[id];
    if (!element) return;
    if (id !== page.root && Object.hasOwn(screen.layout.blocks, id) && !isStructuralElement(registry.get(element.type), element)) ids.push(id);
    for (const child of element.children) walk(child);
  };
  walk(page.root);
  const shell = page.elements[SHELL_ELEMENT_ID];
  return { containerId: shell ? SHELL_ELEMENT_ID : null, ids, reorderable: false };
}

export function childrenOps(key: PageKey, parentId: string, children: readonly string[]): PatchOperation[] {
  return [{ op: "replace", path: `${elementPath(key, parentId)}/children`, value: [...children] }];
}

/** Moves `id` by `delta` among its siblings; `null` at the edges. */
export function moveOps(key: PageKey, page: Page, id: string, delta: -1 | 1): PatchOperation[] | null {
  const parentId = parentOf(page, id);
  if (!parentId) return null;
  const siblings = page.elements[parentId]?.children ?? [];
  const from = siblings.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= siblings.length) return null;
  const next = [...siblings];
  next.splice(to, 0, next.splice(from, 1)[0]!);
  return childrenOps(key, parentId, next);
}

export function canMove(page: Page, id: string, delta: -1 | 1): boolean {
  const parentId = parentOf(page, id);
  const siblings = parentId ? (page.elements[parentId]?.children ?? []) : [];
  const to = siblings.indexOf(id) + delta;
  return siblings.includes(id) && to >= 0 && to < siblings.length;
}

/** On a screen only blocks hide (the frame and the structural regions are not blocks). */
export const canHide = (target: PageTarget, id: string): boolean => !target.screen || blockOf(target, id) !== undefined;

/**
 * Shows or hides a section. On a screen the block's `hidden` changes in the same patch: hiding lives in the
 * layout and `page.hidden` is compiled from it, so «Generar» again keeps it.
 */
export function hiddenOps(target: PageTarget, id: string, hide: boolean): PatchOperation[] {
  const { key, page } = target;
  const base = pageBase(key);
  const hidden = page.hidden ?? [];
  const index = hidden.indexOf(id);
  const ops: PatchOperation[] = [];
  if (hide && index < 0) ops.push(page.hidden ? { op: "add", path: `${base}/hidden/-`, value: id } : { op: "add", path: `${base}/hidden`, value: [id] });
  if (!hide && index >= 0) ops.push({ op: "remove", path: `${base}/hidden/${index}` });
  const block = blockOf(target, id);
  if (block && target.screen) {
    const path = `${blockPath(target.screen, id)}/hidden`;
    if (hide && block.hidden !== true) ops.push({ op: "add", path, value: true });
    if (!hide && block.hidden !== undefined) ops.push({ op: "remove", path });
  }
  return ops;
}

export function isHidden(page: Page, id: string): boolean {
  return page.hidden?.includes(id) ?? false;
}
