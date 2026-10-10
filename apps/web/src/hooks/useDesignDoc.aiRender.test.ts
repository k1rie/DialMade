// «Diseño con IA» hook points of the DesignDoc store (track B): a «Generar» (duplicate a screen, remove a block) and
// a rebuild of the pages carry the AI blocks in the same write, and every AI edit is one undo step.
import { beforeAll, describe, expect, it } from "vitest";
import { aiBlockOf, staleAiBlocks, textEditOps } from "@/lib/ai/render/edit";
import { designedDoc } from "@/lib/ai/render/editFixtures";
import { designEngine, type GeneratedScreenInput } from "@/lib/design-engine";
import { createDesignDocStore, loadDesignEngine } from "./useDesignDoc";

beforeAll(async () => {
  await loadDesignEngine(async () => designEngine);
});

function setup() {
  const designed = designedDoc({ direction: true });
  const store = createDesignDocStore({ doc: designed.doc, engineReady: true });
  return { ...designed, store, actions: store.getState().actions, history: () => store.temporal.getState(), live: () => store.getState().doc! };
}

const without = (screen: GeneratedScreenInput, id: string): GeneratedScreenInput => {
  const blocks = { ...screen.layout.blocks };
  delete blocks[id];
  return { ...screen, layout: { ...screen.layout, blocks } };
};

describe("AI blocks through the store", () => {
  it("«Generar» without AI keeps every AI block, as one undo step", () => {
    const { actions, history, live, draft, hero, features } = setup();
    expect(actions.applyGenerate({ screens: draft }).ok).toBe(true);
    expect(Object.keys(live().screens["s-home"]!.aiRender!.blocks).sort()).toEqual([hero, features].sort());
    expect(history().pastStates).toHaveLength(1);
  });

  it("removing a block in the Layout removes its AI block; undo brings it back", () => {
    const { actions, history, live, draft, features } = setup();
    expect(actions.applyGenerate({ screens: [without(draft[0]!, features)] }).ok).toBe(true);
    expect(aiBlockOf(live(), "s-home", features)).toBeUndefined();
    expect(live().screens["s-home"]!.aiRender!.stash![features]).toBeDefined();
    history().undo();
    expect(aiBlockOf(live(), "s-home", features)?.active).toBe(true);
  });

  it("a «Duplicar» copy keeps its source's AI blocks under its own ids", () => {
    const { actions, live, draft, hero } = setup();
    const source = draft[0]!;
    const blocks: Record<string, string> = {};
    const layoutBlocks: GeneratedScreenInput["layout"]["blocks"] = {};
    for (const [id, block] of Object.entries(source.layout.blocks)) {
      const copyId = `c${id.slice(1)}`;
      blocks[copyId] = id;
      layoutBlocks[copyId] = block.parentId ? { ...block, parentId: `c${block.parentId.slice(1)}` } : block;
    }
    const copy: GeneratedScreenInput = { ...source, screenId: "s-copy", name: "Inicio (copia)", route: "/copia", layout: { ...source.layout, blocks: layoutBlocks }, copyOf: { screenId: "s-home", blocks } };
    expect(actions.applyGenerate({ screens: [source, copy] }).ok).toBe(true);
    const copied = aiBlockOf(live(), "s-copy", `c${hero.slice(1)}`);
    expect(copied?.html).toContain(`data-block-id="c${hero.slice(1)}"`);
    expect(aiBlockOf(live(), "s-home", hero)).toBeDefined();
  });

  it("a new language rebuilds the pages and keeps the AI blocks, now «Desactualizado»", () => {
    const { actions, live, hero } = setup();
    expect(actions.setContentLocale("en", { rebuildPages: true }).ok).toBe(true);
    expect(aiBlockOf(live(), "s-home", hero)).toBeDefined();
    expect(staleAiBlocks(live(), "s-home").has(hero)).toBe(true);
  });

  it("an inline text edit is one undo step", () => {
    const { actions, history, live, hero } = setup();
    expect(actions.applyPatch(textEditOps(live(), "s-home", hero, 3, "14 días gratis")!).ok).toBe(true);
    expect(aiBlockOf(live(), "s-home", hero)!.html).toContain("14 días gratis");
    expect(history().pastStates).toHaveLength(1);
    history().undo();
    expect(aiBlockOf(live(), "s-home", hero)!.html).toContain("Sin tarjeta");
  });
});
