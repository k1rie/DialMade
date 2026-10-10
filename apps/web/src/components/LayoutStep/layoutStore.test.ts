import { getScreenTemplate, type GridRect, type LibraryBlockType, type ScreenTemplateId } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { createLayoutStore, selectActiveScreen, selectActiveScreenId, selectSelectedId, slugify, type LayoutStoreInit } from "./useLayoutStore";

const SCREEN_NAMES: Record<ScreenTemplateId, string> = {
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

/** Deterministic random source (mulberry32) for the ids the package creates itself. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const label = (type: LibraryBlockType) => `Default ${type}`;

function setup(init: LayoutStoreInit = {}) {
  let n = 0;
  const store = createLayoutStore({
    newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
    random: seeded(7),
    labelFor: label,
    screenNameFor: (id) => SCREEN_NAMES[id],
    copyName: (name) => `${name} (copia)`,
    shortcutsEnabled: true,
    ...init,
  });
  const state = () => store.getState();
  const actions = state().actions;
  const history = () => store.temporal.getState();
  const active = () => selectActiveScreen(state())!;
  const block = (id: string) => active().layout.blocks[id]!;
  /** A blank landing screen with a clean history. */
  const blank = (kind: "landing" | "app" = "landing") => {
    const id = actions.addScreen("blank", kind)!;
    history().clear();
    return id;
  };
  return { store, state, actions, history, active, block, blank };
}

const rect = (col: number, row: number, w: number, h: number): GridRect => ({ col, row, w, h });

describe("screens from templates", () => {
  it("applySet «SaaS app» creates Dashboard, Ajustes and Login as app screens with their shells", () => {
    const { state, actions, history } = setup();
    const ids = actions.applySet("saas-app");
    expect(ids).toHaveLength(3);
    expect(state().screenOrder).toEqual(ids);
    const [dashboard, settings, login] = ids.map((id) => state().screens[id]!);
    expect([dashboard!.name, settings!.name, login!.name]).toEqual(["Dashboard", "Ajustes", "Login"]);
    expect([dashboard!.route, settings!.route, login!.route]).toEqual(["/dashboard", "/ajustes", "/login"]);
    expect(ids.map((id) => state().screens[id]!.kind)).toEqual(["app", "app", "app"]);
    expect(dashboard!.shell).toEqual({ nav: "sidebar", header: true });
    expect(settings!.shell).toEqual({ nav: "sidebar", header: true });
    expect(login!.shell).toEqual({ nav: "none", header: false });
    expect(Object.keys(dashboard!.layout.blocks)).toHaveLength(getScreenTemplate("dashboard").blocks.length);
    expect(Object.values(dashboard!.layout.blocks).map((b) => b.label)).toContain("Default kpis");
    expect(selectActiveScreenId(state())).toBe(ids[0]);
    expect(history().pastStates).toHaveLength(1);
  });

  it("applySet «Landing» creates Inicio at / and Precios as landing screens without shell", () => {
    const { state, actions } = setup();
    const ids = actions.applySet("landing");
    const screens = ids.map((id) => state().screens[id]!);
    expect(screens.map((s) => [s.name, s.kind, s.route, s.shell])).toEqual([
      ["Inicio", "landing", "/", null],
      ["Precios", "landing", "/precios", null],
    ]);
    // Block ids are unique across the whole project.
    const all = screens.flatMap((s) => Object.keys(s.layout.blocks));
    expect(new Set(all).size).toBe(all.length);
  });

  it("addScreen: «En blanco» needs a kind; app screens share the current navigation; names stay unique", () => {
    const { state, actions } = setup();
    expect(actions.addScreen("blank")).toBeNull();
    actions.applySet("saas-app");
    actions.setShell(state().screenOrder[0]!, { nav: "rail" });
    // Read the id first: `state()` must be called after the action.
    const add = (...args: Parameters<typeof actions.addScreen>) => {
      const id = actions.addScreen(...args)!;
      return state().screens[id]!;
    };
    expect(add("blank", "app").shell).toEqual({ nav: "rail", header: true });
    const second = add("dashboard");
    expect(second.name).toBe("Dashboard 2");
    expect(second.route).toBe("/dashboard-2");
    expect(second.shell?.nav).toBe("rail");
    const landing = add("blank", "landing");
    expect(landing.route).toBe("/");
    expect(landing.shell).toBeNull();
  });

  it("undoing a new screen falls back to an existing active screen", () => {
    const { state, actions, history } = setup();
    actions.applySet("landing");
    const added = actions.addScreen("login")!;
    expect(selectActiveScreenId(state())).toBe(added);
    history().undo();
    expect(state().screens[added]).toBeUndefined();
    expect(selectActiveScreenId(state())).toBe(state().screenOrder[0]);
  });
});

