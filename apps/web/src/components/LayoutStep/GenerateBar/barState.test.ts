import type { LayoutBlock, LayoutDoc, LayoutWarning, ScreenTemplateId } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { createLayoutStore, selectActiveScreen, selectChangedCount, selectPendingChanges } from "../useLayoutStore";
import { countStats, ctaHint, ctaState, replaceWithTemplateSet, templateSetFor } from "./barState";

const NAMES: Record<ScreenTemplateId, string> = {
  home: "Inicio",
  pricing: "Precios",
  login: "Login",
  dashboard: "Dashboard",
  settings: "Ajustes",
  detail: "Detalle",
  list: "Lista",
  checkout: "Checkout",
  profile: "Perfil",
  blank: "En blanco",
};

function setup() {
  let n = 0;
  const store = createLayoutStore({
    newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
    labelFor: (type) => type,
    screenNameFor: (id) => NAMES[id],
    shortcutsEnabled: true,
  });
  return store;
}

const block = (type: LayoutBlock["type"], row: number): LayoutBlock => ({ type, label: type, rect: { col: 0, row, w: 12, h: 8 }, z: 0 });
const layoutOf = (...blocks: LayoutBlock[]): LayoutDoc => ({
  version: 1,
  columns: 12,
  rowUnit: 8,
  blocks: Object.fromEntries(blocks.map((b, i) => [`b-00000${i}`, b])),
});
const warning: LayoutWarning = { code: "overlap", ids: ["b-000000", "b-000001"], fixes: [] };

describe("countStats", () => {
  it("counts screens, blocks, free blocks and warnings", () => {
    expect(
      countStats([
        { layout: layoutOf(block("hero", 0), block("free", 10)), warnings: [warning] },
        { layout: layoutOf(block("free", 0)), warnings: [] },
        { layout: layoutOf(), warnings: [warning, warning] },
      ]),
    ).toEqual({ screens: 3, blocks: 3, free: 2, warnings: 3 });
  });

  it("is all zeros without screens", () => {
    expect(countStats([])).toEqual({ screens: 0, blocks: 0, free: 0, warnings: 0 });
  });
});

describe("ctaState", () => {
  it("offers the template that matches the active screen when no screen has blocks", () => {
    expect(ctaState({ blocks: 0, generated: false, changed: 0, activeKind: "landing" })).toEqual({ kind: "template", set: "landing" });
    expect(ctaState({ blocks: 0, generated: true, changed: 4, activeKind: "app" })).toEqual({ kind: "template", set: "saas-app" });
    expect(ctaState({ blocks: 0, generated: false, changed: 0, activeKind: null })).toEqual({ kind: "template", set: "landing" });
  });

  it("generates first, then regenerates the changed blocks, then generates again", () => {
    expect(ctaState({ blocks: 5, generated: false, changed: 5, activeKind: "app" })).toEqual({ kind: "generate" });
    expect(ctaState({ blocks: 5, generated: true, changed: 2, activeKind: "app" })).toEqual({ kind: "regenerate", count: 2 });
    expect(ctaState({ blocks: 5, generated: true, changed: 0, activeKind: "app" })).toEqual({ kind: "again" });
  });

  it("maps screen kinds to sets", () => {
    expect(templateSetFor("app")).toBe("saas-app");
    expect(templateSetFor("landing")).toBe("landing");
    expect(templateSetFor(null)).toBe("landing");
  });
});

describe("replaceWithTemplateSet", () => {
  it("replaces the empty screens with the set in one undo step", () => {
    const store = setup();
    const { actions } = store.getState();
    const blank = actions.addScreen("blank", "landing")!;
    store.temporal.getState().clear();

    const created = replaceWithTemplateSet(actions, store.getState().screenOrder, "landing");

    const state = store.getState();
    expect(created).toHaveLength(2);
    expect(state.screenOrder).toEqual(created);
    expect(state.screens[blank]).toBeUndefined();
    expect(selectActiveScreen(state)?.name).toBe("Inicio");
    expect(Object.keys(selectActiveScreen(state)!.layout.blocks).length).toBeGreaterThan(0);
    expect(store.temporal.getState().pastStates).toHaveLength(1);

    store.temporal.getState().undo();
    expect(store.getState().screenOrder).toEqual([blank]);
    expect(selectActiveScreen(store.getState())?.id).toBe(blank);
  });

  it("uses the SaaS set for app screens and keeps the screens when the set adds nothing", () => {
    const store = setup();
    const { actions } = store.getState();
    const first = actions.addScreen("blank", "app")!;
    const second = actions.addScreen("blank", "app")!;
    const created = replaceWithTemplateSet(actions, [first, second], templateSetFor("app"));
    expect(created.map((id) => store.getState().screens[id]?.name)).toEqual(["Dashboard", "Ajustes", "Login"]);
    expect(store.getState().screens[first]).toBeUndefined();
    expect(store.getState().screens[second]).toBeUndefined();

    const noop = {
      beginBatch: () => {},
      commitBatch: () => {},
      applySet: () => [],
      removeScreen: () => {
        throw new Error("must not remove screens when nothing was added");
      },
    };
    expect(replaceWithTemplateSet(noop, ["s-1"], "landing")).toEqual([]);
  });
});

describe("ctaHint (review B #40)", () => {
  it("says «no changes» only when nothing would change: a rename or a move after Generar is pending, not up to date", () => {
    const store = createLayoutStore({ screenNameFor: (id) => `Pantalla ${id}` });
    const { actions } = store.getState();
    const [home] = actions.applySet("landing");
    const { screens, screenOrder } = store.getState();
    const doc = { screens: Object.fromEntries(screenOrder.map((id) => [id, { ...screens[id]!, page: {} }])), screenOrder };
    actions.generate();
    actions.markSynced(doc as never);
    const hint = () => {
      const state = store.getState();
      const cta = ctaState({ blocks: 1, generated: true, changed: selectChangedCount(state), activeKind: "landing" });
      return ctaHint(cta, { aiOn: false, pending: selectPendingChanges(state, doc as never) });
    };
    expect(hint()).toBe("upToDate");
    // A rename is not a «Regenerar N» block, but «Generar» writes it.
    actions.renameScreen(home!, "Portada");
    expect(selectChangedCount(store.getState())).toBe(0);
    expect(hint()).toBe("noAi");
    actions.undo();
    expect(hint()).toBe("upToDate");
  });

  it("the template and AI hints win", () => {
    expect(ctaHint({ kind: "template", set: "landing" }, { aiOn: true, pending: true })).toBe("empty");
    expect(ctaHint({ kind: "again" }, { aiOn: true, pending: false })).toBe("ai");
    expect(ctaHint({ kind: "regenerate", count: 2 }, { aiOn: false, pending: true })).toBe("noAi");
  });
});
