import { applyPatch, createDesignDoc, screenPointer, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type ScreenTemplateId } from "@dialmade/layout";
import { beforeAll, describe, expect, it } from "vitest";
import { designEngine, type GeneratedScreenInput } from "@/lib/design-engine";
import { createDesignDocStore, docHasDesign, loadDesignEngine, selectActiveKey, selectActivePageKind } from "./useDesignDoc";

beforeAll(async () => {
  await loadDesignEngine(async () => designEngine);
});

function freshDoc(): DesignDoc {
  return createDesignDoc({
    brand: { name: "Lumen", seeds: { primary: "#7c5cff" } },
    brief: { productType: "saas-general", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
}

function draft(): GeneratedScreenInput[] {
  let n = 0;
  const newId = () => `b-${(++n).toString(36).padStart(6, "0")}`;
  const screen = (id: string, name: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput => {
    const template = getScreenTemplate(templateId);
    const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId });
    return { screenId: id, name, kind: template.kind ?? "landing", route, shell, layout };
  };
  return [screen("s-home", "Inicio", "/", "home"), screen("s-pricing", "Precios", "/precios", "pricing")];
}

function setup() {
  const store = createDesignDocStore({ doc: freshDoc(), engineReady: true });
  const actions = store.getState().actions;
  const history = () => store.temporal.getState();
  return { store, actions, history, doc: () => store.getState().doc! };
}

describe("applyGenerate", () => {
  it("the first Generar writes the screens and is not undoable (no way back to an empty document)", () => {
    const { actions, history, doc, store } = setup();
    actions.setBrandText({ name: "Lumen Labs" });
    expect(history().pastStates).toHaveLength(1);
    const result = actions.applyGenerate({ screens: draft() });
    expect(result.ok).toBe(true);
    expect(doc().screenOrder).toEqual(["s-home", "s-pricing"]);
    expect(docHasDesign(doc())).toBe(true);
    expect(history().pastStates).toHaveLength(0);
    expect(selectActiveKey(store.getState())).toBe("s-home");
  });

  it("a later Generar is one undo step, and keeps the screen the user was on", () => {
    const { actions, history, doc, store } = setup();
    const screens = draft();
    actions.applyGenerate({ screens });
    actions.setActiveKey("s-pricing");
    const first = doc();
    const renamed = [{ ...screens[0]!, name: "Portada" }, screens[1]!];
    expect(actions.applyGenerate({ screens: renamed }).ok).toBe(true);
    expect(doc().screens["s-home"]!.name).toBe("Portada");
    expect(history().pastStates).toHaveLength(1);
    expect(store.getState().activeKey).toBe("s-pricing");
    history().undo();
    expect(doc()).toBe(first);
  });

  it("goes to the requested screen", () => {
    const { actions, store } = setup();
    actions.applyGenerate({ screens: draft() }, { activeKey: "s-pricing" });
    expect(selectActiveKey(store.getState())).toBe("s-pricing");
  });

  it("returns `locked` for a removed locked block; the retry with allowLocked deletes it", () => {
    const { actions, doc } = setup();
    const screens = draft();
    actions.applyGenerate({ screens });
    const hero = Object.keys(screens[0]!.layout.blocks).find((id) => screens[0]!.layout.blocks[id]!.type === "hero")!;
    const pointer = screenPointer("s-home", "page", "elements", hero, "props", "title");
    expect(actions.applyPatch([{ op: "add", path: "/brief/locks/-", value: pointer }]).ok).toBe(true);
    const blocks = { ...screens[0]!.layout.blocks };
    delete blocks[hero];
    const removed = [{ ...screens[0]!, layout: { ...screens[0]!.layout, blocks } }, screens[1]!];

    const refused = actions.applyGenerate({ screens: removed });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatchObject({ reason: "locked", lock: pointer });
    expect(doc().screens["s-home"]!.layout.blocks[hero]).toBeDefined();

    expect(actions.applyGenerate({ screens: removed }, { allowLocked: true }).ok).toBe(true);
    expect(doc().screens["s-home"]!.layout.blocks[hero]).toBeUndefined();
    expect(doc().brief.locks).not.toContain(pointer);
  });

  it("closes an open batch before writing", () => {
    const { actions, history } = setup();
    actions.beginBatch();
    actions.setBrandText({ name: "Lumen Labs" });
    actions.applyGenerate({ screens: draft() });
    // The batch was committed (history resumed) and then cleared by the first Generar.
    actions.setBrandText({ name: "Lumen Studio" });
    expect(history().pastStates).toHaveLength(1);
  });
});

describe("active page key", () => {
  it("falls back to the first screen, then to the page kinds; setActivePage and setActiveKey stay in step", () => {
    const { actions, store, doc } = setup();
    expect(selectActiveKey(store.getState())).toBeNull();
    actions.applyGenerate({ screens: draft() });
    actions.setActiveKey("s-pricing");
    expect(selectActiveKey(store.getState())).toBe("s-pricing");
    actions.setActiveKey("missing");
    expect(store.getState().activeKey).toBe("s-pricing");
    actions.setActivePage("brand");
    expect(store.getState().activeKey).toBe("brand");
    expect(selectActivePageKind(store.getState())).toBe("brand");

    // Undo-like removal of the chosen screen: the key falls back to the first screen.
    const result = applyPatch(doc(), removeScreen(doc(), "s-pricing"));
    if (!result.ok) throw new Error(result.error.message);
    store.setState({ doc: result.doc, activeKey: "s-pricing" });
    expect(selectActiveKey(store.getState())).toBe("s-home");
  });

  it("setDials writes a screen's own dials", () => {
    const { actions, doc } = setup();
    actions.applyGenerate({ screens: draft() });
    expect(actions.setDials({ density: 3.4 }, "s-home").ok).toBe(true);
    expect(doc().screens["s-home"]!.page.dials?.density).toBe(3);
  });
});

function removeScreen(doc: DesignDoc, id: string) {
  return [
    { op: "remove" as const, path: `/screenOrder/${doc.screenOrder.indexOf(id)}` },
    { op: "remove" as const, path: screenPointer(id) },
  ];
}
