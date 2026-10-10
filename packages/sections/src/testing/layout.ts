import {
  LIBRARY,
  emptyLayout,
  getBlockDef,
  type BlockId,
  type GeneratedFingerprint,
  type LayoutBlock,
  type LayoutDoc,
  type LibraryBlockType,
  type ScreenKind,
} from "@dialmade/layout";

/** Ready library types, in library order. */
export const READY_TYPES: readonly LibraryBlockType[] = LIBRARY.filter((def) => def.status === "ready").map((def) => def.type);

/** Every library type (ready and «soon»), in library order. */
export const ALL_TYPES: readonly LibraryBlockType[] = LIBRARY.map((def) => def.type);

/**
 * A stacked layout with one block of each type (default sizes, full rows), plus a hero with an absorbed
 * media and a modal holding a form. Frame blocks (navbar, sidebar) are left out of app screens, where they
 * are the shell. Ids are `x-<type>`.
 */
export function everyBlockLayout(kind: ScreenKind, types: readonly LibraryBlockType[] = ALL_TYPES): LayoutDoc {
  const layout = emptyLayout();
  let row = 0;
  let z = 0;
  const add = (id: BlockId, block: Omit<LayoutBlock, "z">) => {
    layout.blocks[id] = { ...block, z: ++z };
  };
  for (const type of types) {
    const def = getBlockDef(type);
    if (kind === "app" && def.frame) continue;
    if (def.overlay) continue;
    const { w, h } = def.defaultSize;
    add(`x-${type}`, { type, label: type, rect: { col: 0, row, w, h } });
    if (type === "hero") add("x-hero-media", { type: "media", label: "media", rect: { col: 7, row: row + 2, w: 5, h: h - 4 }, parentId: "x-hero" });
    if (type === "container") add("x-container-text", { type: "text", label: "text", rect: { col: 1, row: row + 2, w: 6, h: 10 }, parentId: "x-container" });
    row += h + 2;
  }
  if (types.includes("modal")) {
    add("x-modal", { type: "modal", label: "modal", rect: { col: 3, row: 4, w: 6, h: 40 } });
    add("x-modal-form", { type: "form", label: "form", rect: { col: 4, row: 6, w: 4, h: 30 }, parentId: "x-modal" });
  }
  return layout;
}

/** The layout with `generated` set from a build's fingerprints (what the app writes in the same batch). */
export function withFingerprints(layout: LayoutDoc, fingerprints: Readonly<Record<BlockId, GeneratedFingerprint>>): LayoutDoc {
  const blocks: Record<BlockId, LayoutBlock> = {};
  for (const [id, block] of Object.entries(layout.blocks)) {
    const generated = fingerprints[id];
    blocks[id] = generated ? { ...block, generated } : block;
  }
  return { ...layout, blocks };
}

/** Element ids a CSS string targets (`[data-dl-id="…"]`), in order of first appearance. */
export function cssIds(css: string): string[] {
  return [...new Set([...css.matchAll(/\[data-dl-id="([^"]+)"\]/g)].map((match) => match[1]!))];
}

/** Ids of the `data-dl-id` attributes of a markup string, in document order. */
export function markupIds(html: string): string[] {
  return [...html.matchAll(/data-dl-id="([^"]+)"/g)].map((match) => match[1]!);
}
