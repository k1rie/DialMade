// Review B, store level (the PaletteFlow sequence: createLayoutStore + createDesignDocStore + setPropOps +
// applyGenerate + markSynced): the failure scenarios of findings #0–#3, step by step as a user does them.
// «Perder ediciones es el peor fallo posible».
import { type DesignDoc } from "@dialmade/doc";
import { SHELL_ELEMENT_ID, sectionRegistry } from "@dialmade/sections";
import { beforeAll, describe, expect, it } from "vitest";
import { pageTarget, sectionRows, setPropOps, type PageTarget } from "@/components/Composer/pageOps";
import { createLayoutStore } from "@/components/LayoutStep/useLayoutStore";
import { createDesignDocStore, loadDesignEngine, selectActiveKey } from "@/hooks/useDesignDoc";
import { screenCopyPlan } from "@/lib/ai/fields";
import { designEngine } from "@/lib/design-engine";

beforeAll(async () => {
  await loadDesignEngine(async () => designEngine);
});

function flow() {
  const design = createDesignDocStore({ engineReady: true });
  const actions = design.getState().actions;
  expect(actions.initFromPalette({ primary: "#7c5cff", styleId: "brand" }, { defaultName: "Lumen", locale: "es" })).not.toBeNull();
  let n = 0;
  const layout = createLayoutStore({
    newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
    labelFor: (type) => `Bloque ${type}`,
    screenNameFor: (templateId) => `Pantalla ${templateId}`,
  });
  layout.getState().actions.syncFromDoc(design.getState().doc!);
  const doc = () => design.getState().doc!;
  const target = (key = selectActiveKey(design.getState())!) => pageTarget(doc(), key)!;
  /** «Generar» as PaletteFlow runs it: one write, then the draft is marked as synced. */
  const generate = () => {
    const applied = actions.applyGenerate(layout.getState().actions.generate());
    expect(applied.ok, applied.ok ? "" : JSON.stringify(applied.error)).toBe(true);
    if (applied.ok) layout.getState().actions.markSynced(applied.doc);
  };
  /** A knob edit in «Ajustar», from the live doc as KnobsPanel does. */
  const knob = (key: string, id: string, prop: string, value: unknown) => {
    const ops = setPropOps(doc(), target(key), id, prop, value);
    expect(ops.length).toBeGreaterThan(0);
    const result = actions.applyPatch(ops);
    expect(result.ok, result.ok ? "" : JSON.stringify(result.error)).toBe(true);
  };
  /** «Editar layout»: the draft follows the document. */
  const editLayout = () => layout.getState().actions.syncFromDoc(doc());
  return { actions, layout, doc, target, generate, knob, editLayout };
}

const firstOfType = (target: PageTarget, type: string) =>
  sectionRows(target, sectionRegistry).ids.find((id) => target.page.elements[id]?.type === type)!;

const props = (doc: DesignDoc, screen: string, id: string) => doc.screens[screen]!.page.elements[id]!.props;