describe("block edits", () => {
  it("insertBlock is one undo step, uses the i18n label and selects the block", () => {
    const { state, actions, history, block, blank } = setup();
    blank();
    const outcome = actions.insertBlock("calendar");
    expect(outcome.nav).toBeNull();
    const id = outcome.id!;
    expect(block(id)).toMatchObject({ type: "calendar", label: "Default calendar" });
    expect(selectSelectedId(state())).toBe(id);
    expect(history().pastStates).toHaveLength(1);
    history().undo();
    expect(selectActiveScreen(state())!.layout.blocks[id]).toBeUndefined();
  });

  it("insertBlock ignores a parent that does not exist and nests into one that does", () => {
    const { actions, block, blank } = setup();
    blank();
    const container = actions.insertBlock("container").id!;
    const loose = actions.insertBlock("text", { parentId: "b-nope00" }).id!;
    expect(block(loose).parentId).toBeUndefined();
    const child = actions.insertBlock("text", { parentId: container }).id!;
    expect(block(child).parentId).toBe(container);
  });

  it("setRect clamps into the grid, nests into a container and clips small overlaps", () => {
    const { state, actions, block, blank } = setup();
    blank();
    const a = actions.insertBlock("text", { rect: rect(0, 0, 6, 20) }).id!;
    const b = actions.insertBlock("text").id!;
    expect(block(b).rect).toEqual(rect(6, 0, 6, 20));

    const clamp = actions.setRect(b, rect(10, 0, 6, 20));
    expect(clamp).toEqual([{ kind: "clamp", id: b, from: rect(10, 0, 6, 20), to: rect(6, 0, 6, 20) }]);
    expect(state().lastAdjustments).toEqual(clamp);
    const tick = state().adjustmentsTick;

    const clip = actions.setRect(b, rect(0, 19, 6, 20));
    expect(clip).toEqual([{ kind: "clip", id: a, from: rect(0, 0, 6, 20), to: rect(0, 0, 6, 19) }]);
    expect(block(a).rect).toEqual(rect(0, 0, 6, 19));
    expect(state().adjustmentsTick).toBe(tick + 1);

    const container = actions.insertBlock("container", { rect: rect(0, 60, 12, 40) }).id!;
    const nest = actions.setRect(b, rect(1, 62, 4, 10));
    expect(nest).toEqual([{ kind: "nest", id: b, parentId: container }]);
    expect(block(b).parentId).toBe(container);

    expect(actions.setRect(b, rect(1, 62, 4, 10))).toEqual([]);
    expect(actions.setRect("b-nope00", rect(0, 0, 1, 1))).toEqual([]);
  });

  it("a batch of several setRects is one undo step", () => {
    const { actions, history, block, blank } = setup();
    blank();
    const id = actions.insertBlock("text", { rect: rect(0, 0, 4, 10) }).id!;
    const before = history().pastStates.length;
    actions.beginBatch();
    actions.setRect(id, rect(1, 0, 4, 10));
    actions.setRect(id, rect(2, 0, 4, 10));
    actions.setRect(id, rect(2, 1, 4, 11));
    actions.commitBatch();
    expect(block(id).rect).toEqual(rect(2, 1, 4, 11));
    expect(history().pastStates).toHaveLength(before + 1);
    history().undo();
    expect(block(id).rect).toEqual(rect(0, 0, 4, 10));
    history().redo();
    expect(block(id).rect).toEqual(rect(2, 1, 4, 11));
  });

  it("an empty batch adds no undo step", () => {
    const { actions, history, blank } = setup();
    blank();
    actions.beginBatch();
    actions.commitBatch();
    expect(history().pastStates).toHaveLength(0);
  });

  it("cancelBatch restores the screens and records nothing", () => {
    const { actions, history, block, blank } = setup();
    blank();
    const id = actions.insertBlock("text", { rect: rect(0, 0, 4, 10) }).id!;
    const before = history().pastStates.length;
    actions.beginBatch();
    actions.setRect(id, rect(5, 3, 4, 10));
    actions.setRect(id, rect(6, 3, 4, 10));
    actions.cancelBatch();
    expect(block(id).rect).toEqual(rect(0, 0, 4, 10));
    expect(history().pastStates).toHaveLength(before);
    expect(history().futureStates).toHaveLength(0);
    // History works normally after a cancel.
    actions.setRect(id, rect(1, 0, 4, 10));
    expect(history().pastStates).toHaveLength(before + 1);
  });

  it("removeBlocks removes descendants and clears the selection", () => {
    const { state, actions, active, blank } = setup();
    blank();
    const container = actions.insertBlock("container").id!;
    const child = actions.insertBlock("text", { parentId: container }).id!;
    actions.select(container);
    const removed = actions.removeBlocks([container]);
    expect(removed.sort()).toEqual([container, child].sort());
    expect(state().selectedId).toBeNull();
    expect(Object.keys(active().layout.blocks)).toEqual([]);
    expect(actions.removeBlocks(["b-nope00"])).toEqual([]);
  });

  it("undo restores blocks; a selection whose block is gone reads null", () => {
    const { state, actions, history, blank } = setup();
    blank();
    const id = actions.insertBlock("table").id!;
    expect(selectSelectedId(state())).toBe(id);
    history().undo();
    expect(selectSelectedId(state())).toBeNull();
    history().redo();
    expect(selectSelectedId(state())).toBe(id);

    actions.removeBlocks([id]);
    history().undo();
    expect(selectActiveScreen(state())!.layout.blocks[id]).toBeDefined();
    expect(selectSelectedId(state())).toBeNull();
  });

  it("duplicateBlock copies the subtree with new ids and selects the copy", () => {
    const { state, actions, active, blank } = setup();
    blank();
    const container = actions.insertBlock("container").id!;
    actions.insertBlock("text", { parentId: container });
    const copy = actions.duplicateBlock(container)!;
    expect(copy).not.toBe(container);
    expect(selectSelectedId(state())).toBe(copy);
    const blocks = active().layout.blocks;
    expect(Object.keys(blocks)).toHaveLength(4);
    expect(Object.values(blocks).filter((b) => b.parentId === copy)).toHaveLength(1);
    expect(actions.duplicateBlock("b-nope00")).toBeNull();
  });

  it("applyFix applies a warning fix as one step", () => {
    const { actions, history, block, blank } = setup();
    blank();
    const container = actions.insertBlock("container", { rect: rect(0, 0, 12, 40) }).id!;
    const text = actions.insertBlock("text", { rect: rect(0, 50, 4, 10) }).id!;
    const before = history().pastStates.length;
    expect(actions.applyFix({ kind: "nest", id: text, parentId: container })).toBe(true);
    expect(block(text).parentId).toBe(container);
    expect(history().pastStates).toHaveLength(before + 1);
    expect(actions.applyFix({ kind: "nest", id: "b-nope00", parentId: container })).toBe(false);
  });
});

