import { inferStructure } from "@dialmade/layout";
import { fixture, makeLayout, mulberry32, randomLayout, randomSeparableLayout } from "@dialmade/layout/testing";
import { describe, expect, it } from "vitest";
import {
  ancestorKeys,
  buildLayerTree,
  expandedState,
  fallbackKey,
  focusAfterRemoval,
  isTreeNavKey,
  NAV_KEY,
  normalizeName,
  OVERLAYS_KEY,
  subtreeKeys,
  treeNavigation,
  typeaheadIndex,
  visibleNodes,
  type LayerTree,
} from "./layersTree";

const none: ReadonlySet<string> = new Set();
const keysOf = (tree: LayerTree, collapsed: ReadonlySet<string> = none) => visibleNodes(tree, collapsed).map((node) => node.key);
const treeOf = (name: string, nav = false) => buildLayerTree(inferStructure(fixture(name).layout), { nav });
const node = (tree: LayerTree, key: string) => {
  const found = tree.nodes.get(key);
  if (!found) throw new Error(`no node ${key}`);
  return found;
};

/** Container «group» with two children, then a footer, a modal with a form inside and a nested modal. */
const mixed = makeLayout([
  { id: "hero", type: "hero", rect: [0, 0, 12, 20] },
  { id: "group", type: "container", rect: [0, 22, 12, 40] },
  { id: "left", type: "text", rect: [0, 24, 6, 30], parent: "group" },
  { id: "right", type: "media", rect: [6, 24, 6, 30], parent: "group" },
  { id: "footer", type: "footer", rect: [0, 64, 12, 10] },
  { id: "dialog", type: "modal", rect: [3, 10, 6, 30] },
  { id: "form", type: "form", rect: [4, 14, 4, 20], parent: "dialog" },
  { id: "inner-dialog", type: "modal", rect: [0, 30, 4, 10], parent: "group" },
]);

describe("buildLayerTree", () => {
  it("is empty without a structure or blocks", () => {
    expect(buildLayerTree(null).order).toEqual([]);
    expect(treeOf("empty").order).toEqual([]);
    expect(buildLayerTree(null, { nav: true }).order).toEqual([NAV_KEY]);
  });

  it("lists the blocks in the reading order of the structure", () => {
    for (const name of ["holy-grail", "dashboard", "stacked-landing", "bento", "pinwheel", "misaligned", "partial-overlap"]) {
      const structure = inferStructure(fixture(name).layout);
      expect(buildLayerTree(structure).order).toEqual(structure.order);
    }
  });

  it("nests children under their container with levels, positions and set sizes", () => {
    const tree = treeOf("nested-cards");
    expect(tree.roots).toEqual(["navbar", "plans", "footer"]);
    expect(node(tree, "plans").childKeys).toEqual(["card-a", "card-b", "card-c"]);
    expect(node(tree, "card-b")).toMatchObject({ parentKey: "plans", level: 2, posinset: 2, setsize: 3 });
    expect(node(tree, "footer")).toMatchObject({ parentKey: null, level: 1, posinset: 3, setsize: 3 });
  });

  it("puts the navigation frame first and the overlays group last", () => {
    const tree = buildLayerTree(inferStructure(mixed), { nav: true });
    expect(tree.roots).toEqual([NAV_KEY, "hero", "group", "footer", OVERLAYS_KEY]);
    expect(node(tree, NAV_KEY)).toMatchObject({ kind: "nav", level: 1, posinset: 1, setsize: 5 });
    expect(node(tree, OVERLAYS_KEY)).toMatchObject({ kind: "overlays", level: 1, posinset: 5, setsize: 5 });
    // Every overlay leaves the flow, also a modal nested in a container; its own content stays inside it.
    expect(node(tree, OVERLAYS_KEY).childKeys).toEqual(["dialog", "inner-dialog"]);
    expect(node(tree, "group").childKeys).toEqual(["left", "right"]);
    expect(node(tree, "dialog").childKeys).toEqual(["form"]);
    expect(node(tree, "form")).toMatchObject({ level: 3, parentKey: "dialog", posinset: 1, setsize: 1 });
    expect(tree.order).toEqual([NAV_KEY, "hero", "group", "left", "right", "footer", OVERLAYS_KEY, "dialog", "form", "inner-dialog"]);
  });

  it("keeps blocks with a missing parent at the root", () => {
    const layout = makeLayout([
      { id: "orphan", type: "text", rect: [0, 0, 6, 10], parent: "gone" },
      { id: "other", type: "text", rect: [0, 12, 6, 10] },
    ]);
    const tree = buildLayerTree(inferStructure(layout));
    expect(tree.roots).toEqual(["orphan", "other"]);
    expect(node(tree, "orphan").level).toBe(1);
  });

  it("lists every block exactly once, in reading order, for random layouts", () => {
    const rand = mulberry32(7);
    for (let run = 0; run < 60; run++) {
      const layout = run % 2 === 0 ? randomLayout(rand, { maxBlocks: 30 }) : randomSeparableLayout(rand, { maxBlocks: 30, maxDepth: 3 });
      const structure = inferStructure(layout);
      const tree = buildLayerTree(structure);
      const blocks = tree.order.filter((key) => key !== OVERLAYS_KEY);
      expect(blocks).toEqual(structure.order);
      expect(new Set(blocks).size).toBe(Object.keys(layout.blocks).length);
      for (const key of tree.order) {
        const current = node(tree, key);
        const siblings = current.parentKey === null ? tree.roots : node(tree, current.parentKey).childKeys;
        expect(siblings[current.posinset - 1]).toBe(key);
        expect(current.setsize).toBe(siblings.length);
        expect(current.level).toBe(ancestorKeys(tree, key).length + 1);
      }
    }
  });
});