describe("review B #0: a Layout undo across «Generar» keeps copy and pins", () => {
  it("delete the hero → Generar → ⌘Z → Generar: the knob edit and its pin are back", () => {
    const { layout, doc, target, generate, knob, editLayout } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const hero = firstOfType(target(home), "landing.hero");
    knob(home!, hero, "title", "Mi titular");
    editLayout();
    expect(layout.getState().actions.removeBlocks([hero], home)).toEqual([hero]);
    generate();
    expect(doc().screens[home!]!.page.elements[hero]).toBeUndefined();
    expect(editLayout()).toBe("unchanged");
    expect(layout.getState().actions.undo()).toBe(true);
    generate();
    expect(props(doc(), home!, hero).title).toBe("Mi titular");
    expect(doc().screens[home!]!.layout.blocks[hero]!.pinned).toEqual(["/title"]);
    // And once more: Generar again changes nothing.
    const before = doc();
    editLayout();
    generate();
    expect(doc().screens).toEqual(before.screens);
  });

  it("remove a screen → Generar → ⌘Z → Generar: every block of the screen keeps its copy and pins", () => {
    const { layout, doc, target, generate, knob, editLayout } = flow();
    const [, pricing] = layout.getState().actions.applySet("landing");
    generate();
    const text = firstOfType(target(pricing), "ui.text");
    knob(pricing!, text, "title", "Planes para equipos");
    const before = props(doc(), pricing!, text);
    editLayout();
    expect(layout.getState().actions.removeScreen(pricing!)).toBe(true);
    generate();
    expect(doc().screens[pricing!]).toBeUndefined();
    editLayout();
    expect(layout.getState().actions.undo()).toBe(true);
    generate();
    expect(props(doc(), pricing!, text)).toEqual(before);
    expect(doc().screens[pricing!]!.layout.blocks[text]!.pinned).toEqual(["/title"]);
    expect(doc().screenStash).toBeUndefined();
  });

  it("list → calendar → Generar → ⌘Z → Generar: the list's action edit comes back", () => {
    const { layout, doc, target, generate, knob, editLayout } = flow();
    const [, settings] = layout.getState().actions.applySet("saas-app");
    generate();
    const list = firstOfType(target(settings), "ui.list");
    knob(settings!, list, "action", "Ver más citas");
    editLayout();
    expect(layout.getState().actions.updateBlock(list, { type: "calendar" }, settings).changed).toBe(true);
    generate();
    expect(doc().screens[settings!]!.page.elements[list]!.type).toBe("ui.calendar");
    editLayout();
    expect(layout.getState().actions.undo()).toBe(true);
    generate();
    expect(doc().screens[settings!]!.page.elements[list]!.type).toBe("ui.list");
    expect(props(doc(), settings!, list).action).toBe("Ver más citas");
  });
});

describe("review B #1–#3: app frame edits in «Ajustar» never revert", () => {
  it("title, page header and navigation survive «Generar» with no Layout change", () => {
    const { layout, doc, generate, knob, editLayout } = flow();
    const [dash, settings, login] = layout.getState().actions.applySet("saas-app");
    generate();
    knob(dash!, SHELL_ELEMENT_ID, "title", "Mi panel");
    knob(dash!, SHELL_ELEMENT_ID, "showPageHeader", false);
    knob(dash!, SHELL_ELEMENT_ID, "variant", "topnav");
    expect(editLayout()).not.toBe("merged");
    generate();
    const frame = (id: string) => props(doc(), id, SHELL_ELEMENT_ID);
    expect(doc().screens[dash!]!.name).toBe("Mi panel");
    expect(frame(dash!)).toMatchObject({ title: "Mi panel", showPageHeader: false, variant: "topnav" });
    expect(frame(settings!)).toMatchObject({ showPageHeader: true, variant: "topnav" });
    expect(doc().screens[login!]!.shell?.nav).toBe("none");
    // The Layout draft shows the same (its tabs and the frame preview).
    expect(layout.getState().screens[dash!]).toMatchObject({ name: "Mi panel", shell: { nav: "topnav", header: false } });
    expect((frame(settings!).nav as { id: string; label: string }[]).find((item) => item.id === dash)?.label).toBe("Mi panel");
  });

  it("subtitle and primary action edits survive Generar, a language change and a product change, and the AI skips them", () => {
    const { actions, layout, doc, generate, knob, editLayout } = flow();
    const [dash] = layout.getState().actions.applySet("saas-app");
    generate();
    knob(dash!, SHELL_ELEMENT_ID, "primaryAction", "Nueva cita");
    knob(dash!, SHELL_ELEMENT_ID, "subtitle", "Mi subtítulo");
    const frame = () => props(doc(), dash!, SHELL_ELEMENT_ID);
    editLayout();
    generate();
    expect(frame()).toMatchObject({ primaryAction: "Nueva cita", subtitle: "Mi subtítulo" });
    expect(actions.setContentLocale("en", { rebuildPages: true }).ok).toBe(true);
    expect(frame()).toMatchObject({ primaryAction: "Nueva cita", subtitle: "Mi subtítulo" });
    expect(actions.setProductType("e-commerce", { rebuildPages: true }).ok).toBe(true);
    expect(frame()).toMatchObject({ primaryAction: "Nueva cita", subtitle: "Mi subtítulo" });
    const fields = screenCopyPlan(doc(), [{ id: dash! }]).fields.map((field) => field.pointer);
    const shellPointer = (key: string) => `/screens/${dash}/page/elements/${SHELL_ELEMENT_ID}/props/${key}`;
    expect(fields).not.toContain(shellPointer("primaryAction"));
    expect(fields).not.toContain(shellPointer("subtitle"));
  });
});

