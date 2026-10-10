import type { BlockNode, Structure, StructureNode } from "@dialmade/layout";

/*
 * Pure model of the layers treeview (no React, no DOM): the tree in reading order built from the inferred
 * structure, the rows a set of collapsed nodes leaves visible, and the APG treeview keyboard rules
 * (arrows, Home/End, `*`, type-ahead) plus where focus goes when rows disappear.
 */

/** Key of the app navigation frame row (`shell.nav`, not a block). Block ids never contain "@". */
export const NAV_KEY = "@nav";
/** Key of the «Superpuestos» group row that holds the overlay blocks (modal…). */
export const OVERLAYS_KEY = "@overlays";

export type LayerKind = "block" | "nav" | "overlays";

export type LayerNode = {
  /** The block id, or `NAV_KEY` / `OVERLAYS_KEY`. */
  key: string;
  kind: LayerKind;
  parentKey: string | null;
  /** Children in reading order. */
  childKeys: readonly string[];
  /** 1-based depth (`aria-level`). */
  level: number;
  /** 1-based position among its siblings (`aria-posinset`) and how many siblings there are (`aria-setsize`). */
  posinset: number;
  setsize: number;
};

export type LayerTree = {
  nodes: ReadonlyMap<string, LayerNode>;
  roots: readonly string[];
  /** Every key in pre-order: the navigation frame first, the blocks in reading order, the overlays last. */
  order: readonly string[];
};

export type BuildLayerTreeOptions = {
  /** Adds the navigation frame row first (app screens whose `shell.nav` is not "none"). */
  nav?: boolean;
};

type MutableNode = { -readonly [K in keyof LayerNode]: LayerNode[K] };

/** The outermost block nodes under a structure node (regions are walked through, blocks stop the walk). */
function outerBlocks(node: StructureNode | null, out: BlockNode[] = []): BlockNode[] {
  if (!node) return out;
  switch (node.kind) {
    case "block":
      out.push(node);
      break;
    case "stack":
    case "row":
      for (const child of node.children) outerBlocks(child.node, out);
      break;
    case "grid":
      for (const item of node.items) outerBlocks(item.node, out);
      break;
  }
  return out;
}

/**
 * The layers tree of a screen. Nesting is the effective one of `inferStructure` (explicit `parentId`, with
 * missing parents and cycles at the root) and siblings follow its reading order, the same order the canvas
 * uses for Tab and mobile uses to stack. Overlay blocks go in a trailing «Superpuestos» group.
 */
export function buildLayerTree(structure: Structure | null, options: BuildLayerTreeOptions = {}): LayerTree {
  const nodes = new Map<string, MutableNode>();
  const order: string[] = [];

  const number = (keys: readonly string[]) => {
    keys.forEach((key, index) => {
      const node = nodes.get(key);
      if (!node) return;
      node.posinset = index + 1;
      node.setsize = keys.length;
    });
  };

  const add = (key: string, kind: LayerKind, parentKey: string | null, level: number): MutableNode => {
    const node: MutableNode = { key, kind, parentKey, childKeys: [], level, posinset: 1, setsize: 1 };
    nodes.set(key, node);
    order.push(key);
    return node;
  };

  const visit = (blocks: readonly BlockNode[], parentKey: string | null, level: number): string[] => {
    const keys: string[] = [];
    for (const block of blocks) {
      if (nodes.has(block.id)) continue; // Defensive: a block is listed once.
      const node = add(block.id, "block", parentKey, level);
      keys.push(block.id);
      node.childKeys = visit(outerBlocks(block.content), block.id, level + 1);
    }
    number(keys);
    return keys;
  };

  const roots: string[] = [];
  if (options.nav) {
    add(NAV_KEY, "nav", null, 1);
    roots.push(NAV_KEY);
  }
  if (structure) {
    roots.push(...visit(outerBlocks(structure.root), null, 1));
    if (structure.overlays.length > 0) {
      const group = add(OVERLAYS_KEY, "overlays", null, 1);
      group.childKeys = visit(structure.overlays, OVERLAYS_KEY, 2);
      if (group.childKeys.length > 0) roots.push(OVERLAYS_KEY);
      else {
        nodes.delete(OVERLAYS_KEY);
        order.splice(order.indexOf(OVERLAYS_KEY), 1);
      }
    }
  }
  number(roots);
  return { nodes, roots, order };
}

