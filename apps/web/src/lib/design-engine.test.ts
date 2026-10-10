import { addPage, applyPatch, checkScreenPage, createDesignDoc, safeParseDesignDoc, screenPointer, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate, type LayoutBlock, type LayoutDoc, type ScreenTemplateId } from "@dialmade/layout";
import { buildDefaultPage, contentContextFromDoc } from "@dialmade/sections";
import { describe, expect, it } from "vitest";
import { syncPalette, withContentLocale, withGeneratedScreens, withProductType, withRecipe, type GeneratedScreenInput } from "./design-engine";

function importedDoc(locks: string[]): DesignDoc {
  const base = createDesignDoc({
    brand: { name: "Nimbo", seeds: { primary: "#3a5bd9", secondary: "#f97316" } },
    brief: { paletteStyleId: "vibrant", pairingId: "inter-neo-grotesque", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
  const result = applyPatch(base, locks.map((lock) => ({ op: "add", path: "/brief/locks/-", value: lock })));
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

describe("design engine and import locks", () => {
  it("a recipe's cascade skips a pairing the import locked instead of failing", () => {
    const doc = importedDoc(["/brief/pairingId"]);
    const result = withRecipe(doc, "soft-ui", { cascade: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.brief.recipeId).toBe("soft-ui");
      expect(result.doc.brief.pairingId).toBe("inter-neo-grotesque");
    }
  });

  it("the Lab's palette style applies even when a seed is locked; the locked seed stays", () => {
    const doc = importedDoc(["/brand/seeds/primary"]);
    const result = syncPalette(doc, { primary: "#e11d48", secondary: "#0f766e", styleId: "pastel" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.brand.seeds).toEqual({ primary: "#3a5bd9", secondary: "#0f766e" });
      expect(result.doc.brief.paletteStyleId).toBe("pastel");
    }
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* «Generar» (Modo Layout)                                                                          */
/* ------------------------------------------------------------------------------------------------ */

/** A fictional brand with no pages yet: what the flow has when the Layout step opens. */
function freshDoc(): DesignDoc {
  return createDesignDoc({
    brand: { name: "Lumen", seeds: { primary: "#7c5cff" } },
    brief: { productType: "saas-general", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
}

/** Deterministic block ids (`b-000001`…), unique across the whole test project. */
function idFactory() {
  let n = 0;
  return () => `b-${(++n).toString(36).padStart(6, "0")}`;
}

/** A draft screen from a template, as the Layout step's «Generar» hands it over (no fingerprints, no pins). */
function draftScreen(newId: () => string, id: string, name: string, route: string, templateId: ScreenTemplateId): GeneratedScreenInput {
  const template = getScreenTemplate(templateId);
  const { layout, shell } = instantiateTemplate(template, { label: (type) => type, newId });
  const kind = template.kind ?? "landing";
  return { screenId: id, name, kind, route, shell: kind === "app" ? (shell ?? { nav: "sidebar", header: true }) : null, layout };
}

function landingDraft(newId = idFactory()): GeneratedScreenInput[] {
  return [draftScreen(newId, "s-home", "Inicio", "/", "home"), draftScreen(newId, "s-pricing", "Precios", "/precios", "pricing")];
}

function appDraft(newId = idFactory()): GeneratedScreenInput[] {
  return [
    draftScreen(newId, "s-dash", "Dashboard", "/dashboard", "dashboard"),
    draftScreen(newId, "s-settings", "Ajustes", "/ajustes", "settings"),
    draftScreen(newId, "s-login", "Entrar", "/login", "login"),
  ];
}

function ok(result: ReturnType<typeof withGeneratedScreens>): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

function patched(doc: DesignDoc, ops: unknown[], allowLocked = false): DesignDoc {
  const result = applyPatch(doc, ops, { allowLocked });
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

/** The first block of `type` in a screen of the draft. */
function blockOf(screen: GeneratedScreenInput, type: LayoutBlock["type"]): string {
  const id = Object.keys(screen.layout.blocks).find((blockId) => screen.layout.blocks[blockId]!.type === type);
  if (!id) throw new Error(`No ${type} block in ${screen.screenId}`);
  return id;
}

function withBlock(screen: GeneratedScreenInput, id: string, change: Partial<LayoutBlock>): GeneratedScreenInput {
  const block = { ...screen.layout.blocks[id]!, ...change };
  const layout: LayoutDoc = { ...screen.layout, blocks: { ...screen.layout.blocks, [id]: block } };
  return { ...screen, layout };
}

function withoutBlock(screen: GeneratedScreenInput, id: string): GeneratedScreenInput {
  const blocks = { ...screen.layout.blocks };
  delete blocks[id];
  return { ...screen, layout: { ...screen.layout, blocks } };
}

describe("withGeneratedScreens", () => {
  it("writes screens, order, the style guide and the focus in one valid document", () => {
    const draft = landingDraft();
    const doc = ok(withGeneratedScreens(freshDoc(), draft));
    expect(safeParseDesignDoc(doc).success).toBe(true);
    expect(doc.screenOrder).toEqual(["s-home", "s-pricing"]);
    expect(doc.pages.brand).toBeDefined();
    expect(doc.pages.landing).toBeUndefined();
    expect(doc.brief.focus).toBe("landing");
    for (const screen of draft) {
      const stored = doc.screens[screen.screenId]!;
      expect(checkScreenPage(stored.page, stored.kind)).toEqual([]);
      expect(stored.name).toBe(screen.name);
      expect(stored.route).toBe(screen.route);
      // Fingerprints are written in the same write as the page.
      for (const [id, block] of Object.entries(stored.layout.blocks)) expect(block.generated, id).toBeDefined();
    }
  });

  it("converts a legacy document: landing and app pages go, the focus follows the first screen", () => {
    const legacy = addPage(freshDoc(), "landing", buildDefaultPage("landing", contentContextFromDoc(freshDoc())));
    const doc = ok(withGeneratedScreens(legacy, appDraft()));
    expect(doc.pages.landing).toBeUndefined();
    expect(doc.pages.app).toBeUndefined();
    expect(doc.pages.brand).toBeDefined();
    expect(doc.brief.focus).toBe("app");
    // App screens with navigation share it and list each other in the nav.
    const nav = doc.screens["s-dash"]!.page.elements.shell!.props.nav as { id: string }[];
    expect(nav.map((item) => item.id)).toEqual(["s-dash", "s-settings"]);
    expect(doc.screens["s-login"]!.page.elements.shell).toBeUndefined();
  });

  it("is idempotent: the same draft (or the doc's own screens) gives the same document", () => {
    const draft = landingDraft();
    const first = ok(withGeneratedScreens(freshDoc(), draft));
    expect(ok(withGeneratedScreens(first, draft))).toEqual(first);
    const own = first.screenOrder.map((id) => {
      const screen = first.screens[id]!;
      return { screenId: id, name: screen.name, kind: screen.kind, route: screen.route, shell: screen.shell, layout: screen.layout };
    });
    expect(ok(withGeneratedScreens(first, own))).toEqual(first);
  });

  it("keeps what «Ajustar» changed: pinned values, unpinned edits, hidden blocks and page dials", () => {
    const draft = landingDraft();
    const pricing = draft[1]!;
    const text = blockOf(pricing, "text");
    const cta = blockOf(pricing, "cta");
    const footer = blockOf(pricing, "footer");
    const plans = blockOf(pricing, "pricing");
    const first = ok(withGeneratedScreens(freshDoc(), draft));

    // «Ajustar»: a pinned title, an unpinned edit, a hidden block and the page's own dials.
    const page = (id: string, ...segments: string[]) => screenPointer("s-pricing", "page", "elements", id, ...segments);
    const edited = patched(first, [
      { op: "replace", path: page(text, "props", "title"), value: "Planes para equipos" },
      { op: "add", path: screenPointer("s-pricing", "layout", "blocks", text, "pinned"), value: ["/title"] },
      { op: "replace", path: page(cta, "props", "title"), value: "Empieza hoy" },
      { op: "add", path: screenPointer("s-pricing", "layout", "blocks", footer, "hidden"), value: true },
      { op: "add", path: screenPointer("s-pricing", "page", "hidden"), value: [footer] },
      { op: "add", path: screenPointer("s-pricing", "page", "dials"), value: { density: 3 } },
    ]);

    // The Layout draft never saw the pins; it carries the hidden block (the sync merged it) and resizes the
    // text block and the plans (×2 instead of ×3).
    const nextPricing = withBlock(withBlock(withBlock(pricing, footer, { hidden: true }), text, { rect: { ...pricing.layout.blocks[text]!.rect, h: 24 } }), plans, { count: 2 });
    const doc = ok(withGeneratedScreens(edited, [draft[0]!, nextPricing]));
    const screen = doc.screens["s-pricing"]!;
    expect(screen.page.elements[text]!.props.title).toBe("Planes para equipos");
    expect(screen.layout.blocks[text]!.pinned).toEqual(["/title"]);
    expect(screen.layout.blocks[text]!.generated?.h).toBe(24);
    expect(screen.page.elements[cta]!.props.title).toBe("Empieza hoy");
    expect(screen.layout.blocks[footer]!.hidden).toBe(true);
    expect(screen.page.hidden).toEqual([footer]);
    expect(screen.page.dials).toEqual({ density: 3 });
    expect(screen.layout.blocks[plans]!.generated?.count).toBe(2);
    expect(screen.page.elements[plans]!.props.count).toBe(2);
    // The other screen did not change at all.
    expect(doc.screens["s-home"]).toEqual(edited.screens["s-home"]);
  });

  it("keeps a locked value the draft changed (a renamed screen keeps its locked name)", () => {
    const draft = landingDraft();
    const locked = patched(ok(withGeneratedScreens(freshDoc(), draft)), [
      { op: "add", path: "/brief/locks/-", value: screenPointer("s-home", "name") },
    ]);
    const doc = ok(withGeneratedScreens(locked, [{ ...draft[0]!, name: "Portada" }, draft[1]!]));
    expect(doc.screens["s-home"]!.name).toBe("Inicio");
  });

  it("asks before deleting a block that holds a lock, and drops the lock when allowed", () => {
    const draft = landingDraft();
    const hero = blockOf(draft[0]!, "hero");
    const pointer = screenPointer("s-home", "page", "elements", hero, "props", "title");
    const locked = patched(ok(withGeneratedScreens(freshDoc(), draft)), [{ op: "add", path: "/brief/locks/-", value: pointer }]);
    const removed = [withoutBlock(draft[0]!, hero), draft[1]!];

    const refused = withGeneratedScreens(locked, removed);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error.reason).toBe("locked");
      expect(refused.error.lock).toBe(pointer);
    }

    const doc = ok(withGeneratedScreens(locked, removed, { allowLocked: true }));
    expect(doc.screens["s-home"]!.page.elements[hero]).toBeUndefined();
    expect(doc.screens["s-home"]!.layout.blocks[hero]).toBeUndefined();
    expect(doc.brief.locks).not.toContain(pointer);
  });

  it("a new app screen takes the frame the others show; frames already there keep their own edits", () => {
    const newId = idFactory();
    const draft = appDraft(newId);
    const shell = (screen: string, key: string) => screenPointer(screen, "page", "elements", "shell", "props", key);
    const edited = patched(ok(withGeneratedScreens(freshDoc(), draft)), [
      { op: "replace", path: shell("s-dash", "tone"), value: "brand" },
      { op: "replace", path: shell("s-settings", "workspace"), value: "Equipo Norte" },
    ]);
    const doc = ok(withGeneratedScreens(edited, [...draft, draftScreen(newId, "s-list", "Clientes", "/clientes", "list")]));
    const props = (screen: string) => doc.screens[screen]!.page.elements.shell!.props;
    expect(props("s-list").tone).toBe("brand");
    expect(props("s-dash").tone).toBe("brand");
    expect(props("s-settings").workspace).toBe("Equipo Norte");
    expect(props("s-settings").tone).not.toBe("brand");
    expect((props("s-dash").nav as { id: string }[]).map((item) => item.id)).toEqual(["s-dash", "s-settings", "s-list"]);
    expect(props("s-list").title).toBe("Clientes");
  });

  it("refuses an empty draft", () => {
    expect(withGeneratedScreens(freshDoc(), []).ok).toBe(false);
  });

  it("compiles 200 blocks in well under 100 ms (one build, one validation)", () => {
    const blocks: Record<string, LayoutBlock> = {};
    const types = ["text", "cards", "list", "media"] as const;
    for (let i = 0; i < 200; i++) {
      blocks[`b-${i.toString(36).padStart(6, "0")}`] = { type: types[i % types.length]!, label: `Bloque ${i + 1}`, rect: { col: 0, row: i * 12, w: 12, h: 10 }, z: i + 1 };
    }
    const screen: GeneratedScreenInput = {
      screenId: "s-long",
      name: "Larga",
      kind: "landing",
      route: "/",
      shell: null,
      layout: { version: 1, columns: 12, rowUnit: 8, blocks },
    };
    const base = freshDoc();
    const first = ok(withGeneratedScreens(base, [screen])); // warm-up (module and registry caches)
    const resized = withBlock(screen, "b-000000", { rect: { col: 0, row: 0, w: 6, h: 10 } });
    const times: number[] = [];
    for (let run = 0; run < 3; run++) {
      const start = performance.now();
      ok(withGeneratedScreens(base, [screen]));
      ok(withGeneratedScreens(first, [resized]));
      times.push((performance.now() - start) / 2);
    }
    times.sort((a, b) => a - b);
    expect(times[1]!).toBeLessThan(100);
  });
});

describe("rebuilding the copy of a document with screens (critique #2)", () => {
  /** A generated landing + app project with a pinned title, a hidden block, page dials and a locked text. */
  function project() {
    const newId = idFactory();
    const draft = [...landingDraft(newId), ...appDraft(newId)];
    const pricing = draft[1]!;
    const text = blockOf(pricing, "text");
    const cta = blockOf(pricing, "cta");
    const footer = blockOf(pricing, "footer");
    const chart = blockOf(draft[2]!, "chart");
    const page = (screen: string, id: string, ...segments: string[]) => screenPointer(screen, "page", "elements", id, ...segments);
    const doc = patched(ok(withGeneratedScreens(freshDoc(), draft)), [
      { op: "replace", path: page("s-pricing", text, "props", "title"), value: "Planes para equipos" },
      { op: "add", path: screenPointer("s-pricing", "layout", "blocks", text, "pinned"), value: ["/title"] },
      { op: "add", path: screenPointer("s-pricing", "layout", "blocks", footer, "hidden"), value: true },
      { op: "add", path: screenPointer("s-pricing", "page", "hidden"), value: [footer] },
      { op: "add", path: screenPointer("s-dash", "page", "dials"), value: { density: 8 } },
      { op: "replace", path: page("s-dash", chart, "props", "title"), value: "Ingresos fijados" },
      { op: "add", path: "/brief/locks/-", value: page("s-dash", chart, "props", "title") },
    ]);
    return { doc, text, cta, footer, chart };
  }

  const blockIds = (doc: DesignDoc) => Object.fromEntries(doc.screenOrder.map((id) => [id, Object.keys(doc.screens[id]!.layout.blocks).sort()]));
  const elementIds = (doc: DesignDoc) => Object.fromEntries(doc.screenOrder.map((id) => [id, Object.keys(doc.screens[id]!.page.elements).sort()]));

  for (const [label, rebuild] of [
    ["changing the content locale", (doc: DesignDoc) => withContentLocale(doc, "en", { rebuildPages: true })],
    ["changing the product type", (doc: DesignDoc) => withProductType(doc, "e-commerce", { rebuildPages: true })],
  ] as const) {
    it(`${label} keeps screens, blocks, ids, pinned and locked texts, hidden blocks and dials`, () => {
      const { doc, text, cta, footer, chart } = project();
      const next = ok(rebuild(doc));
      expect(next.screenOrder).toEqual(doc.screenOrder);
      expect(blockIds(next)).toEqual(blockIds(doc));
      expect(elementIds(next)).toEqual(elementIds(doc));
      for (const id of doc.screenOrder) {
        const before = doc.screens[id]!.layout.blocks;
        const after = next.screens[id]!.layout.blocks;
        for (const blockId of Object.keys(before)) expect(after[blockId]!.rect, `${id}/${blockId}`).toEqual(before[blockId]!.rect);
      }
      const pricing = next.screens["s-pricing"]!;
      expect(pricing.page.elements[text]!.props.title).toBe("Planes para equipos");
      expect(pricing.layout.blocks[text]!.pinned).toEqual(["/title"]);
      expect(pricing.layout.blocks[footer]!.hidden).toBe(true);
      expect(pricing.page.hidden).toEqual([footer]);
      expect(next.screens["s-dash"]!.page.dials).toEqual({ density: 8 });
      expect(next.screens["s-dash"]!.page.elements[chart]!.props.title).toBe("Ingresos fijados");
      // The copy that was not pinned is new.
      expect(pricing.page.elements[cta]!.props).not.toEqual(doc.screens["s-pricing"]!.page.elements[cta]!.props);
    });
  }

  it("a locale change on a document without screens still rebuilds its pages", () => {
    const legacy = addPage(freshDoc(), "landing", buildDefaultPage("landing", contentContextFromDoc(freshDoc())));
    const next = ok(withContentLocale(legacy, "en", { rebuildPages: true }));
    expect(next.brief.locale).toBe("en");
    expect(next.pages.landing?.layoutId).toBe(legacy.pages.landing?.layoutId);
    expect(next.pages.landing).not.toEqual(legacy.pages.landing);
  });
});
