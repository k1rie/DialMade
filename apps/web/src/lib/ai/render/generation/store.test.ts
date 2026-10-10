import { applyPatch, createDesignDoc, type AiBlock, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate } from "@dialmade/layout";
import { describe, expect, it, vi } from "vitest";
import { withGeneratedScreens } from "@/lib/design-engine";
import type { GenerationEngine } from "./engine";
import { aiBlockOps } from "./patches";
import { createGenerationStore } from "./store";

function docWithAiHero(): { doc: DesignDoc; hero: string } {
  let n = 0;
  const { layout, shell } = instantiateTemplate(getScreenTemplate("home"), { label: (type) => type, newId: () => `b-${++n}` });
  const generated = withGeneratedScreens(
    createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#0f766e" } }, brief: { productType: "saas-general", locale: "es" }, provenance: { createdAt: "2026-10-10T09:00:00.000Z" } }),
    [{ screenId: "s-home", name: "Inicio", kind: "landing", route: "/", shell, layout }],
  );
  if (!generated.ok) throw new Error(generated.error.message);
  const hero = Object.keys(layout.blocks).find((id) => layout.blocks[id]!.type === "hero")!;
  const block: AiBlock = {
    html: `<section data-block-id="${hero}"></section>`,
    active: true,
    basis: "x",
    gates: { contrast: "ok", responsive: "ok", dropped: 0, warnings: [] },
    provenance: { kind: "generate", path: "free", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/1", seed: 1 },
  };
  const stored = applyPatch(generated.doc, aiBlockOps(generated.doc, "s-home", hero, block)!);
  if (!stored.ok) throw new Error(stored.error.message);
  return { doc: stored.doc, hero };
}

function docStore(doc: DesignDoc) {
  let current = doc;
  const applied: unknown[] = [];
  const state = () => ({
    doc: current,
    actions: {
      applyPatch: (ops: unknown) => {
        const result = applyPatch(current, ops);
        if (result.ok) {
          current = result.doc;
          applied.push(ops);
        }
        return result;
      },
    },
  });
  return { store: { getState: state } as never, applied, doc: () => current };
}

describe("generation store", () => {
  it("«Volver al diseño base» and «Usar IA otra vez» are one undoable patch each; the HTML stays", () => {
    const { doc, hero } = docWithAiHero();
    const host = docStore(doc);
    const store = createGenerationStore(host.store, { engine: () => ({}) as GenerationEngine });
    expect(store.getState().actions.setBlockActive("s-home", hero, false)).toBe(true);
    expect(host.doc().screens["s-home"]!.aiRender!.blocks[hero]).toMatchObject({ active: false, html: `<section data-block-id="${hero}"></section>` });
    expect(store.getState().actions.setBlockActive("s-home", hero, false)).toBe(false);
    expect(store.getState().actions.setBlockActive("s-home", hero, true)).toBe(true);
    expect(host.applied).toHaveLength(2);
  });

  it("remembers the «IA» control's choices and hands actions to the engine, loaded once", async () => {
    const { doc } = docWithAiHero();
    const engine = { start: vi.fn(async () => {}), cancel: vi.fn(), retryScreen: vi.fn(async () => {}), retryBlock: vi.fn(async () => {}), dismiss: vi.fn() };
    const factory = vi.fn(() => engine);
    const store = createGenerationStore(docStore(doc).store, { engine: factory });
    expect(store.getState().prefs).toEqual({ mode: "off", chip: "auto", screens: null });
    store.getState().actions.setPrefs({ mode: "design", chip: "luxury" });
    expect(store.getState().prefs).toEqual({ mode: "design", chip: "luxury", screens: null });
    await store.getState().actions.start({ screenIds: ["s-home"], chip: "luxury" });
    await store.getState().actions.retryScreen("s-home");
    expect(engine.start).toHaveBeenCalledWith({ screenIds: ["s-home"], chip: "luxury" });
    expect(engine.retryScreen).toHaveBeenCalledWith("s-home");
    expect(factory).toHaveBeenCalledOnce();
  });
});