export const isExpandable = (node: LayerNode): boolean => node.childKeys.length > 0;

/** `aria-expanded`: `undefined` for leaves. */
export const expandedState = (node: LayerNode, collapsed: ReadonlySet<string>): boolean | undefined =>
  isExpandable(node) ? !collapsed.has(node.key) : undefined;

/** The rows on screen: pre-order, skipping the descendants of collapsed nodes. */
export function visibleNodes(tree: LayerTree, collapsed: ReadonlySet<string>): LayerNode[] {
  const out: LayerNode[] = [];
  const walk = (keys: readonly string[]) => {
    for (const key of keys) {
      const node = tree.nodes.get(key);
      if (!node) continue;
      out.push(node);
      if (isExpandable(node) && !collapsed.has(key)) walk(node.childKeys);
    }
  };
  walk(tree.roots);
  return out;
}

/** Ancestors of a node, nearest first. */
export function ancestorKeys(tree: LayerTree, key: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>([key]);
  let parent = tree.nodes.get(key)?.parentKey ?? null;
  while (parent !== null && !seen.has(parent)) {
    out.push(parent);
    seen.add(parent);
    parent = tree.nodes.get(parent)?.parentKey ?? null;
  }
  return out;
}

/** The node and every descendant. */
export function subtreeKeys(tree: LayerTree, key: string): Set<string> {
  const out = new Set<string>();
  const stack = [key];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (out.has(current)) continue;
    const node = tree.nodes.get(current);
    if (!node) continue;
    out.add(current);
    stack.push(...node.childKeys);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* Keyboard (WAI-ARIA APG treeview, single select)                                                  */
/* ------------------------------------------------------------------------------------------------ */

export type TreeNavKey = "ArrowDown" | "ArrowUp" | "ArrowRight" | "ArrowLeft" | "Home" | "End" | "*";

const NAV_KEYS: ReadonlySet<string> = new Set<TreeNavKey>(["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End", "*"]);

export const isTreeNavKey = (key: string): key is TreeNavKey => NAV_KEYS.has(key);

export type TreeNavResult =
  | { type: "focus"; key: string }
  | { type: "expand"; keys: readonly string[] }
  | { type: "collapse"; key: string }
  | { type: "none" };

const NONE: TreeNavResult = { type: "none" };

/**
 * What a navigation key does on the focused node:
 * ↓/↑ next/previous visible row (no wrap) · → opens a closed node, or moves to the first child of an open
 * one · ← closes an open node, or moves to the parent · Home/End first/last visible row · `*` opens
 * every sibling of the focused node. Focus never changes selection.
 */
export function treeNavigation(
  tree: LayerTree,
  visible: readonly LayerNode[],
  collapsed: ReadonlySet<string>,
  currentKey: string | null,
  key: TreeNavKey,
): TreeNavResult {
  if (visible.length === 0) return NONE;
  const index = currentKey === null ? -1 : visible.findIndex((node) => node.key === currentKey);
  const node = index >= 0 ? visible[index]! : null;
  if (!node) return { type: "focus", key: visible[0]!.key };

  switch (key) {
    case "ArrowDown":
      return index + 1 < visible.length ? { type: "focus", key: visible[index + 1]!.key } : NONE;
    case "ArrowUp":
      return index > 0 ? { type: "focus", key: visible[index - 1]!.key } : NONE;
    case "Home":
      return index > 0 ? { type: "focus", key: visible[0]!.key } : NONE;
    case "End":
      return index < visible.length - 1 ? { type: "focus", key: visible[visible.length - 1]!.key } : NONE;
    case "ArrowRight": {
      if (!isExpandable(node)) return NONE;
      if (collapsed.has(node.key)) return { type: "expand", keys: [node.key] };
      const first = node.childKeys[0];
      return first !== undefined ? { type: "focus", key: first } : NONE;
    }
    case "ArrowLeft":
      if (isExpandable(node) && !collapsed.has(node.key)) return { type: "collapse", key: node.key };
      return node.parentKey !== null ? { type: "focus", key: node.parentKey } : NONE;
    case "*": {
      const siblings = node.parentKey === null ? tree.roots : (tree.nodes.get(node.parentKey)?.childKeys ?? []);
      const keys = siblings.filter((sibling) => {
        const candidate = tree.nodes.get(sibling);
        return candidate !== undefined && isExpandable(candidate) && collapsed.has(sibling);
      });
      return keys.length > 0 ? { type: "expand", keys } : NONE;
    }
  }
}

/** Case- and accent-insensitive form of a row name for type-ahead («Línea» matches «li»). */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trimStart();
}

