import { describe, expect, it } from "vitest";
import { AI_RUN_IDLE, aiRunReducer, aiTargetsFor, chipView, countBlockStates, type AiRunState } from "./generateFlow";
import { createLayoutStore, selectChangedBlocks, selectHasGenerated } from "./useLayoutStore";

describe("aiTargetsFor", () => {
  it("nothing changed («Generar de nuevo»): every screen whole", () => {
    expect(
      aiTargetsFor([
        { screenId: "s-a", changed: [], all: false },
        { screenId: "s-b", changed: [], all: false },
      ]),
    ).toEqual([{ id: "s-a" }, { id: "s-b" }]);
  });

  it("a never generated screen goes whole; a changed one sends only its changed sections; the rest stays out", () => {
    expect(
      aiTargetsFor([
        { screenId: "s-a", changed: ["b1", "b2"], all: true },
        { screenId: "s-b", changed: [], all: false },
        { screenId: "s-c", changed: ["b9"], all: false },
      ]),
    ).toEqual([{ id: "s-a" }, { id: "s-c", sectionIds: ["b9"] }]);
  });

  it("an absorbed block is sent as its host section, once", () => {
    const absorbed = { media: "hero", text: "hero" };
    expect(aiTargetsFor([{ screenId: "s-a", changed: ["media", "text", "cards"], all: false }], () => absorbed)).toEqual([
      { id: "s-a", sectionIds: ["hero", "cards"] },
    ]);
  });
});

describe("aiRunReducer", () => {
  const writing = aiRunReducer(AI_RUN_IDLE, { type: "start", spends: true });

  it("start → writing → done with the summary", () => {
    expect(writing).toEqual({ kind: "writing", spends: true });
    expect(aiRunReducer(writing, { type: "applied", done: 4, stale: 1 })).toEqual({ kind: "done", done: 4, stale: 1 });
  });

  it("a cancel while writing says whether the hosted use was already spent; nothing lands after it", () => {
    const cancelled = aiRunReducer(writing, { type: "cancel" });
    expect(cancelled).toEqual({ kind: "cancelled", spent: true });
    expect(aiRunReducer(aiRunReducer(AI_RUN_IDLE, { type: "start", spends: false }), { type: "cancel" })).toEqual({ kind: "cancelled", spent: false });
    expect(aiRunReducer(cancelled, { type: "applied", done: 3, stale: 0 })).toBe(cancelled);
    expect(aiRunReducer(cancelled, { type: "failed", message: "x", fallback: null })).toBe(cancelled);
  });

  it("failures keep the message and the way out", () => {
    expect(aiRunReducer(writing, { type: "failed", message: "Sin usos", fallback: "free-tier-exhausted" })).toEqual({
      kind: "failed",
      message: "Sin usos",
      fallback: "free-tier-exhausted",
    });
  });

  it("«mi Claude»: waiting for the answer, then done; never interrupts a request in flight", () => {
    const manual = aiRunReducer(AI_RUN_IDLE, { type: "manual" });
    expect(manual).toEqual({ kind: "manual" });
    expect(aiRunReducer(manual, { type: "applied", done: 2, stale: 0, manual: true })).toEqual({ kind: "done", done: 2, stale: 0 });
    expect(aiRunReducer(writing, { type: "manual" })).toBe(writing);
    // Only a request's own answer lands while it writes; a pasted one waits for it to end.
    expect(aiRunReducer(writing, { type: "applied", done: 2, stale: 0, manual: true })).toBe(writing);
    // The way out of a failure or a cancel: the pasted answer lands there too.
    const failed = aiRunReducer(writing, { type: "failed", message: "x", fallback: "daily-limit" });
    expect(aiRunReducer(failed, { type: "applied", done: 1, stale: 0, manual: true })).toEqual({ kind: "done", done: 1, stale: 0 });
    expect(aiRunReducer(AI_RUN_IDLE, { type: "applied", done: 1, stale: 0, manual: true })).toBe(AI_RUN_IDLE);
  });

  it("cancel outside a request and late answers are ignored; reset always goes back to idle", () => {
    const done: AiRunState = { kind: "done", done: 1, stale: 0 };
    expect(aiRunReducer(done, { type: "cancel" })).toBe(done);
    expect(aiRunReducer(AI_RUN_IDLE, { type: "applied", done: 1, stale: 0 })).toBe(AI_RUN_IDLE);
    expect(aiRunReducer(done, { type: "reset" })).toEqual(AI_RUN_IDLE);
    // A retry starts a new request from any state.
    expect(aiRunReducer(done, { type: "start", spends: false })).toEqual({ kind: "writing", spends: false });
  });
});

