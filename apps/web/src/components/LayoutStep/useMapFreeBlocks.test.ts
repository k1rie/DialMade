import { describe, expect, it } from "vitest";
import { layout as layoutText } from "@/i18n/layout";
import { MAP_MAX_BLOCKS } from "@/lib/ai/layout/constants";
import { MapRequestBodySchema } from "@/lib/ai/layout/api";
import { createLayoutStore } from "./useLayoutStore";
import { countFreeBlocks, freeBlocksOf, mapBodyFor } from "./useMapFreeBlocks";

function setup() {
  let n = 0;
  const store = createLayoutStore({
    newId: (prefix) => `${prefix}-${(++n).toString(36).padStart(6, "0")}`,
    labelFor: (type) => layoutText.es.blocks[type].name,
  });
  const { actions } = store.getState();
  return { store, actions };
}

describe("«Sugerir con IA» for free blocks: the request", () => {
  it("lists the project's free blocks top to bottom and sends them as one valid request, without default labels", () => {
    const { store, actions } = setup();
    const app = actions.addScreen("blank", "app")!;
    actions.insertBlock("calendar", { rect: { col: 0, row: 0, w: 8, h: 40 } });
    const late = actions.insertBlock("free", { rect: { col: 0, row: 60, w: 12, h: 20 } }).id!;
    const early = actions.insertBlock("free", { rect: { col: 8, row: 0, w: 4, h: 40 } }).id!;
    actions.updateBlock(early, { label: "Citas", note: "las de hoy" });

    const refs = freeBlocksOf(store.getState());
    expect(refs).toEqual([
      { screenId: app, blockId: early },
      { screenId: app, blockId: late },
    ]);
    expect(countFreeBlocks(store.getState())).toBe(2);

    const request = mapBodyFor(store.getState(), refs, "es")!;
    expect(MapRequestBodySchema.safeParse(request.body).success).toBe(true);
    expect(request.kinds).toEqual(["app", "app"]);
    expect(request.body.blocks[0]).toMatchObject({ label: "Citas", note: "las de hoy", screenKind: "app", neighbors: ["calendar"] });
    // «Bloque libre» says nothing about the box.
    expect(request.body.blocks[1]!.label).toBe("");
  });

  it("uses what was typed in «¿Qué es esto?» as the note of a single box, and caps a batch", () => {
    const { store, actions } = setup();
    const screenId = actions.addScreen("blank", "landing")!;
    const ids = Array.from({ length: MAP_MAX_BLOCKS + 3 }, (_, i) => actions.insertBlock("free", { rect: { col: 0, row: i * 10, w: 12, h: 8 } }).id!);
    const one = mapBodyFor(store.getState(), [{ screenId, blockId: ids[0]! }], "en", "photos of the shop")!;
    expect(one.body.blocks[0]!.note).toBe("photos of the shop");

    const all = mapBodyFor(store.getState(), freeBlocksOf(store.getState()), "en")!;
    expect(all.body.blocks).toHaveLength(MAP_MAX_BLOCKS);
    expect(all.refs).toHaveLength(MAP_MAX_BLOCKS);
    expect(mapBodyFor(store.getState(), [], "en")).toBeNull();
  });
});
