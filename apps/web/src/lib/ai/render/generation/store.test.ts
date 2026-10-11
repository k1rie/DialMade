import { applyPatch, createDesignDoc, type AiBlock, type DesignDoc } from "@dialmade/doc";
import { getScreenTemplate, instantiateTemplate } from "@dialmade/layout";
import { describe, expect, it, vi } from "vitest";
import { withGeneratedScreens } from "@/lib/design-engine";
import type { GenerationEngine } from "./engine";
import { aiBlockOps } from "./patches";
import { createGenerationStore, setNextRunTransport, setRenderTransport } from "./store";
import type { GenerationDeps } from "./engine";
import type { RenderTransport } from "./types";

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
    expect(store.getState().prefs).toEqual({ mode: "off", chip: "auto", screens: null, style: "", references: [] });
    store.getState().actions.setPrefs({ mode: "design", chip: "luxury" });
    expect(store.getState().prefs).toEqual({ mode: "design", chip: "luxury", screens: null, style: "", references: [] });
    await store.getState().actions.start({ screenIds: ["s-home"], chip: "luxury" });
    await store.getState().actions.retryScreen("s-home");
    expect(engine.start).toHaveBeenCalledWith({ screenIds: ["s-home"], chip: "luxury" });
    expect(engine.retryScreen).toHaveBeenCalledWith("s-home");
    expect(factory).toHaveBeenCalledOnce();
  });
});

describe("«mi Claude» transport for one run", () => {
  it("is used by the next run only; the run after goes back to the paid path", async () => {
    const { doc } = docWithAiHero();
    let deps: GenerationDeps | null = null;
    const factory = vi.fn((_store: unknown, d: GenerationDeps) => {
      deps = d;
      return { start: vi.fn(async () => {}), cancel: vi.fn(), retryScreen: vi.fn(async () => {}), retryBlock: vi.fn(async () => {}), dismiss: vi.fn() } as unknown as GenerationEngine;
    });
    createGenerationStore(docStore(doc).store, { engine: factory }).getState().actions.dismiss();
    await vi.waitFor(() => expect(deps).not.toBeNull());
    const manual = { path: "manual" } as RenderTransport;
    const paid = { path: "byok" } as RenderTransport;
    setRenderTransport(paid);
    setNextRunTransport(manual);
    expect(await deps!.transport()).toBe(manual);
    expect(await deps!.transport()).toBe(paid);
    setRenderTransport(null);
  });
});

describe("reference screenshots of «Estilo»", () => {
  const shot = (n: number) => ({ id: `r-${n}`, name: `shot-${n}.png`, mediaType: "image/jpeg" as const, data: `ZGF0YQ${n}` });

  async function loadedStore() {
    const { doc } = docWithAiHero();
    let deps: GenerationDeps | null = null;
    const factory = vi.fn((_store: unknown, d: GenerationDeps) => {
      deps = d;
      return { start: vi.fn(async () => {}), cancel: vi.fn(), retryScreen: vi.fn(async () => {}), retryBlock: vi.fn(async () => {}), dismiss: vi.fn() } as unknown as GenerationEngine;
    });
    const store = createGenerationStore(docStore(doc).store, { engine: factory });
    store.getState().actions.dismiss();
    await vi.waitFor(() => expect(deps).not.toBeNull());
    return { store, deps: deps! };
  }

  it("stay attached until the engine says the direction call answered, then only the spent ones go", async () => {
    const { store, deps } = await loadedStore();
    store.getState().actions.setPrefs({ references: [shot(1), shot(2), shot(3)] });
    expect(store.getState().prefs.references).toHaveLength(3);

    deps.onDirectionUsed?.([{ data: shot(1).data }, { data: shot(3).data }]);
    expect(store.getState().prefs.references.map((reference) => reference.id)).toEqual(["r-2"]);
  });

  it("starting a run does not drop them by itself (a failed run keeps them for the next try)", async () => {
    const { store } = await loadedStore();
    store.getState().actions.setPrefs({ references: [shot(1)] });
    await store.getState().actions.start({ screenIds: ["s-home"], chip: "auto", references: [shot(1)] });
    expect(store.getState().prefs.references).toHaveLength(1);
  });
});

describe("gate 5 into the doc (Track D's verdict)", () => {
  it("replaces only the responsive warnings and writes nothing when the verdict repeats", async () => {
    const { responsiveGateOps } = await import("./patches");
    const { doc, hero } = docWithAiHero();
    const withContrast = applyPatch(doc, [{ op: "replace", path: `/screens/s-home/aiRender/blocks/${hero}/gates/warnings`, value: [{ code: "contrast-fixed", detail: "2" }, { code: "overflow", detail: "old" }] }]);
    if (!withContrast.ok) throw new Error(withContrast.error.message);
    const verdict = { responsive: "warn" as const, warnings: [{ code: "small-target" as const, detail: "mobile · 2" }] };
    const ops = responsiveGateOps(withContrast.doc, "s-home", hero, verdict)!;
    const next = applyPatch(withContrast.doc, ops);
    if (!next.ok) throw new Error(next.error.message);
    expect(next.doc.screens["s-home"]!.aiRender!.blocks[hero]!.gates).toMatchObject({
      responsive: "warn",
      warnings: [{ code: "contrast-fixed", detail: "2" }, { code: "small-target", detail: "mobile · 2" }],
    });
    expect(responsiveGateOps(next.doc, "s-home", hero, verdict)).toBeNull();
    expect(responsiveGateOps(next.doc, "s-home", "nope", verdict)).toBeNull();
  });
});
