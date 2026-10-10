"use client";

import type { LayoutFix, ScreenId } from "@dialmade/layout";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { ScreensIcon, SparkleIcon } from "../icons";
import { getStructure } from "../structureCache";
import type { Tool } from "../types";
import { useGenerateAi } from "../useGenerateFlow";
import {
  selectActiveScreen,
  useActiveScreenId,
  useChangedCount,
  useHasGenerated,
  useLayoutActions,
  useLayoutEnv,
  useLayoutStore,
  useLayoutStoreApi,
  useScreens,
} from "../useLayoutStore";
import { AiCopyControl } from "./AiCopyControl";
import { countStats, ctaState, replaceWithTemplateSet } from "./barState";
import { GenerateReport } from "./GenerateReport";
import { ToolPicker } from "./ToolPicker";
import { WarningsMenu } from "./WarningsMenu";
import { warningGroups } from "./warnings";

export type GenerateBarProps = { className?: string };

/**
 * Floating bar at the bottom of the canvas (ref 11B Replit): the canvas tools Dibujar (R) · Editar (V) ·
 * Mano (H), the status of the project («9 bloques · 2 avisos», the warnings open a list with fixes), the
 * optional «Escribir textos con IA» (AiCopyControl) and the primary action, which depends on the state:
 * «Usar plantilla» while every screen is empty, «Generar diseño», then «Regenerar N bloques» or «Generar de
 * nuevo». Hover or focus on Generar calls `onGenerateIntent` (preloads the Composer). Generar runs the
 * step's moment (`env.generate`); only the standalone step (no moment) opens the report.
 *
 * The root spans the width of its slot (it is the container of the container queries that compact the
 * bar) and lets pointer events through; only the bar itself takes them. Under 640 px (no canvas) the
 * tools are hidden.
 */
export function GenerateBar({ className }: GenerateBarProps) {
  const t = useDictionary(layout);
  const aiT = useDictionary(aiText).layoutCopy;
  const announce = useDndAnnounce({ politeness: "polite" });
  const { narrow, onGenerateIntent, generate } = useLayoutEnv();
  const { supported: aiSupported, enabled: aiOn } = useGenerateAi();
  const actions = useLayoutActions();
  const store = useLayoutStoreApi();
  const screens = useScreens();
  const activeScreenId = useActiveScreenId();
  const activeKind = useLayoutStore((state) => selectActiveScreen(state)?.kind ?? null);
  const tool = useLayoutStore((state) => state.tool);
  const shortcutsEnabled = useLayoutStore((state) => state.shortcutsEnabled);
  // A document generated in an earlier visit counts too: its blocks carry their fingerprints.
  const generated = useHasGenerated();
  const changed = useChangedCount();
  const [reportOpen, setReportOpen] = useState(false);
  // Said by the report once it is open: the modal makes this page's live region inert.
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  const stats = useMemo(() => countStats(screens.map((screen) => ({ layout: screen.layout, warnings: getStructure(screen.layout).warnings }))), [screens]);
  const groups = useMemo(() => warningGroups(screens, getStructure, activeScreenId), [screens, activeScreenId]);
  const cta = ctaState({ blocks: stats.blocks, generated, changed, activeKind });

  const changeTool = useCallback(
    (next: Tool) => {
      actions.setTool(next);
      announce(t.announce.toolChanged(t.tools[next].label));
    },
    [actions, announce, t],
  );

  const fix = useCallback(
    (layoutFix: LayoutFix, screenId: ScreenId, blockName: string) => {
      if (!actions.applyFix(layoutFix, screenId)) return false;
      announce(t.announce.fixApplied(t.fixes[layoutFix.kind], blockName));
      return true;
    },
    [actions, announce, t],
  );

  const runCta = () => {
    if (cta.kind === "template") {
      const created = replaceWithTemplateSet(actions, store.getState().screenOrder, cta.set);
      if (created.length > 0) announce(t.generate.templateApplied(t.sets[cta.set].name));
      return;
    }
    // Refused by the flow: its own message (a toast with the way out) says why. A moment (the reveal, the AI
    // copy) says the rest. Only the standalone step, without a moment, opens the report.
    if (generate() !== "done") return;
    const result = store.getState().generated;
    if (!result) return;
    const totals = countStats(result.screens);
    setGeneratedMessage(t.announce.generated(totals.screens, totals.blocks));
    setReportOpen(true);
  };

  const ctaLabel =
    cta.kind === "template"
      ? t.generate.useTemplate(t.sets[cta.set].name)
      : cta.kind === "generate"
        ? t.generate.button
        : cta.kind === "regenerate"
          ? t.generate.regenerate(cta.count)
          : t.generate.again;
  const ctaHint =
    cta.kind === "template" ? t.generate.emptyHint : aiOn ? aiT.ctaHint : cta.kind === "again" ? t.generate.upToDateHint : t.generate.noAi;
  // «Usar plantilla» is not a Generar: no preload intent.
  const intent = cta.kind === "template" ? undefined : onGenerateIntent;

  return (
    <div className={cn("@container flex w-full min-w-0 justify-center pointer-events-none!", className)}>
      <div
        role="group"
        aria-label={t.bottomBar.label}
        className="glass pointer-events-auto flex max-w-full min-w-0 items-center gap-2 rounded-panel border border-app p-2 shadow-lift"
      >
        {!narrow && (
          <>
            <ToolPicker value={tool} onChange={changeTool} shortcutsEnabled={shortcutsEnabled} />
            <span aria-hidden className="h-5 w-px shrink-0 bg-white/10" />
          </>
        )}

        <div className="flex min-w-0 items-center gap-1 text-caption text-muted">
          <span className="sr-only truncate @2xl:not-sr-only">{t.generate.summary(stats)}</span>
          <span aria-hidden className="hidden text-subtle @2xl:inline">
            ·
          </span>
          <WarningsMenu groups={groups} count={stats.warnings} activeScreenId={activeScreenId} onFix={fix} />
        </div>

        {aiSupported && cta.kind !== "template" && <AiCopyControl onIntent={intent} />}

        <Tooltip content={ctaHint} side="top">
          <Button
            variant="primary"
            size="md"
            leadingIcon={cta.kind === "template" ? <ScreensIcon /> : <SparkleIcon />}
            onClick={runCta}
            onPointerEnter={intent}
            onFocus={intent}
            className="min-w-0 [&>span]:truncate"
          >
            <motion.span key={ctaLabel} className="block truncate" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={tween(0.16)}>
              {ctaLabel}
            </motion.span>
          </Button>
        </Tooltip>
      </div>

      <GenerateReport open={reportOpen} onOpenChange={setReportOpen} initialScreenId={activeScreenId} openAnnouncement={generatedMessage} />
    </div>
  );
}