describe("app navigation frame", () => {
  it("a frame block on an app screen sets the shared nav instead of adding a block", () => {
    const { state, actions, history, active } = setup();
    const [dashboard, settings, login] = actions.applySet("saas-app");
    const blocksBefore = Object.keys(active().layout.blocks).length;
    history().clear();
    expect(actions.insertBlock("navbar")).toEqual({ id: null, nav: "topnav", adjustments: [] });
    expect(Object.keys(active().layout.blocks)).toHaveLength(blocksBefore);
    expect(state().screens[dashboard!]!.shell?.nav).toBe("topnav");
    expect(state().screens[settings!]!.shell?.nav).toBe("topnav");
    expect(state().screens[login!]!.shell?.nav).toBe("none");
    expect(history().pastStates).toHaveLength(1);
    history().undo();
    expect(state().screens[dashboard!]!.shell?.nav).toBe("sidebar");
    expect(state().screens[settings!]!.shell?.nav).toBe("sidebar");
  });

  it("on a landing screen a navbar is a block", () => {
    const { actions, block, blank } = setup();
    blank("landing");
    const outcome = actions.insertBlock("navbar");
    expect(outcome.nav).toBeNull();
    expect(block(outcome.id!).type).toBe("navbar");
  });

  it("changing a block's type to a frame on an app screen replaces it with the nav", () => {
    const { state, actions, active, blank } = setup();
    const screen = blank("app");
    const free = actions.insertBlock("free").id!;
    expect(actions.updateBlock(free, { type: "sidebar" })).toEqual({ changed: true, nav: "sidebar" });
    expect(active().layout.blocks[free]).toBeUndefined();
    expect(state().screens[screen]!.shell?.nav).toBe("sidebar");
    expect(selectSelectedId(state())).toBeNull();
  });

  it("setShell: header is per screen, nav none is per screen", () => {
    const { state, actions } = setup();
    const [dashboard, settings] = actions.applySet("saas-app");
    expect(actions.setShell(dashboard!, { header: false })).toBe(true);
    expect(state().screens[settings!]!.shell?.header).toBe(true);
    expect(actions.setShell(dashboard!, { nav: "none" })).toBe(true);
    expect(state().screens[settings!]!.shell?.nav).toBe("sidebar");
    expect(actions.setShell(dashboard!, { nav: "none" })).toBe(false);
  });

  it("convertScreen: to app the navbar becomes the nav frame; to landing the shell goes", () => {
    const { state, actions } = setup();
    const [home] = actions.applySet("landing");
    const navbarCount = () => Object.values(state().screens[home!]!.layout.blocks).filter((b) => b.type === "navbar").length;
    expect(navbarCount()).toBe(1);
    expect(actions.convertScreen(home!, "app")).toBe(true);
    expect(state().screens[home!]!.kind).toBe("app");
    expect(state().screens[home!]!.shell).toEqual({ nav: "topnav", header: true });
    expect(navbarCount()).toBe(0);
    expect(actions.convertScreen(home!, "landing")).toBe(true);
    expect(state().screens[home!]!.shell).toBeNull();
    expect(actions.convertScreen(home!, "landing")).toBe(false);
  });
});