describe("review B #1 with a pending draft: frame edits in «Ajustar» survive the merge of «Editar layout»", () => {
  it("rename, page header and navigation made while the draft has its own change reach the document on Generar", () => {
    const { layout, doc, generate, knob, editLayout } = flow();
    const [dash, settings, login] = layout.getState().actions.applySet("saas-app");
    generate();
    // A Layout change that is not generated yet: the next «Editar layout» merges instead of replacing.
    const added = layout.getState().actions.insertBlock("text", { screenId: settings }).id!;
    knob(dash!, SHELL_ELEMENT_ID, "title", "Mi panel");
    knob(dash!, SHELL_ELEMENT_ID, "showPageHeader", false);
    knob(dash!, SHELL_ELEMENT_ID, "variant", "topnav");
    knob(dash!, SHELL_ELEMENT_ID, "primaryAction", "Nueva cita");
    expect(editLayout()).toBe("merged");
    expect(layout.getState().screens[dash!]).toMatchObject({ name: "Mi panel", shell: { nav: "topnav", header: false, pinned: ["/primaryAction"] } });
    expect(layout.getState().screens[settings!]!.shell?.nav).toBe("topnav");
    generate();
    const frame = (id: string) => props(doc(), id, SHELL_ELEMENT_ID);
    expect(doc().screens[dash!]!.name).toBe("Mi panel");
    expect(doc().screens[dash!]!.shell).toMatchObject({ nav: "topnav", header: false });
    expect(frame(dash!)).toMatchObject({ title: "Mi panel", showPageHeader: false, variant: "topnav", primaryAction: "Nueva cita" });
    expect(doc().screens[dash!]!.shell?.pinned).toEqual(["/primaryAction"]);
    expect(frame(settings!)).toMatchObject({ variant: "topnav" });
    expect(doc().screens[login!]!.shell?.nav).toBe("none");
    expect(doc().screens[settings!]!.layout.blocks[added]).toBeDefined();
  });

  it("the draft's own rename and navigation win over Ajustar's, and a new draft screen takes the shared navigation", () => {
    const { layout, doc, generate, knob, editLayout } = flow();
    const [dash, settings] = layout.getState().actions.applySet("saas-app");
    generate();
    const actions = layout.getState().actions;
    expect(actions.renameScreen(dash!, "Inicio")).toBe(true);
    const fresh = actions.addScreen("blank", "app")!;
    knob(dash!, SHELL_ELEMENT_ID, "title", "Mi panel");
    knob(settings!, SHELL_ELEMENT_ID, "variant", "rail");
    expect(editLayout()).toBe("merged");
    const draft = layout.getState().screens;
    expect(draft[dash!]!.name).toBe("Inicio");
    // Ajustar changed the navigation and the draft did not: every app screen with navigation follows, the new one too.
    for (const id of [dash!, settings!, fresh]) expect(draft[id]!.shell?.nav).toBe("rail");
    generate();
    expect(doc().screens[dash!]!.name).toBe("Inicio");
    expect(doc().screens[fresh]!.shell?.nav).toBe("rail");
  });

  it("a rename in Ajustar that collides with a screen only the draft has keeps names and routes unique (Generar succeeds)", () => {
    const { layout, doc, generate, knob, editLayout } = flow();
    const [dash] = layout.getState().actions.applySet("saas-app");
    generate();
    const fresh = layout.getState().actions.addScreen("blank", "app")!;
    const taken = layout.getState().screens[fresh]!;
    // The document does not know the draft's new screen, so its name and route are free there.
    knob(dash!, SHELL_ELEMENT_ID, "title", taken.name);
    expect(doc().screens[dash!]!.route).toBe(taken.route);
    expect(editLayout()).toBe("merged");
    const draft = layout.getState().screens;
    expect(draft[fresh]).toMatchObject({ name: taken.name, route: taken.route });
    expect(draft[dash!]!.name).not.toBe(taken.name);
    expect(draft[dash!]!.route).not.toBe(taken.route);
    generate();
    const routes = Object.values(doc().screens).map((screen) => screen.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(doc().screens[dash!]!.name.startsWith(taken.name)).toBe(true);
  });
});
