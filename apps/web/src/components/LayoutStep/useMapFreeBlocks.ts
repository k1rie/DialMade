"use client";

// «Sugerir con IA» for free blocks (Modo Layout v1.1), shared by the «¿Qué es esto?» popover (one box) and the
// screen panel's batch action (every free block of the project, up to MAP_MAX_BLOCKS): ONE request = ONE free use
// whatever the number of boxes. The answer is validated (`useLayoutAi`), checked against the request
// (`normalizeMapAnswer`) and applied with `retypeBlocks` as one undo step. When the free tier cannot answer, the
// layout AI dialog offers «Usar mi propia key» and «Copiar prompt para mi Claude» for the same request.
import { isLibraryBlockType, type BlockId, type LibraryBlockType, type ScreenId, type ScreenKind } from "@dialmade/layout";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { locales, useI18n } from "@/i18n";
import { layout as layoutText } from "@/i18n/layout";
import type { MapRequestBody } from "@/lib/ai/layout/api";
import { MAP_MAX_BLOCKS, MAP_MAX_NEIGHBORS } from "@/lib/ai/layout/constants";
import { normalizeMapAnswer } from "@/lib/ai/layout/normalize";
import { LayoutAiError, useLayoutAi, useLayoutAiDialog, type LayoutAiResult } from "./useLayoutAi";
import { useLayoutActions, useLayoutStoreApi, type LayoutState } from "./useLayoutStore";

/** One free block of the project. */
export type FreeBlockRef = { screenId: ScreenId; blockId: BlockId };

export type MapOutcome = {
  /** Blocks that took a library type. */
  changed: number;
  /** The type each requested block took (`free`: the AI left it). */
  types: Map<BlockId, LibraryBlockType>;
};

/** The project's free blocks in screen order, then top to bottom. */
export function freeBlocksOf(state: Pick<LayoutState, "screens" | "screenOrder">): FreeBlockRef[] {
  return state.screenOrder.flatMap((screenId) => {
    const screen = state.screens[screenId];
    if (!screen) return [];
    return Object.entries(screen.layout.blocks)
      .filter(([, block]) => block.type === "free")
      .sort(([, a], [, b]) => a.rect.row - b.rect.row || a.rect.col - b.rect.col)
      .map(([blockId]) => ({ screenId, blockId }));
  });
}

/** Count of free blocks (a primitive, for a store selector). */
export const countFreeBlocks = (state: Pick<LayoutState, "screens" | "screenOrder">) => freeBlocksOf(state).length;

/** «Bloque libre» in any UI language says nothing about the box: it is not sent. */
const isDefaultFreeLabel = (label: string) => locales.some((locale) => layoutText[locale].blocks.free.name === label);

/** The request for `refs` (the first MAP_MAX_BLOCKS). `note` replaces the note of a single box (what was typed in «¿Qué es esto?»). */
export function mapBodyFor(
  state: Pick<LayoutState, "screens">,
  refs: readonly FreeBlockRef[],
  locale: MapRequestBody["locale"],
  note?: string,
): { body: MapRequestBody; refs: FreeBlockRef[]; kinds: ScreenKind[] } | null {
  const kept: FreeBlockRef[] = [];
  const blocks: MapRequestBody["blocks"] = [];
  const kinds: ScreenKind[] = [];
  for (const ref of refs) {
    if (blocks.length >= MAP_MAX_BLOCKS) break;
    const screen = state.screens[ref.screenId];
    const block = screen?.layout.blocks[ref.blockId];
    if (!screen || !block || block.type !== "free") continue;
    const neighbors = [
      ...new Set(
        Object.entries(screen.layout.blocks)
          .filter(([id, other]) => id !== ref.blockId && other.type !== "free" && isLibraryBlockType(other.type))
          .map(([, other]) => other.type),
      ),
    ].slice(0, MAP_MAX_NEIGHBORS) as LibraryBlockType[];
    const typed = (refs.length === 1 && note?.trim()) || block.note || "";
    blocks.push({
      screen: screen.name.slice(0, 60) || "-",
      screenKind: screen.kind,
      label: isDefaultFreeLabel(block.label) ? "" : block.label.slice(0, 60),
      ...(typed && { note: typed.slice(0, 200) }),
      rect: block.rect,
      ...(neighbors.length > 0 && { neighbors }),
    });
    kept.push(ref);
    kinds.push(screen.kind);
  }
  if (blocks.length === 0) return null;
  return { body: { task: "map", locale, blocks }, refs: kept, kinds };
}

export type UseMapFreeBlocks = {
  /** ONE request for `refs`; `null` when nothing was applied (no free block, cancelled, the dialog took over, an error toast). */
  run: (refs: readonly FreeBlockRef[], options?: { note?: string; onResult?: (outcome: MapOutcome) => void }) => Promise<MapOutcome | null>;
  /** The line shown before calling («≈ $0,001 · te quedan 4 usos gratis»). */
  costLine: (refs: readonly FreeBlockRef[]) => string;
  pending: boolean;
  /** Where the next request goes (`hosted` spends a free use). */
  source: ReturnType<typeof useLayoutAi>["source"];
};

export function useMapFreeBlocks(): UseMapFreeBlocks {
  const ai = useLayoutAi();
  const dialog = useLayoutAiDialog();
  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const { locale } = useI18n();
  const [pending, setPending] = useState(false);
  // «Usar mi propia key» runs the same request again once the key is saved.
  const runRef = useRef<UseMapFreeBlocks["run"] | null>(null);

  const apply = useCallback(
    (result: LayoutAiResult, refs: readonly FreeBlockRef[], kinds: readonly ScreenKind[]): MapOutcome => {
      const types = new Map<BlockId, LibraryBlockType>(refs.map((ref) => [ref.blockId, "free"]));
      if (result.answer.task !== "map") return { changed: 0, types };
      const { suggestions } = normalizeMapAnswer(result.answer.answer, kinds);
      const changes = suggestions.map(({ index, type }) => ({ ...refs[index]!, type }));
      for (const change of changes) types.set(change.blockId, change.type);
      const changed = actions.retypeBlocks(changes);
      return { changed, types };
    },
    [actions],
  );

  const run = useCallback<UseMapFreeBlocks["run"]>(
    async (refs, options = {}) => {
      const request = mapBodyFor(store.getState(), refs, locale, options.note);
      if (!request) return null;
      const manual = ai.manualJob(request.body);
      const openDialog = (reason: typeof ai.fallbackReason, view: "key" | "manual" = "key") => {
        dialog?.open({
          view,
          reason,
          manual,
          onManualResult: (result) => {
            const outcome = apply(result, request.refs, request.kinds);
            options.onResult?.(outcome);
          },
          onKeySaved: () => void runRef.current?.(refs, options),
        });
      };
      if (ai.source === null) {
        openDialog(ai.fallbackReason);
        return null;
      }
      setPending(true);
      try {
        const result = await ai.request(request.body);
        const outcome = apply(result, request.refs, request.kinds);
        options.onResult?.(outcome);
        return outcome;
      } catch (error) {
        if (error instanceof LayoutAiError && error.code === "aborted") return null;
        if (error instanceof LayoutAiError && error.fallback) openDialog(error.fallback);
        else toast.error(error instanceof Error ? error.message : String(error));
        return null;
      } finally {
        setPending(false);
      }
    },
    [ai, dialog, store, locale, apply],
  );

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const costLine = useCallback(
    (refs: readonly FreeBlockRef[]) => ai.costLine(mapBodyFor(store.getState(), refs, locale)?.body ?? null),
    [ai, store, locale],
  );

  return { run, costLine, pending, source: ai.source };
}
