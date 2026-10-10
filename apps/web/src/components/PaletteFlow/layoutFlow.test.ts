// The «Modo Layout» flow end to end, without a browser: Marca (initFromPalette) → Layout (a starting set, Generar)
// → Ajustar (the active screen, hide, knobs, the shared app frame) → «Editar layout» (the draft follows the doc,
// Generar again keeps the edits) → Exportar (one HTML per screen). Plus a legacy document in Ajustar.
import { outputKindOptions, type OutputKind } from "@dialmade/catalog";
import { createDesignDoc, renderTargets, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import { SHELL_ELEMENT_ID, sectionRegistry } from "@dialmade/sections";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_SCREENS } from "@dialmade/doc";
import { canHide, COUNT_PROP, hiddenOps, pageTarget, sectionRows, setPropOps, type PageTarget } from "@/components/Composer/pageOps";
import { buildCodePack } from "@/components/ExportDialog/exportPack";
import { createLayoutStore } from "@/components/LayoutStep/useLayoutStore";
import { createDesignDocStore, loadDesignEngine, selectActiveKey } from "@/hooks/useDesignDoc";
import { exportDialog } from "@/i18n/export";
import { designEngine } from "@/lib/design-engine";
import { compileScreenLayout } from "@/lib/screen-layout";
import { enterLayout } from "./layoutEntry";

beforeAll(async () => {
  await loadDesignEngine(async () => designEngine);
});

function flow() {
  const design = createDesignDocStore({ engineReady: true });
  const actions = design.getState().actions;
  const created = actions.initFromPalette({ primary: "#7c5cff", styleId: "brand" }, { defaultName: "Lumen", locale: "es" });
  expect(created).not.toBeNull();
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
    const result = layout.getState().actions.generate();
    const applied = actions.applyGenerate(result);
    expect(applied.ok, applied.ok ? "" : JSON.stringify(applied.error)).toBe(true);
    if (applied.ok) layout.getState().actions.markSynced(applied.doc);
    return result;
  };
  return { design, actions, layout, doc, target, generate };
}

const firstBlockOfType = (target: PageTarget, type: string) =>
  sectionRows(target, sectionRegistry).ids.find((id) => target.page.elements[id]?.type === type);