describe("screen management", () => {
  it("duplicateScreen copies the layout with new ids right after the source", () => {
    const { state, actions, active } = setup();
    const [home, pricing] = actions.applySet("landing");
    actions.setActiveScreen(home!);
    const container = actions.insertBlock("container").id!;
    actions.insertBlock("text", { parentId: container });
    const source = state().screens[home!]!;
    const copyId = actions.duplicateScreen(home!)!;
    expect(state().screenOrder).toEqual([home, copyId, pricing]);
    expect(selectActiveScreenId(state())).toBe(copyId);
    const copy = active();
    expect(copy.name).toBe("Inicio (copia)");
    expect(copy.route).toBe("/inicio-copia");
    const sourceIds = Object.keys(source.layout.blocks);
    const copyIds = Object.keys(copy.layout.blocks);
    expect(copyIds).toHaveLength(sourceIds.length);
    expect(copyIds.filter((id) => sourceIds.includes(id))).toEqual([]);
    const copiedContainer = copyIds.find((id) => copy.layout.blocks[id]!.type === "container")!;
    expect(Object.values(copy.layout.blocks).filter((b) => b.parentId === copiedContainer)).toHaveLength(1);
  });

  it("renameScreen sanitizes; an automatic route follows the name, a custom one stays", () => {
    const { state, actions } = setup();
    const [, settings] = actions.applySet("saas-app");
    expect(actions.renameScreen(settings!, "  Preferencias\nde cuenta ")).toBe(true);
    expect(state().screens[settings!]).toMatchObject({ name: "Preferencias de cuenta", route: "/preferencias-de-cuenta" });
    expect(actions.renameScreen(settings!, "   ")).toBe(false);
    expect(actions.setRoute(settings!, "/cuenta")).toEqual({ ok: true, route: "/cuenta" });
    actions.renameScreen(settings!, "Perfil");
    expect(state().screens[settings!]!.route).toBe("/cuenta");
  });

  it("setRoute validates and keeps routes unique", () => {
    const { actions } = setup();
    const [dashboard, settings] = actions.applySet("saas-app");
    expect(actions.setRoute(settings!, "ajustes")).toEqual({ ok: false, reason: "invalid" });
    expect(actions.setRoute(settings!, "/con espacio")).toEqual({ ok: false, reason: "invalid" });
    expect(actions.setRoute(settings!, "/dashboard")).toEqual({ ok: false, reason: "taken" });
    expect(actions.setRoute(settings!, " /Cuenta/Datos/ ")).toEqual({ ok: true, route: "/cuenta/datos" });
    expect(actions.setRoute(dashboard!, "/")).toEqual({ ok: true, route: "/" });
    expect(actions.setRoute("s-nope00", "/x")).toEqual({ ok: false, reason: "missing" });
  });

  it("moveScreen reorders as one step", () => {
    const { state, actions, history } = setup();
    const [dashboard, settings, login] = actions.applySet("saas-app");
    history().clear();
    expect(actions.moveScreen(login!, 0)).toBe(true);
    expect(state().screenOrder).toEqual([login, dashboard, settings]);
    expect(actions.moveScreen(login!, -5)).toBe(false);
    history().undo();
    expect(state().screenOrder).toEqual([dashboard, settings, login]);
  });

  it("removeScreen clears links to it, moves the active screen and refuses the last one", () => {
    const { state, actions, history, active } = setup();
    const [dashboard, settings, login] = actions.applySet("saas-app");
    const linked = Object.keys(active().layout.blocks)[0]!;
    actions.updateBlock(linked, { linkTo: settings! });
    expect(active().layout.blocks[linked]!.linkTo).toBe(settings);
    actions.setActiveScreen(settings!);
    expect(actions.removeScreen(settings!)).toBe(true);
    expect(state().screenOrder).toEqual([dashboard, login]);
    expect(selectActiveScreenId(state())).toBe(login);
    expect(state().screens[dashboard!]!.layout.blocks[linked]!.linkTo).toBeUndefined();
    history().undo();
    expect(state().screens[dashboard!]!.layout.blocks[linked]!.linkTo).toBe(settings);
    actions.removeScreen(login!);
    actions.removeScreen(settings!);
    expect(actions.removeScreen(dashboard!)).toBe(false);
  });
});

