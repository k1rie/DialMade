"use client";

import { useId } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { layout } from "@/i18n/layout";
import { MAP_MAX_BLOCKS } from "@/lib/ai/layout/constants";
import { cn } from "@/lib/cn";
import { FIELD_HINT } from "../../fieldStyles";
import { SparkleIcon } from "../../icons";
import { countFreeBlocks, freeBlocksOf, useMapFreeBlocks, type MapOutcome } from "../../useMapFreeBlocks";
import { useLayoutActions, useLayoutStore, useLayoutStoreApi } from "../../useLayoutStore";

export type SuggestTypesProps = { className?: string };

/**
 * «Sugerir tipos con IA» for every free block of the project (the first MAP_MAX_BLOCKS) in ONE request, ONE free
 * use, with the cost and the free uses left shown before calling. The new types land as one undo step, then
 * «Ajustado · Deshacer». Nothing shows while the project has no free blocks.
 */
export function SuggestTypes({ className }: SuggestTypesProps) {
  const t = useDictionary(layout);
  const a = useDictionary(aiText).layoutAi;
  const id = useId();
  const announce = useDndAnnounce({ politeness: "polite" });
  const store = useLayoutStoreApi();
  const actions = useLayoutActions();
  const count = useLayoutStore(countFreeBlocks);
  const { run, costLine, pending, source } = useMapFreeBlocks();
  // Recomputed on render: the panel re-renders when the free blocks change (`count`) or the request ends.
  const cost = count > 0 ? costLine(freeBlocksOf(store.getState())) : "";

  if (count === 0) return null;

  const report = (outcome: MapOutcome) => {
    const token = actions.changeToken();
    const message = outcome.changed > 0 ? t.screenPanel.mapped(outcome.changed) : t.screenPanel.mappedNone;
    announce(message);
    if (outcome.changed === 0) {
      toast(message);
      return;
    }
    toast(t.adjusted.toast, {
      description: message,
      action: {
        label: t.adjusted.undo,
        onClick: () => {
          if (actions.undoIfLatest(token)) announce(t.announce.undone);
          else toast(t.common.undoStale);
        },
      },
    });
  };

  const suggest = () => void run(freeBlocksOf(store.getState()), { onResult: report });

  return (
    <div role="group" aria-labelledby={`${id}-count`} className={cn("flex flex-col gap-1.5 rounded-card border border-app bg-white/[0.02] p-3", className)}>
      <p id={`${id}-count`} className="m-0 text-caption font-medium text-fg">
        {t.screenPanel.freeBlocks(count)}
      </p>
      <Button
        size="sm"
        variant="secondary"
        leadingIcon={<SparkleIcon />}
        loading={pending}
        disabled={pending}
        aria-describedby={`${id}-hint ${id}-cost`}
        onClick={suggest}
        className="self-start"
      >
        {pending ? t.screenPanel.mapping : t.screenPanel.mapFree}
      </Button>
      <p id={`${id}-hint`} className={cn(FIELD_HINT, "m-0")}>
        {t.screenPanel.mapFreeHint}
        {count > MAP_MAX_BLOCKS && ` ${t.screenPanel.mapFreeMore(MAP_MAX_BLOCKS)}`}
      </p>
      {cost && (
        <p id={`${id}-cost`} className={cn(FIELD_HINT, "m-0 tabular-nums")}>
          {source === "hosted" ? `${cost} · ${a.oneUseMap}` : cost}
        </p>
      )}
    </div>
  );
}
