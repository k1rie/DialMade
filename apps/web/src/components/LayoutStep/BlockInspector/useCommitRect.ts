"use client";

import type { BlockId, GridRect, ScreenId } from "@dialmade/layout";
import { useCallback } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { useLayoutStoreApi } from "../useLayoutStore";
import { describeAdjustments } from "../adjustments";
import { ADJUSTED_TOAST_ID } from "./constants";
import { sameRect } from "./fields";

/** Which sentence announces the result: «Hero: columnas 1 a 8…» or «Hero, nuevo tamaño: …». */
export type RectChange = "moved" | "resized";

/**
 * Geometry edits of the inspector (fields, «Ajuste fino», alignments): one `setRect` (one undo step, then
 * `normalizeDrop` like a drop on the canvas). Announces where the block ended up and, when the drop was
 * adjusted, shows «Ajustado · Deshacer» (never a silent correction).
 */
export function useCommitRect(): (id: BlockId, rect: GridRect, screenId: ScreenId, change: RectChange) => void {
  const t = useDictionary(layout);
  const store = useLayoutStoreApi();
  const announce = useDndAnnounce();

  return useCallback(
    (id, rect, screenId, change) => {
      const before = store.getState().screens[screenId]?.layout.blocks[id];
      if (!before || sameRect(before.rect, rect)) return;
      const { actions } = store.getState();
      const adjustments = actions.setRect(id, rect, screenId);
      // «Deshacer» undoes this edit only: after any other change it says so instead of undoing that one.
      const token = actions.changeToken();
      const screen = store.getState().screens[screenId];
      const block = screen?.layout.blocks[id];
      if (!screen || !block) return;
      const adjusted = describeAdjustments(adjustments, (blockId) => screen.layout.blocks[blockId]?.label ?? blockId, t.adjusted);
      const where = change === "resized" ? t.canvas.resized(block.label, block.rect) : t.canvas.moved(block.label, block.rect);
      announce(adjusted ? `${where} ${adjusted}` : where);
      if (adjusted) {
        toast(t.adjusted.toast, {
          id: ADJUSTED_TOAST_ID,
          description: adjusted,
          action: {
            label: t.adjusted.undo,
            onClick: () => {
              if (actions.undoIfLatest(token)) announce(t.announce.undone);
              else toast(t.common.undoStale);
            },
          },
        });
      }
    },
    [announce, store, t],
  );
}