describe("visibleNodes", () => {
  const tree = buildLayerTree(inferStructure(mixed));

  it("shows everything when nothing is collapsed", () => {
    expect(keysOf(tree)).toEqual(tree.order);
  });

  it("hides the descendants of collapsed nodes", () => {
    expect(keysOf(tree, new Set(["group"]))).toEqual(["hero", "group", "footer", OVERLAYS_KEY, "dialog", "form", "inner-dialog"]);
    expect(keysOf(tree, new Set([OVERLAYS_KEY]))).toEqual(["hero", "group", "left", "right", "footer", OVERLAYS_KEY]);
  });

  it("ignores collapsed leaves", () => {
    expect(keysOf(tree, new Set(["hero", "left"]))).toEqual(tree.order);
  });

  it("reports aria-expanded only for nodes with children", () => {
    expect(expandedState(node(tree, "group"), none)).toBe(true);
    expect(expandedState(node(tree, "group"), new Set(["group"]))).toBe(false);
    expect(expandedState(node(tree, "hero"), none)).toBeUndefined();
  });
});

describe("treeNavigation", () => {
  const tree = buildLayerTree(inferStructure(mixed), { nav: true });
  const nav = (current: string | null, key: Parameters<typeof treeNavigation>[4], collapsed: ReadonlySet<string> = none) =>
    treeNavigation(tree, visibleNodes(tree, collapsed), collapsed, current, key);

  it("recognizes its keys", () => {
    expect(isTreeNavKey("ArrowDown")).toBe(true);
    expect(isTreeNavKey("*")).toBe(true);
    expect(isTreeNavKey("Enter")).toBe(false);
    expect(isTreeNavKey(" ")).toBe(false);
  });

  it("moves down and up through the visible rows without wrapping", () => {
    expect(nav("hero", "ArrowDown")).toEqual({ type: "focus", key: "group" });
    expect(nav("group", "ArrowDown")).toEqual({ type: "focus", key: "left" });
    expect(nav("group", "ArrowDown", new Set(["group"]))).toEqual({ type: "focus", key: "footer" });
    expect(nav("inner-dialog", "ArrowDown")).toEqual({ type: "none" });
    expect(nav("footer", "ArrowUp")).toEqual({ type: "focus", key: "right" });
    expect(nav(NAV_KEY, "ArrowUp")).toEqual({ type: "none" });
  });

  it("goes to the first and last visible rows", () => {
    expect(nav("left", "Home")).toEqual({ type: "focus", key: NAV_KEY });
    expect(nav("left", "End")).toEqual({ type: "focus", key: "inner-dialog" });
    expect(nav("left", "End", new Set([OVERLAYS_KEY]))).toEqual({ type: "focus", key: OVERLAYS_KEY });
    expect(nav(NAV_KEY, "Home")).toEqual({ type: "none" });
  });

  it("opens with → and then enters the first child", () => {
    expect(nav("group", "ArrowRight", new Set(["group"]))).toEqual({ type: "expand", keys: ["group"] });
    expect(nav("group", "ArrowRight")).toEqual({ type: "focus", key: "left" });
    expect(nav("hero", "ArrowRight")).toEqual({ type: "none" });
  });

  it("closes with ← and then goes to the parent", () => {
    expect(nav("group", "ArrowLeft")).toEqual({ type: "collapse", key: "group" });
    expect(nav("right", "ArrowLeft")).toEqual({ type: "focus", key: "group" });
    expect(nav("form", "ArrowLeft")).toEqual({ type: "focus", key: "dialog" });
    expect(nav("group", "ArrowLeft", new Set(["group"]))).toEqual({ type: "none" });
    expect(nav("hero", "ArrowLeft")).toEqual({ type: "none" });
  });

  it("opens every closed sibling with *", () => {
    const collapsed = new Set(["group", OVERLAYS_KEY, "dialog"]);
    expect(nav("hero", "*", collapsed)).toEqual({ type: "expand", keys: ["group", OVERLAYS_KEY] });
    expect(nav("hero", "*")).toEqual({ type: "none" });
  });

  it("focuses the first row when the focused one is unknown", () => {
    expect(nav(null, "ArrowDown")).toEqual({ type: "focus", key: NAV_KEY });
    expect(nav("gone", "End")).toEqual({ type: "focus", key: NAV_KEY });
    expect(treeNavigation(buildLayerTree(null), [], none, null, "ArrowDown")).toEqual({ type: "none" });
  });
});