describe("Modo Layout flow", () => {
  it("Generar writes every screen, the style guide and no legacy pages; Ajustar opens on the first screen", () => {
    const { layout, doc, target, generate } = flow();
    const ids = layout.getState().actions.applySet("saas-app");
    expect(ids.length).toBe(3);
    generate();

    expect(doc().screenOrder).toEqual(ids);
    expect(doc().pages.brand).toBeDefined();
    expect(doc().pages.landing).toBeUndefined();
    expect(doc().pages.app).toBeUndefined();
    expect(renderTargets(doc()).map((entry) => entry.key)).toEqual([...ids, "brand"]);

    const active = target();
    expect(active.key).toBe(ids[0]);
    expect(active.screen?.kind).toBe("app");
    // The section list: the blocks in reading order, the frame on its own row, no reordering.
    const rows = sectionRows(active, sectionRegistry);
    expect(rows.reorderable).toBe(false);
    expect(rows.containerId).toBe(SHELL_ELEMENT_ID);
    expect(rows.ids.length).toBeGreaterThan(0);
    for (const id of rows.ids) expect(Object.hasOwn(active.screen!.layout.blocks, id)).toBe(true);
    // The preview's layout CSS (the export's too) targets the page's elements.
    const css = compileScreenLayout(active.screen!).css;
    for (const id of rows.ids) expect(css).toContain(`[data-dl-id="${id}"]`);
  });

  it("Ajustar's hide and knob edits survive «Editar layout» → Generar again", () => {
    const { actions, layout, doc, target, generate } = flow();
    layout.getState().actions.applySet("landing");
    generate();

    const home = target();
    const hero = firstBlockOfType(home, "landing.hero")!;
    const hidden = sectionRows(home, sectionRegistry).ids.find((id) => id !== hero)!;
    expect(hero).toBeDefined();
    expect(canHide(home, hidden)).toBe(true);
    expect(actions.applyPatch(hiddenOps(home, hidden, true)).ok).toBe(true);
    expect(actions.applyPatch(setPropOps(doc(), target(), hero, "title", "Agenda sin líos")).ok).toBe(true);

    const block = (id: string) => doc().screens[home.key]!.layout.blocks[id]!;
    expect(block(hidden).hidden).toBe(true);
    expect(block(hero).pinned).toEqual(["/title"]);
    // A second edit of the same prop does not pin it twice.
    expect(actions.applyPatch(setPropOps(doc(), target(), hero, "title", "Agenda clara")).ok).toBe(true);
    expect(block(hero).pinned).toEqual(["/title"]);

    // «Editar layout»: the draft follows the doc, then a change in the layout and Generar again.
    const draft = layout.getState();
    draft.actions.syncFromDoc(doc());
    expect(draft.actions.updateBlock(hero, { note: "agenda semanal para equipos" }, home.key).changed).toBe(true);
    generate();

    const again = pageTarget(doc(), home.key)!;
    expect(again.page.elements[hero]?.props.title).toBe("Agenda clara");
    expect(again.page.hidden).toContain(hidden);
    expect(block(hidden).hidden).toBe(true);

    // Showing it again clears both.
    expect(actions.applyPatch(hiddenOps(again, hidden, false)).ok).toBe(true);
    expect(doc().screens[home.key]!.page.hidden ?? []).not.toContain(hidden);
    expect(block(hidden).hidden).toBeUndefined();
  });

  it("an edit of the app frame goes to every app screen that has one, except the keys of one screen", () => {
    const { actions, layout, doc, target, generate } = flow();
    const ids = layout.getState().actions.applySet("saas-app");
    generate();
    const framed = ids.filter((id) => doc().screens[id]!.page.elements[SHELL_ELEMENT_ID]);
    expect(framed.length).toBeGreaterThan(1);
    const first = target(framed[0]);
    expect(canHide(first, SHELL_ELEMENT_ID)).toBe(false);
    expect(actions.applyPatch(setPropOps(doc(), first, SHELL_ELEMENT_ID, "tone", "inverted")).ok).toBe(true);
    for (const id of framed) expect(doc().screens[id]!.page.elements[SHELL_ELEMENT_ID]!.props.tone).toBe("inverted");

    // The page header belongs to its screen: a subtitle edit on one screen leaves the others' alone, and
    // «Generar» again keeps it (an edited value is not one the build writes).
    const subtitles = framed.map((id) => doc().screens[id]!.page.elements[SHELL_ELEMENT_ID]!.props.subtitle);
    expect(actions.applyPatch(setPropOps(doc(), target(framed[0]), SHELL_ELEMENT_ID, "subtitle", "Tu semana de un vistazo")).ok).toBe(true);
    const subtitleOf = (id: string) => doc().screens[id]!.page.elements[SHELL_ELEMENT_ID]!.props.subtitle;
    expect(subtitleOf(framed[0]!)).toBe("Tu semana de un vistazo");
    framed.slice(1).forEach((id, index) => expect(subtitleOf(id)).toBe(subtitles[index + 1]));
    layout.getState().actions.syncFromDoc(doc());
    generate();
    expect(subtitleOf(framed[0]!)).toBe("Tu semana de un vistazo");
    framed.slice(1).forEach((id, index) => expect(subtitleOf(id)).toBe(subtitles[index + 1]));
  });

  it("the code pack has one index.html per screen, plus the style guide", () => {
    const { layout, doc, generate } = flow();
    const ids = layout.getState().actions.applySet("landing");
    generate();
    const built = buildCodePack({
      doc: doc(),
      inputs: resolveThemeInputs(doc()),
      mode: "light",
      locale: "es",
      kindLabel: (kind: OutputKind) => outputKindOptions.find((option) => option.id === kind)!.label.es,
      texts: exportDialog.es.files,
      css: { ui: "", sections: "" },
    });
    const zip = unzipSync(built.bytes);
    const files = Object.keys(zip).map((path) => path.split("/").slice(1).join("/"));
    const html = files.filter((path) => path.endsWith("index.html"));
    expect(html).toContain("index.html");
    expect(html).toContain("brand/index.html");
    expect(html.length).toBe(ids.length + 1);
    for (const path of html.filter((entry) => entry !== "brand/index.html")) {
      const folder = path.slice(0, -"index.html".length);
      expect(files).toContain(`${folder}layout.css`);
      expect(files).toContain(`${folder}layout.json`);
    }
    const readme = strFromU8(zip[Object.keys(zip).find((path) => path.endsWith("README.md"))!]!);
    expect(readme).toContain("DesignDoc v2");
  });
});

