import type { OutputKind } from "@dialmade/catalog";
import type { Page, PatchOperation } from "@dialmade/doc";
import type { SectionRegistry } from "@dialmade/sections";

/** RFC 6901 escaping of one path segment. */
export const pointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");

export const elementPath = (kind: OutputKind, id: string) => `/pages/${kind}/elements/${pointer(id)}`;

export const propPath = (kind: OutputKind, id: string, key: string) => `${elementPath(kind, id)}/props/${pointer(key)}`;

/** `add` creates or replaces an object member, so it works for stored and default-only props. */
export const setPropOps = (kind: OutputKind, id: string, key: string, value: unknown): PatchOperation[] => [
  { op: "add", path: propPath(kind, id, key), value },
];

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

export function childrenOps(kind: OutputKind, parentId: string, children: readonly string[]): PatchOperation[] {
  return [{ op: "replace", path: `${elementPath(kind, parentId)}/children`, value: [...children] }];
}

/** Moves `id` by `delta` among its siblings; `null` at the edges. */
export function moveOps(kind: OutputKind, page: Page, id: string, delta: -1 | 1): PatchOperation[] | null {
  const parentId = parentOf(page, id);
  if (!parentId) return null;
  const siblings = page.elements[parentId]?.children ?? [];
  const from = siblings.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= siblings.length) return null;
  const next = [...siblings];
  next.splice(to, 0, next.splice(from, 1)[0]!);
  return childrenOps(kind, parentId, next);
}

export function canMove(page: Page, id: string, delta: -1 | 1): boolean {
  const parentId = parentOf(page, id);
  const siblings = parentId ? (page.elements[parentId]?.children ?? []) : [];
  const to = siblings.indexOf(id) + delta;
  return siblings.includes(id) && to >= 0 && to < siblings.length;
}

export function hiddenOps(kind: OutputKind, page: Page, id: string, hide: boolean): PatchOperation[] {
  const hidden = page.hidden ?? [];
  const index = hidden.indexOf(id);
  if (hide) {
    if (index >= 0) return [];
    return page.hidden ? [{ op: "add", path: `/pages/${kind}/hidden/-`, value: id }] : [{ op: "add", path: `/pages/${kind}/hidden`, value: [id] }];
  }
  return index >= 0 ? [{ op: "remove", path: `/pages/${kind}/hidden/${index}` }] : [];
}

export function isHidden(page: Page, id: string): boolean {
  return page.hidden?.includes(id) ?? false;
}