/**
 * Type-ahead: the index of the row whose name starts with what was typed, or -1. One character (or the
 * same character repeated) cycles through the matches after the current row; a longer string keeps the
 * current row while it still matches. Wraps around.
 */
export function typeaheadIndex(names: readonly string[], currentIndex: number, typed: string): number {
  const query = normalizeName(typed);
  if (query.length === 0 || names.length === 0) return -1;
  const first = query[0]!;
  const repeated = [...query].every((char) => char === first);
  const prefix = repeated ? first : query;
  const from = currentIndex < 0 ? 0 : repeated ? currentIndex + 1 : currentIndex;
  for (let step = 0; step < names.length; step++) {
    const index = (from + step) % names.length;
    if (normalizeName(names[index] ?? "").startsWith(prefix)) return index;
  }
  return -1;
}

/* ------------------------------------------------------------------------------------------------ */
/* Focus when rows disappear                                                                        */
/* ------------------------------------------------------------------------------------------------ */

/**
 * Where focus goes when the row `key` is deleted with its descendants: the next visible row that stays,
 * else the previous one, else `null` (the tree becomes empty). A group row whose children all go
 * («Superpuestos» after removing its last overlay) goes too.
 */
export function focusAfterRemoval(tree: LayerTree, visible: readonly LayerNode[], key: string): string | null {
  const removed = subtreeKeys(tree, key);
  for (const ancestor of ancestorKeys(tree, key)) {
    const node = tree.nodes.get(ancestor);
    if (!node || node.kind === "block" || !node.childKeys.every((child) => removed.has(child))) break;
    removed.add(ancestor);
  }
  const index = visible.findIndex((node) => node.key === key);
  if (index < 0) return visible.find((node) => !removed.has(node.key))?.key ?? null;
  for (let i = index + 1; i < visible.length; i++) if (!removed.has(visible[i]!.key)) return visible[i]!.key;
  for (let i = index - 1; i >= 0; i--) if (!removed.has(visible[i]!.key)) return visible[i]!.key;
  return null;
}

/**
 * The row to focus when the focused row `lost` vanished from outside (undo, redo, another panel): the
 * first row after it in the previous list that still exists, else the nearest one before it, else the
 * first current row.
 */
export function fallbackKey(previous: readonly string[], current: readonly string[], lost: string): string | null {
  const exists = new Set(current);
  const index = previous.indexOf(lost);
  if (index >= 0) {
    for (let i = index + 1; i < previous.length; i++) if (exists.has(previous[i]!)) return previous[i]!;
    for (let i = index - 1; i >= 0; i--) if (exists.has(previous[i]!)) return previous[i]!;
  }
  return current[0] ?? null;
}
