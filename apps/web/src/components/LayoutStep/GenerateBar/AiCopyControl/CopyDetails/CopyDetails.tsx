"use client";

import { useMemo } from "react";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { compileScreenLayout } from "@/lib/screen-layout";
import { aiTargetsFor } from "../../../generateFlow";
import { useGenerateAi } from "../../../useGenerateFlow";
import { AiAccessActions } from "../AiAccessActions";
import { documentAfterGenerate } from "../documentAfterGenerate";
import { selectChangedBlocks, useChangedCount, useHasGenerated, useLayoutEnv, useLayoutStore, type LayoutState } from "../../../useLayoutStore";

export type CopyDetailsProps = {
  /** The popover is open: only then the next document is built for the estimate. */
  open: boolean;
  /** Closes the popover (before a dialog takes over). */
  close: () => void;
};

/** «Textos con IA»: one line on what it does, a status only when it matters (no texts, no free use, a cut) and the ways to Claude. */
export function CopyDetails({ open, close }: CopyDetailsProps) {
  const t = useDictionary(aiText).layoutCopy;
  const { ai, openKeyDialog, copyPrompt } = useGenerateAi();
  const { doc } = useLayoutEnv();
  const screens = useLayoutStore((state) => state.screens);
  const order = useLayoutStore((state) => state.screenOrder);
  const prints = useLayoutStore((state) => state.generatedPrints);
  const changedCount = useChangedCount();
  const hasGenerated = useHasGenerated();
  const pending = changedCount > 0 || !hasGenerated;

  // Only while the popover is open: building the next document costs a few ms for a large project.
  const plan = useMemo(() => {
    if (!open) return null;
    const view: Pick<LayoutState, "screens" | "screenOrder" | "generatedPrints"> = { screens, screenOrder: order, generatedPrints: prints };
    const changes = selectChangedBlocks(view);
    const targets = aiTargetsFor(changes, (id) => {
      const screen = screens[id];
      return screen ? compileScreenLayout(screen).absorbed : {};
    });
    const next = pending ? documentAfterGenerate(doc, screens, order) : doc;
    return { targets, next };
  }, [open, screens, order, prints, pending, doc]);
  const estimate = useMemo(() => (plan ? ai.estimate(plan.targets, plan.next) : null), [plan, ai]);

  const blocked = ai.source === null && ai.fallbackReason !== null;
  const noFields = plan !== null && estimate === null;
  // Only what changes the choice: no text to write, no free use left, or a cut. The cost and the uses are in the
  // meter above and in the CTA's tooltip.
  const status = noFields ? t.noFields : blocked && ai.fallbackReason ? t.blocked[ai.fallbackReason] : estimate?.truncated ? t.truncated(estimate.maxFields) : null;

  return (
    <>
      <p className="m-0 text-caption text-muted">{t.description}</p>
      {status && <p className="m-0 text-caption text-fg">{status}</p>}
      <AiAccessActions
        hasKey={ai.source === "byok"}
        keyFirst={blocked}
        claudeDisabled={noFields}
        onUseKey={() => {
          close();
          openKeyDialog();
        }}
        onUseClaude={() => {
          close();
          copyPrompt();
        }}
      />
    </>
  );
}