describe("Modo Layout flow: review B", () => {
  it("a pending Layout edit survives two rounds of Ajustar edits and reaches the document on Generar", () => {
    const { actions, layout, doc, target, generate } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const blocks = () => layout.getState().screens[home!]!.layout.blocks;
    const noted = Object.keys(blocks()).find((id) => blocks()[id]!.type === "features")!;
    expect(layout.getState().actions.updateBlock(noted, { note: "tres ventajas con iconos" }, home).changed).toBe(true);
    // Stepper → Ajustar (no Generar): pin a title. «Editar layout» merges.
    const hero = firstBlockOfType(target(home), "landing.hero")!;
    expect(actions.applyPatch(setPropOps(doc(), target(home), hero, "title", "Uno")).ok).toBe(true);
    expect(layout.getState().actions.syncFromDoc(doc())).toBe("merged");
    // Ajustar again (no Generar): hide another section. «Editar layout» must not drop the pending note.
    const other = sectionRows(target(home), sectionRegistry).ids.find((id) => id !== hero && canHide(target(home), id))!;
    expect(actions.applyPatch(hiddenOps(target(home), other, true)).ok).toBe(true);
    layout.getState().actions.syncFromDoc(doc());
    expect(blocks()[noted]!.note).toBe("tres ventajas con iconos");
    generate();
    expect(doc().screens[home!]!.layout.blocks[noted]!.note).toBe("tres ventajas con iconos");
    expect(pageTarget(doc(), home!)!.page.elements[hero]?.props.title).toBe("Uno");
    expect(doc().screens[home!]!.layout.blocks[other]!.hidden).toBe(true);
  });

  it("an Ajustar ×N on a block the draft retyped does not make Generar fail (#4)", () => {
    const { actions, layout, doc, target, generate } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const blocks = layout.getState().screens[home!]!.layout.blocks;
    const features = Object.keys(blocks).find((id) => blocks[id]!.type === "features")!;
    layout.getState().actions.updateBlock(features, { type: "pricing" }, home);
    // Stepper → Ajustar: the doc still has Features, whose knob accepts 6.
    expect(actions.applyPatch(setPropOps(doc(), target(home), features, COUNT_PROP, 6)).ok).toBe(true);
    expect(doc().screens[home!]!.layout.blocks[features]!.count).toBe(6);
    expect(layout.getState().actions.syncFromDoc(doc())).toBe("merged");
    generate();
    expect(doc().screens[home!]!.layout.blocks[features]!.type).toBe("pricing");
  });

  it("after the first Generar, undo in Layout never goes back to an empty project (#5)", () => {
    const { layout, doc, generate } = flow();
    layout.getState().actions.applySet("landing");
    generate();
    expect(layout.getState().actions.undo()).toBe(false);
    expect(layout.getState().screenOrder).toEqual(doc().screenOrder);
  });

  it("a 25th screen is refused in the draft, so Generar never fails on the document's limit (#13, #16)", () => {
    const { layout, doc, generate } = flow();
    const draft = layout.getState().actions;
    draft.applySet("landing");
    while (layout.getState().screenOrder.length < MAX_SCREENS) draft.duplicateScreen(layout.getState().screenOrder[0]!);
    expect(draft.addScreen("blank", "landing")).toBeNull();
    expect(draft.duplicateScreen(layout.getState().screenOrder[0]!)).toBeNull();
    expect(layout.getState().limitHit?.limit).toBe("screens");
    generate();
    expect(doc().screenOrder).toHaveLength(MAX_SCREENS);
  });

  it("a removed block still counts for «Regenerar» after Ajustar pinned a text (#15)", () => {
    const { actions, layout, doc, target, generate } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const hero = firstBlockOfType(target(home), "landing.hero")!;
    expect(actions.applyPatch(setPropOps(doc(), target(home), hero, "title", "Mi titular")).ok).toBe(true);
    const draft = layout.getState().actions;
    expect(draft.syncFromDoc(doc())).toBe("reseeded");
    expect(draft.changedCount()).toBe(0);
    const removed = draft.removeBlocks([Object.keys(layout.getState().screens[home!]!.layout.blocks).find((id) => id !== hero)!], home);
    expect(removed.length).toBeGreaterThan(0);
    expect(draft.changedCount()).toBe(removed.length);
  });

  it("Ajustar knows when the draft has layout changes that are not generated (#40)", () => {
    const { actions, layout, doc, target, generate } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const draft = layout.getState().actions;
    expect(draft.hasPendingChanges(doc())).toBe(false);
    draft.insertBlock("list", { screenId: home });
    expect(draft.hasPendingChanges(doc())).toBe(true);
    // An Ajustar edit meanwhile is not a Layout change; the added block still is.
    const hero = firstBlockOfType(target(home), "landing.hero")!;
    expect(actions.applyPatch(setPropOps(doc(), target(home), hero, "title", "Otro")).ok).toBe(true);
    expect(draft.hasPendingChanges(doc())).toBe(true);
    // «Generar» from the notice (what PaletteFlow runs): nothing is pending afterwards.
    generate();
    expect(draft.hasPendingChanges(doc())).toBe(false);
  });

  it("«Editar layout» opens the screen Ajustar shows, even one only the document had (undo in Ajustar) (#30)", () => {
    const { design, actions, layout, generate } = flow();
    const [a, b] = layout.getState().actions.applySet("saas-app");
    generate();
    expect(layout.getState().actions.removeScreen(b!)).toBe(true);
    generate();
    // Ajustar: ⌘Z brings B back, and the user opens its tab.
    design.temporal.getState().undo();
    expect(design.getState().doc!.screens[b!]).toBeDefined();
    actions.setActiveKey(b!);
    enterLayout(layout, design.getState().doc, selectActiveKey(design.getState()));
    expect(layout.getState().screens[b!]).toBeDefined();
    expect(layout.getState().activeScreenId).toBe(b);
    // From «Marca» (no key) the draft keeps its own screen.
    layout.getState().actions.setActiveScreen(a!);
    enterLayout(layout, design.getState().doc, null);
    expect(layout.getState().activeScreenId).toBe(a);
  });

  it("a duplicated screen reaches Generar with its source (copyOf) and is written (#26)", () => {
    const { layout, doc, generate } = flow();
    const [home] = layout.getState().actions.applySet("landing");
    generate();
    const copy = layout.getState().actions.duplicateScreen(home!)!;
    const result = generate();
    const screen = result.screens.find((entry) => entry.screenId === copy)!;
    expect(screen.copyOf?.screenId).toBe(home);
    for (const [blockId, sourceId] of Object.entries(screen.copyOf!.blocks)) {
      expect(Object.hasOwn(doc().screens[copy]!.layout.blocks, blockId)).toBe(true);
      expect(Object.hasOwn(doc().screens[home!]!.layout.blocks, sourceId)).toBe(true);
    }
  });

  it("a duplicated screen keeps the source's Ajustar edits (pinned title, hidden block, frame copy) on the copy after Generar (#26)", () => {
    const { actions, layout, doc, target, generate } = flow();
    const [home, pricing] = layout.getState().actions.applySet("landing");
    generate();
    const hero = firstBlockOfType(target(home), "landing.hero")!;
    const hidden = sectionRows(target(home), sectionRegistry).ids.find((id) => id !== hero && canHide(target(home), id))!;
    expect(actions.applyPatch(setPropOps(doc(), target(home), hero, "title", "Mi titular")).ok).toBe(true);
    expect(actions.applyPatch(hiddenOps(target(home), hidden, true)).ok).toBe(true);
    const source = doc().screens[home!]!;
    // «Editar layout» → «Duplicar» (plus a pending change elsewhere) → Generar.
    layout.getState().actions.syncFromDoc(doc());
    const copy = layout.getState().actions.duplicateScreen(home!)!;
    layout.getState().actions.insertBlock("text", { screenId: pricing });
    const result = generate();
    const map = result.screens.find((entry) => entry.screenId === copy)!.copyOf!.blocks;
    const copyOf = (sourceId: string) => Object.keys(map).find((blockId) => map[blockId] === sourceId)!;
    const copied = doc().screens[copy]!;
    expect(copied.page.elements[copyOf(hero)]!.props).toEqual(source.page.elements[hero]!.props);
    expect(copied.layout.blocks[copyOf(hero)]!.pinned).toEqual(["/title"]);
    expect(copied.page.hidden).toContain(copyOf(hidden));
    // The source's own blocks never land in the copy's page or stash; the source keeps its edits.
    for (const id of Object.keys(source.layout.blocks)) {
      expect(copied.page.elements[id]).toBeUndefined();
      expect(copied.page.stash?.[id]).toBeUndefined();
    }
    expect(doc().screens[home!]!.page.elements[hero]!.props).toEqual(source.page.elements[hero]!.props);
    expect(doc().screens[home!]!.layout.blocks[hero]!.pinned).toEqual(["/title"]);
    // Generar again: the copy is stored now and keeps all of it.
    layout.getState().actions.syncFromDoc(doc());
    generate();
    expect(doc().screens[copy]!.page.elements[copyOf(hero)]!.props.title).toBe("Mi titular");
  });

  it("a duplicated app screen keeps its frame's pinned copy (#26)", () => {
    const { actions, layout, doc, generate } = flow();
    const [dash] = layout.getState().actions.applySet("saas-app");
    generate();
    expect(actions.applyPatch(setPropOps(doc(), pageTarget(doc(), dash!)!, SHELL_ELEMENT_ID, "primaryAction", "Nueva cita")).ok).toBe(true);
    layout.getState().actions.syncFromDoc(doc());
    const copy = layout.getState().actions.duplicateScreen(dash!)!;
    generate();
    expect(doc().screens[copy]!.page.elements[SHELL_ELEMENT_ID]!.props.primaryAction).toBe("Nueva cita");
    expect(doc().screens[copy]!.shell?.pinned).toContain("/primaryAction");
    expect(doc().screens[copy]!.page.elements[SHELL_ELEMENT_ID]!.props.title).toBe(doc().screens[copy]!.name);
  });
});

