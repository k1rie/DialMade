import { afterEach, describe, expect, it } from "vitest";
import { aiViewStore, isAiBusy, resetAiView, setAiBusy, setAiTarget, setBlockView, setScreenView, showsAi } from "./view";

describe("«Base | IA» and the island target", () => {
  afterEach(resetAiView);
  const shows = (screen: string, block: string) => showsAi(aiViewStore.getState(), screen, block);

  it("AI by default; the screen choice applies to every block; a block's own choice wins", () => {
    expect(shows("s-1", "b-1")).toBe(true);
    setScreenView("s-1", "base");
    expect(shows("s-1", "b-1")).toBe(false);
    expect(shows("s-2", "b-1")).toBe(true);
    setBlockView("s-1", "b-1", "ai");
    expect(shows("s-1", "b-1")).toBe(true);
    expect(shows("s-1", "b-2")).toBe(false);
  });

  it("a screen choice drops that screen's block choices (one state visible at a time)", () => {
    setBlockView("s-1", "b-1", "base");
    setBlockView("s-2", "b-9", "base");
    setScreenView("s-1", "ai");
    expect(shows("s-1", "b-1")).toBe(true);
    expect(shows("s-2", "b-9")).toBe(false);
  });

  it("keeps the text selected in an island and the blocks in flight", () => {
    setAiTarget({ screenId: "s-1", blockId: "b-1", t: 2, text: "Ver demo" });
    expect(aiViewStore.getState().target?.text).toBe("Ver demo");
    setAiBusy("s-1", "b-1", true);
    expect(isAiBusy(aiViewStore.getState(), "s-1", "b-1")).toBe(true);
    setAiBusy("s-1", "b-1", false);
    expect(isAiBusy(aiViewStore.getState(), "s-1", "b-1")).toBe(false);
  });
});