describe("updateBlock", () => {
  it("sanitizes label and note and clamps count", () => {
    const { actions, block, blank } = setup();
    blank();
    const id = actions.insertBlock("cards").id!;
    expect(actions.updateBlock(id, { label: "  Mis\ttarjetas\n ", note: `semanal‮ ${"x".repeat(300)}`, count: 99 }).changed).toBe(true);
    const b = block(id);
    expect(b.label).toBe("Mis tarjetas");
    expect(b.note!.length).toBe(200);
    expect(b.note!.startsWith("semanal x")).toBe(true);
    expect(b.count).toBe(12);
    actions.updateBlock(id, { count: 0 });
    expect(block(id).count).toBe(1);
    actions.updateBlock(id, { label: "   ", note: "" });
    expect(block(id).label).toBe("Mis tarjetas");
    expect(block(id).note).toBeUndefined();
    expect(actions.updateBlock(id, { label: "Mis tarjetas" })).toEqual({ changed: false, nav: null });
  });

  it("a type change keeps the geometry and renames only default labels", () => {
    const { actions, block, blank } = setup();
    blank();
    const a = actions.insertBlock("table", { rect: rect(0, 0, 8, 30) }).id!;
    const b = actions.insertBlock("cards", { rect: rect(0, 40, 12, 30), count: 6 }).id!;
    actions.updateBlock(b, { label: "Pedidos" });
    actions.updateBlock(a, { type: "list" });
    expect(block(a)).toMatchObject({ type: "list", label: "Default list", rect: rect(0, 0, 8, 30) });
    actions.updateBlock(b, { type: "table" });
    expect(block(b)).toMatchObject({ type: "table", label: "Pedidos", rect: rect(0, 40, 12, 30) });
    // Table is not repeatable: the count goes with the old type.
    expect(block(b).count).toBeUndefined();
  });

  it("links only to existing screens; hidden and responsive are cleaned", () => {
    const { actions, block, blank } = setup();
    const screen = blank();
    const id = actions.insertBlock("text").id!;
    actions.updateBlock(id, { linkTo: "s-nope00" });
    expect(block(id).linkTo).toBeUndefined();
    actions.updateBlock(id, { linkTo: screen });
    expect(block(id).linkTo).toBe(screen);
    actions.updateBlock(id, { hidden: true, responsive: { mobile: { hidden: true }, tablet: {} } });
    expect(block(id).hidden).toBe(true);
    expect(block(id).responsive).toEqual({ mobile: { hidden: true } });
    actions.updateBlock(id, { hidden: false, responsive: { mobile: { hidden: false } } });
    expect(block(id).hidden).toBeUndefined();
    expect(block(id).responsive).toBeUndefined();
  });
});