describe("legacy documents in Ajustar", () => {
  it("keep their page kinds, reordering and plain prop edits", () => {
    const legacy: DesignDoc = createDesignDoc({
      brand: { name: "Lumen", seeds: { primary: "#7c5cff" } },
      brief: { productType: "saas-general", locale: "es", focus: "landing" },
      provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
    });
    const store = createDesignDocStore({ doc: legacy, engineReady: true });
    const { actions } = store.getState();
    expect(actions.addPage("landing").ok).toBe(true);
    const doc = store.getState().doc!;
    expect(selectActiveKey(store.getState())).toBe("landing");
    const landing = pageTarget(doc, "landing")!;
    expect(landing.screen).toBeUndefined();
    const rows = sectionRows(landing, sectionRegistry);
    expect(rows.reorderable).toBe(true);
    const first = rows.ids[0]!;
    const ops = setPropOps(doc, landing, first, "title", "Hola");
    expect(ops).toEqual([{ op: "add", path: `/pages/landing/elements/${first}/props/title`, value: "Hola" }]);
    expect(actions.applyPatch(ops).ok).toBe(true);
    expect(actions.applyPatch(hiddenOps(pageTarget(store.getState().doc!, "landing")!, first, true)).ok).toBe(true);
    expect(store.getState().doc!.pages.landing!.hidden).toEqual([first]);
  });
});
