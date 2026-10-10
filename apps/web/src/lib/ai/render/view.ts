// What «Ajustar» shows of the AI blocks right now (spec §8.2): the «Base | IA» comparison, for the whole screen (top
// bar) or one block (floating bar), and the text the user clicked inside an island (the «Pedir cambio» target).
// View state only: never in the DesignDoc, never in the undo history. The islands (track A's `AiBlocks`) paint a
// block with its AI design when `showsAi` says so, and the selection toolbar reads the same store.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type AiView = "ai" | "base";

/** The text node of an AI block the user selected in its island (`select {t, text}` of the protocol). */
export type AiTextTarget = { screenId: string; blockId: string; t: number | null; text: string | null };

type AiViewState = {
  /** Screens shown in their base design («Base» in the top bar). */
  baseScreens: Readonly<Record<string, true>>;
  /** One block's own choice in the floating bar (`screenId/blockId`), over its screen's. */
  blockViews: Readonly<Record<string, AiView>>;
  target: AiTextTarget | null;
  /** Blocks with an AI action in flight (`screenId/blockId`): the island shows its shimmer, the card its progress. */
  busy: Readonly<Record<string, true>>;
};

const blockKey = (screenId: string, blockId: string) => `${screenId}/${blockId}`;

export const aiViewStore = createStore<AiViewState>(() => ({ baseScreens: {}, blockViews: {}, target: null, busy: {} }));

const toggled = (record: Readonly<Record<string, true>>, key: string, on: boolean): Record<string, true> => {
  const next = { ...record };
  if (on) next[key] = true;
  else delete next[key];
  return next;
};

/** Whether a block that HAS an active AI block shows it now: its own choice, else its screen's. */
export function showsAi(state: Pick<AiViewState, "baseScreens" | "blockViews">, screenId: string, blockId: string): boolean {
  const own = state.blockViews[blockKey(screenId, blockId)];
  return own ? own === "ai" : !state.baseScreens[screenId];
}

/** «Base | IA» for a whole screen; drops the per-block choices of that screen (one state visible at a time). */
export function setScreenView(screenId: string, view: AiView) {
  const { baseScreens, blockViews } = aiViewStore.getState();
  const prefix = `${screenId}/`;
  aiViewStore.setState({
    baseScreens: toggled(baseScreens, screenId, view === "base"),
    blockViews: Object.fromEntries(Object.entries(blockViews).filter(([key]) => !key.startsWith(prefix))),
  });
}

/** «Base | IA» for one block (over its screen's choice). */
export function setBlockView(screenId: string, blockId: string, view: AiView) {
  aiViewStore.setState({ blockViews: { ...aiViewStore.getState().blockViews, [blockKey(screenId, blockId)]: view } });
}

export function setAiTarget(target: AiTextTarget | null) {
  aiViewStore.setState({ target });
}

export function setAiBusy(screenId: string, blockId: string, busy: boolean) {
  aiViewStore.setState({ busy: toggled(aiViewStore.getState().busy, blockKey(screenId, blockId), busy) });
}

export const isAiBusy = (state: Pick<AiViewState, "busy">, screenId: string, blockId: string): boolean => state.busy[blockKey(screenId, blockId)] === true;

export function useAiView<T>(selector: (state: AiViewState) => T): T {
  return useStore(aiViewStore, selector);
}

/** Tests. */
export function resetAiView() {
  aiViewStore.setState({ baseScreens: {}, blockViews: {}, target: null, busy: {} });
}