describe("generate", () => {
  it("covers every screen in order with structure, responsive, CSS, ASCII and warnings", () => {
    const { state, actions } = setup();
    const ids = actions.applySet("saas-app");
    actions.addScreen("blank", "landing");
    const result = actions.generate();
    expect(result.screens.map((s) => s.screenId)).toEqual(state().screenOrder);
    expect(result.screens).toHaveLength(ids.length + 1);
    for (const screen of result.screens) {
      const blockIds = Object.keys(screen.layout.blocks);
      expect([...screen.structure.order].sort()).toEqual([...blockIds].sort());
      expect(Object.keys(screen.responsive.mobile.blocks).sort()).toEqual([...blockIds].sort());
      expect(typeof screen.css).toBe("string");
      expect(typeof screen.ascii).toBe("string");
      expect(Array.isArray(screen.warnings)).toBe(true);
      expect(screen.route).toBe(state().screens[screen.screenId]!.route);
      if (blockIds.length > 0) expect(screen.css).toContain("data-dl-id");
    }
    expect(state().generated).toBe(result);
  });

  it("changedCount: all blocks before, 0 after; counts new, changed and removed blocks, not moves", () => {
    const { state, actions, active } = setup();
    actions.applySet("landing");
    const total = Object.values(state().screens).reduce((n, s) => n + Object.keys(s.layout.blocks).length, 0);
    expect(actions.changedCount()).toBe(total);
    expect(actions.generate().changed).toBe(total);
    expect(actions.changedCount()).toBe(0);

    const [first, second] = Object.keys(active().layout.blocks);
    const r = active().layout.blocks[first!]!.rect;
    actions.setRect(first!, { ...r, row: r.row + 400 });
    expect(actions.changedCount()).toBe(0);

    actions.updateBlock(second!, { note: "con video" });
    expect(actions.changedCount()).toBe(1);
    actions.insertBlock("text", { rect: rect(0, 900, 4, 10) });
    expect(actions.changedCount()).toBe(2);
    actions.removeBlocks([first!]);
    expect(actions.changedCount()).toBe(3);

    const result = actions.generate();
    expect(result.changed).toBe(3);
    expect(actions.changedCount()).toBe(0);

    const [, pricing] = state().screenOrder;
    const pricingBlocks = Object.keys(state().screens[pricing!]!.layout.blocks).length;
    actions.removeScreen(pricing!);
    expect(actions.changedCount()).toBe(pricingBlocks);
  });

  it("generate is not an undo step", () => {
    const { actions, history } = setup();
    actions.applySet("landing");
    const before = history().pastStates.length;
    actions.generate();
    expect(history().pastStates).toHaveLength(before);
  });
});

describe("view state", () => {
  it("is not tracked by undo", () => {
    const { state, actions, history, blank } = setup();
    blank();
    actions.setTool("draw");
    actions.setDevice("mobile");
    actions.toggleStructure();
    actions.setLeftTab("layers");
    actions.setStyle("glass");
    actions.addSpace(state().screenOrder[0]!, 40);
    expect(history().pastStates).toHaveLength(0);
    expect(state()).toMatchObject({ tool: "draw", device: "mobile", showStructure: true, leftTab: "layers", style: "glass" });
    expect(state().extraRows[state().screenOrder[0]!]).toBe(40);
  });

  it("slugify strips accents and symbols", () => {
    expect(slugify("Configuración (copia)")).toBe("configuracion-copia");
    expect(slugify("***")).toBe("screen");
  });
});