describe("type-ahead", () => {
  const names = ["Navbar", "Hero", "Hoja de precios", "Línea de tiempo", "Lista", "Footer"];

  it("normalizes case and accents", () => {
    expect(normalizeName("  Línea Ñ")).toBe("linea n");
  });

  it("cycles through the rows starting with one letter", () => {
    expect(typeaheadIndex(names, 0, "h")).toBe(1);
    expect(typeaheadIndex(names, 1, "h")).toBe(2);
    expect(typeaheadIndex(names, 2, "h")).toBe(1);
    expect(typeaheadIndex(names, 2, "hh")).toBe(1);
  });

  it("matches longer prefixes from the current row, ignoring accents", () => {
    expect(typeaheadIndex(names, 3, "li")).toBe(3);
    expect(typeaheadIndex(names, 3, "lis")).toBe(4);
    expect(typeaheadIndex(names, 0, "LINEA")).toBe(3);
    expect(typeaheadIndex(names, 0, "hoja d")).toBe(2);
  });

  it("wraps around and reports no match", () => {
    expect(typeaheadIndex(names, 5, "n")).toBe(0);
    expect(typeaheadIndex(names, 0, "z")).toBe(-1);
    expect(typeaheadIndex(names, 0, "")).toBe(-1);
    expect(typeaheadIndex([], 0, "a")).toBe(-1);
    expect(typeaheadIndex(names, -1, "n")).toBe(0);
  });
});

describe("focus when rows disappear", () => {
  const tree = buildLayerTree(inferStructure(mixed), { nav: true });
  const visible = visibleNodes(tree, none);

  it("collects subtrees and ancestors", () => {
    expect([...subtreeKeys(tree, "group")].sort()).toEqual(["group", "left", "right"]);
    expect(ancestorKeys(tree, "form")).toEqual(["dialog", OVERLAYS_KEY]);
    expect(ancestorKeys(tree, "hero")).toEqual([]);
  });

  it("moves to the next row that stays after a removal, skipping the removed subtree", () => {
    expect(focusAfterRemoval(tree, visible, "group")).toBe("footer");
    expect(focusAfterRemoval(tree, visible, "left")).toBe("right");
    expect(focusAfterRemoval(tree, visible, "form")).toBe("inner-dialog");
  });

  it("falls back to the previous row and drops an emptied group", () => {
    const single = buildLayerTree(
      inferStructure(
        makeLayout([
          { id: "hero", type: "hero", rect: [0, 0, 12, 20] },
          { id: "dialog", type: "modal", rect: [3, 10, 6, 30] },
        ]),
      ),
    );
    expect(focusAfterRemoval(single, visibleNodes(single, none), "dialog")).toBe("hero");
    expect(focusAfterRemoval(tree, visible, "inner-dialog")).toBe("form");
  });

  it("returns null when the tree becomes empty", () => {
    const lone = treeOf("single");
    expect(focusAfterRemoval(lone, visibleNodes(lone, none), "intro")).toBeNull();
  });

  it("finds a replacement for a row that vanished from outside", () => {
    const previous = ["a", "b", "c", "d"];
    expect(fallbackKey(previous, ["a", "c", "d"], "b")).toBe("c");
    expect(fallbackKey(previous, ["a", "b"], "d")).toBe("b");
    expect(fallbackKey(previous, ["x"], "b")).toBe("x");
    expect(fallbackKey(previous, [], "b")).toBeNull();
    expect(fallbackKey([], ["x", "y"], "b")).toBe("x");
  });
});
