import type { GridRect, LibraryBlockType } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout as layoutText } from "../../../i18n/layout";
import { getStructure } from "../structureCache";
import { createLayoutStore, selectActiveScreen, selectSelectedId } from "../useLayoutStore";
import { buildWarningViews, sameWarningViews } from "./BlockFrame/blockFrameProps";
import { askingStillValid, focusAfterChange, moveGesture, promoteToMove, stackingOrder, warningsByBlock } from "./gestures";

/*
 * Canvas flows against the real layout store: where the canvas reads its undo tokens, how it settles a
 * keyboard grab before a pointer move, where focus goes after undo, the stacking of nested blocks and the
 * warning views it hands to the memoised blocks.
 */

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

function setup() {
  let n = 0;
  const store = createLayoutStore({
    newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
    labelFor: (type: LibraryBlockType) => `Default ${type}`,
    shortcutsEnabled: true,
  });
  const actions = store.getState().actions;
  const layout = () => selectActiveScreen(store.getState())!.layout;
  const block = (id: string) => layout().blocks[id];
  actions.addScreen("blank", "landing");
  store.temporal.getState().clear();
  return { store, actions, layout, block };
}

describe("«Deshacer» toasts of the canvas (findings 3 / 9)", () => {
  it("a deletion toast does not undo a later move", () => {
    const { actions, block } = setup();
    const hero = actions.insertBlock("hero", { rect: rect(0, 0, 12, 40) }).id!;
    const features = actions.insertBlock("features", { rect: rect(0, 50, 12, 30) }).id!;
    actions.removeBlocks([hero]);
    const token = actions.changeToken(); // read right after the deletion, as removeBlock does
    actions.setRect(features, rect(0, 90, 12, 30));
    expect(actions.undoIfLatest(token)).toBe(false);
    expect(block(hero)).toBeUndefined();
    expect(block(features)?.rect.row).toBe(90);
  });

  it("a deletion toast does nothing after ⌘Z already brought the block back", () => {
    const { store, actions, block } = setup();
    const hero = actions.insertBlock("hero", { rect: rect(0, 0, 12, 40) }).id!;
    actions.removeBlocks([hero]);
    const token = actions.changeToken();
    store.temporal.getState().undo();
    expect(block(hero)).toBeDefined();
    expect(actions.undoIfLatest(token)).toBe(false);
    expect(block(hero)).toBeDefined();
  });

  it("a deletion toast clicked right away brings the block back", () => {
    const { actions, block } = setup();
    const hero = actions.insertBlock("hero", { rect: rect(0, 0, 12, 40) }).id!;
    actions.removeBlocks([hero]);
    expect(actions.undoIfLatest(actions.changeToken())).toBe(true);
    expect(block(hero)).toBeDefined();
  });

  it("«Ajustado» after a keyboard grab undoes the whole held move (token read after the batch commits)", () => {
    const { actions, block } = setup();
    const a = actions.insertBlock("text", { rect: rect(0, 0, 4, 10) }).id!;
    actions.beginBatch();
    actions.setRect(a, rect(2, 0, 4, 10));
    actions.setRect(a, rect(4, 0, 4, 10));
    actions.commitBatch();
    const token = actions.changeToken();
    expect(actions.undoIfLatest(token)).toBe(true);
    expect(block(a)?.rect).toEqual(rect(0, 0, 4, 10));
  });

  it("«Ajustado» of a drawn box is offered when its batch closes, and undoes the box with its type", () => {
    const { actions, block } = setup();
    actions.beginBatch();
    const drawn = actions.insertBlock("free", { rect: rect(0, 0, 4, 10) }).id!;
    actions.updateBlock(drawn, { type: "calendar" });
    actions.commitBatch();
    const token = actions.changeToken(); // read in closeDrawBatch, after the commit
    expect(block(drawn)?.type).toBe("calendar");
    expect(actions.undoIfLatest(token)).toBe(true);
    expect(block(drawn)).toBeUndefined();
  });
});

