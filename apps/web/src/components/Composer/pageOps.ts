import { OUTPUT_KINDS, type OutputKind } from "@dialmade/catalog";
import { MAX_PINNED, type DesignDoc, type Page, type PageKey, type PatchOperation, type Screen } from "@dialmade/doc";
import { SHELL_ELEMENT_ID, isStructuralElement, type SectionRegistry } from "@dialmade/sections";

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

/**
 * Sets one prop (`add` creates or replaces an object member, so it works for stored and default-only props).
 * On a screen, in the same patch: a block's edited prop is pinned, so «Generar» again keeps it; and the app
 * frame (`shell`) is shared, so its edit goes to every app screen that has one.
 */
export function setPropOps(doc: DesignDoc, target: PageTarget, id: string, prop: string, value: unknown): PatchOperation[] {
  const ops: PatchOperation[] = [{ op: "add", path: propPath(target.key, id, prop), value }];
  const screen = target.screen;
  if (!screen) return ops;
  ops.push(...pinOps(target, id, prop));
  if (id === SHELL_ELEMENT_ID && screen.kind === "app") {
    for (const other of doc.screenOrder) {
      const page = other !== screen.id && Object.hasOwn(doc.screens, other) ? doc.screens[other]!.page : undefined;
      if (page?.elements[SHELL_ELEMENT_ID]?.type === screen.page.elements[SHELL_ELEMENT_ID]?.type) {
        ops.push({ op: "add", path: propPath(other, SHELL_ELEMENT_ID, prop), value });
      }
    }
  }
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