describe("chipView", () => {
  it("Escribiendo · Listo · Sin cambios · Error (+ Reintentar only when a retry can start)", () => {
    expect(chipView("writing", true)).toEqual({ state: "writing", tone: "muted", busy: true, retry: false });
    expect(chipView("done", true)).toEqual({ state: "done", tone: "success", busy: false, retry: false });
    expect(chipView("unchanged", true)).toEqual({ state: "unchanged", tone: "muted", busy: false, retry: false });
    expect(chipView("error", true)).toEqual({ state: "error", tone: "danger", busy: false, retry: true });
    expect(chipView("error", false).retry).toBe(false);
  });

  it("countBlockStates", () => {
    expect(countBlockStates({ "s/a": "done", "s/b": "error", "t/a": "done", "t/c": "unchanged" })).toEqual({
      writing: 0,
      done: 2,
      unchanged: 1,
      error: 1,
    });
  });
});

describe("store: refused Generate, changed blocks", () => {
  function setup() {
    let n = 0;
    return createLayoutStore({
      newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
      labelFor: (type) => type,
      screenNameFor: (id) => id,
      shortcutsEnabled: true,
    });
  }

  it("a Generate the flow refuses stores nothing: «Regenerar N» keeps counting", () => {
    const store = setup();
    const { actions } = store.getState();
    actions.applySet("landing");
    actions.generate();
    const before = store.getState();
    const [screenId] = before.screenOrder;
    const blockId = Object.keys(before.screens[screenId!]!.layout.blocks)[0]!;
    actions.updateBlock(blockId, { note: "con video" });
    expect(actions.changedCount()).toBe(1);

    let asked = 0;
    const result = actions.generate({
      accept: () => {
        asked++;
        return false;
      },
    });
    expect(asked).toBe(1);
    expect(result.changed).toBe(1);
    expect(store.getState().generated).toBe(before.generated);
    expect(store.getState().generatedPrints).toBe(before.generatedPrints);
    expect(actions.changedCount()).toBe(1);

    // Accepted: stored as usual.
    const accepted = actions.generate({ accept: () => true });
    expect(store.getState().generated).toBe(accepted);
    expect(actions.changedCount()).toBe(0);
  });

  it("selectChangedBlocks: all blocks of a new screen, then only the changed ones", () => {
    const store = setup();
    const { actions } = store.getState();
    actions.applySet("landing");
    const first = selectChangedBlocks(store.getState());
    expect(first.every((screen) => screen.all && screen.changed.length > 0)).toBe(true);
    expect(selectHasGenerated(store.getState())).toBe(false);

    actions.generate();
    expect(selectHasGenerated(store.getState())).toBe(true);
    expect(selectChangedBlocks(store.getState()).every((screen) => !screen.all && screen.changed.length === 0)).toBe(true);

    const [screenId] = store.getState().screenOrder;
    const blockId = Object.keys(store.getState().screens[screenId!]!.layout.blocks)[1]!;
    actions.updateBlock(blockId, { note: "tres planes" });
    const changed = selectChangedBlocks(store.getState());
    expect(changed[0]).toEqual({ screenId, changed: [blockId], all: false });
    expect(aiTargetsFor(changed)).toEqual([{ id: screenId, sectionIds: [blockId] }]);
  });
});