describe("a pointer drag of a keyboard-held block (finding 17)", () => {
  it("continues from where the held block is shown", () => {
    const { actions, layout, block } = setup();
    const a = actions.insertBlock("text", { rect: rect(1, 0, 2, 10) }).id!;
    // Space, then ArrowRight ×4: a local preview inside an open batch.
    actions.beginBatch();
    const held = rect(5, 0, 2, 10);
    // Past the drag threshold, `beforeGesture` drops the grab (setRect + commitBatch) before the start is read.
    const settle = () => {
      actions.setRect(a, held);
      actions.commitBatch();
    };
    const move = promoteToMove(a, settle, layout)!;
    expect(move.start).toEqual(held);
    const metrics = { colPx: 100, rowPx: 8, columns: 12 };
    const target = moveGesture(move.start, { x: 550, y: 40 }, { x: 650, y: 40 }, metrics);
    actions.setRect(a, target);
    expect(block(a)?.rect.col).toBe(6);
  });
});

describe("focus after a canvas undo (findings 19 / 23)", () => {
  it("lands on a block that still exists when ⌘Z removes the focused copy", () => {
    const { store, actions, layout } = setup();
    const original = actions.insertBlock("text", { rect: rect(0, 0, 4, 10) }).id!;
    const copy = actions.duplicateBlock(original)!;
    const previousOrder = getStructure(layout()).order;
    store.temporal.getState().undo();
    const blocks = layout().blocks;
    const target = focusAfterChange({
      focused: copy,
      previousOrder,
      exists: (id) => blocks[id] !== undefined,
      selected: selectSelectedId(store.getState()),
    });
    expect(blocks[copy]).toBeUndefined();
    expect(target).toBe(original);
  });
});

describe("«¿Qué es esto?» and screen / device changes (finding 41)", () => {
  it("is no longer valid once the screen or the device changes", () => {
    const { store, actions, layout } = setup();
    const drawn = actions.insertBlock("free", { rect: rect(0, 0, 4, 10) }).id!;
    const valid = () => askingStillValid(store.getState().device, selectActiveScreen(store.getState())?.layout ?? null, drawn);
    expect(valid()).toBe(true);
    actions.setDevice("mobile");
    expect(valid()).toBe(false);
    actions.setDevice("desktop");
    expect(valid()).toBe(true);
    const other = actions.addScreen("blank", "landing")!;
    actions.setActiveScreen(other);
    expect(Object.keys(layout().blocks)).toHaveLength(0);
    expect(valid()).toBe(false);
  });
});

describe("stacking of nested blocks (finding 44)", () => {
  it("a Modal over a container's cards paints above them", () => {
    const { actions, layout } = setup();
    const box = actions.insertBlock("container", { rect: rect(0, 0, 12, 60) }).id!;
    const cards = actions.insertBlock("cards", { rect: rect(0, 0, 12, 20), parentId: box }).id!;
    const modal = actions.insertBlock("modal", { rect: rect(2, 10, 6, 30) }).id!;
    const doc = layout();
    expect(doc.blocks[cards]?.parentId).toBe(box);
    expect(doc.blocks[modal]?.parentId).toBeUndefined();
    const order = stackingOrder(doc, getStructure(doc).order);
    expect(order.get(modal)!).toBeGreaterThan(order.get(cards)!);
    expect(order.get(cards)!).toBeGreaterThan(order.get(box)!);
  });
});

describe("warning views handed to the blocks (finding 54)", () => {
  it("are equal by content across an edit that does not touch them", () => {
    const { actions, layout } = setup();
    const a = actions.insertBlock("text", { rect: rect(0, 0, 6, 10) }).id!;
    const b = actions.insertBlock("text", { rect: rect(0, 40, 6, 10) }).id!;
    const far = actions.insertBlock("text", { rect: rect(0, 80, 6, 10) }).id!;
    // Overlap a and b on purpose (kept as a warning); then move an unrelated block.
    actions.applyFix({ kind: "clip", id: b, rect: rect(3, 5, 6, 10) });
    const viewsOf = () => {
      const doc = layout();
      const label = (id: string) => doc.blocks[id]?.label ?? id;
      return new Map([...warningsByBlock(getStructure(doc).warnings)].map(([id, list]) => [id, buildWarningViews(list, label, layoutText.es)]));
    };
    const before = viewsOf();
    expect(before.size).toBeGreaterThan(0);
    actions.setRect(far, rect(6, 80, 6, 10));
    const after = viewsOf();
    for (const [id, views] of before) {
      expect(after.get(id)).not.toBe(views);
      expect(sameWarningViews(after.get(id), views), id).toBe(true);
    }
    expect(a).toBeDefined();
  });
});
