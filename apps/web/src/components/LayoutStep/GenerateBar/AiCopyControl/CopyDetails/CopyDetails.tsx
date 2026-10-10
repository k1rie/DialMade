"use client";

import type { DesignDoc } from "@dialmade/doc";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary, useI18n } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { withGeneratedScreens, type GeneratedScreenInput } from "@/lib/design-engine";
import { formatUsd } from "@/lib/money";
import { compileScreenLayout } from "@/lib/screen-layout";
import { aiTargetsFor } from "../../../generateFlow";
import { getResponsive, getStructure } from "../../../structureCache";
import type { Screen } from "../../../types";
import { useGenerateAi } from "../../../useGenerateFlow";
import { selectChangedBlocks, useChangedCount, useHasGenerated, useLayoutEnv, useLayoutStore, type LayoutState } from "../../../useLayoutStore";

export type CopyDetailsProps = {
  /** The popover is open: only then the next document is built for the estimate. */
  open: boolean;
  /** Closes the popover (before a dialog takes over). */
  close: () => void;
};

/** The document as «Generar» would write it now (the AI estimate must count the copy it will rewrite). */
function documentAfterGenerate(doc: DesignDoc, screens: Readonly<Record<string, Screen>>, order: readonly string[]): DesignDoc {
  const inputs: GeneratedScreenInput[] = order.flatMap((id) => {
    const screen = screens[id];
    if (!screen) return [];
    const { layout } = screen;
    return [{ screenId: id, name: screen.name, kind: screen.kind, route: screen.route, shell: screen.shell, layout, structure: getStructure(layout), responsive: getResponsive(layout) }];
  });
  if (inputs.length === 0) return doc;
  const result = withGeneratedScreens(doc, inputs);
  return result.ok ? result.doc : doc;
}

/** «Textos con IA»: the cost and scope of the one copy request (critique #7), as before the «IA» control. */
export function CopyDetails({ open, close }: CopyDetailsProps) {
  const t = useDictionary(aiText).layoutCopy;
  const { locale } = useI18n();
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
    return { targets, next, changedOnly: targets.some((target) => target.sectionIds !== undefined) };
  }, [open, screens, order, prints, pending, doc]);
  const estimate = useMemo(() => (plan ? ai.estimate(plan.targets, plan.next) : null), [plan, ai]);

  const blocked = ai.source === null && ai.fallbackReason !== null;
  const noFields = plan !== null && estimate === null;
  const cost = estimate ? t.estimate(formatUsd(estimate.costUsd, locale)) : null;
  let costLine: string;
  if (noFields) costLine = t.noFields;
  else if (blocked && ai.fallbackReason) costLine = t.blocked[ai.fallbackReason];
  else if (ai.source === "byok") costLine = cost ? `${cost} · ${t.withKey}` : t.withKey;
  else if (ai.source === "hosted") {
    const uses = ai.freeUsesRemaining === null ? t.oneUse : t.usesLeft(ai.freeUsesRemaining);
    costLine = cost ? `${cost} · ${uses}` : uses;
  } else costLine = cost ?? "";

  return (
    <>
      <p className="m-0 text-caption text-muted">{t.description}</p>
      <div className="flex flex-col gap-1 rounded-control border border-app bg-white/[0.02] px-3 py-2.5">
        {costLine && <span className="font-mono text-caption text-muted tabular-nums">{costLine}</span>}
        {estimate && (
          <span className="text-caption text-muted">
            {t.scope(estimate.blocks, plan?.changedOnly ?? false)}
            {ai.source !== "byok" && !blocked && ` ${t.oneUse}`}
          </span>
        )}
        {estimate?.truncated && <span className="text-caption text-fg">{t.truncated(estimate.maxFields)}</span>}
      </div>
      <div className="flex flex-col items-start gap-1.5 border-t border-app pt-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={blocked ? "primary" : "secondary"}
            onClick={() => {
              close();
              openKeyDialog();
            }}
          >
            {ai.source === "byok" ? t.manageKey : t.useKey}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={noFields}
            onClick={() => {
              close();
              copyPrompt();
            }}
          >
            {t.useClaude}
          </Button>
        </div>
        <p className="m-0 text-caption text-muted">{t.claudeHint}</p>
      </div>
    </>
  );
}
