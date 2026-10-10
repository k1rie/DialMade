"use client";

import { productChips } from "@dialmade/catalog";
import type { ScreenKind } from "@dialmade/layout";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button, Spinner } from "@/components/ui/Button";
import { docHasDesign, useOptionalDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { layout, type DescribeKind } from "@/i18n/layout";
import type { LayoutProposal } from "@/lib/ai/layout/normalize";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { SparkleIcon } from "../icons";
import { KindQuestion } from "../KindQuestion";
import { useLayoutActions, useLayoutEnv, useLayoutStore, type ProposalMode } from "../useLayoutStore";
import { ChooseVariant } from "./ChooseVariant";
import { DescribeForm } from "./DescribeForm";
import { DetailsPanel } from "./DetailsPanel";
import { useDescribe, type DescribePhase } from "./useDescribe";

export type DescribeScreensProps = {
  /**
   * `start`: the empty state, as two screens: «¿Qué vas a construir?» (with «Detalles», «o usa una plantilla» and
   * «empieza vacío») and «Elige una». `add`: inside the «Describir» dialog, the form with the variants under it.
   */
  mode: "start" | "add";
  /** After a variant was applied (the dialog closes). */
  onApplied?: () => void;
  /** Start only: «o usa una plantilla». */
  onTemplates?: () => void;
  /** Start only: «empieza vacío», once web or app is answered. */
  onBlank?: (kind: ScreenKind) => void;
  /** Start only: the screen replaced another one (focus its heading). */
  focusHeading?: boolean;
  className?: string;
};

type Results = Extract<DescribePhase, { kind: "results" }>;
type View = "describe" | "choose";

/** Fade and a short slide, 200 ms each way (≤ 400 ms for the whole change); only the fade with reduced motion. */
const screenMotion = (reduce: boolean | null, direction: 1 | -1) => ({
  initial: { opacity: 0, x: reduce ? 0 : 16 * direction },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: reduce ? 0 : -16 * direction },
  transition: tween(0.2),
});

/**
 * «Describe tu producto» (Modo Layout v1.1): free text in, 2–3 variants out, each one screens made only of library
 * blocks with links, a recommended style and its reason. «Proponer con IA» is ONE request and ONE free use for every
 * variant, with the cost and the free uses left shown before calling; «Sin IA» proposes from keywords and synonyms
 * for free; «Usar mi propia key» and «Copiar prompt para mi Claude» are the other ways. The description also fills
 * «Detalles» (name, tagline, product type) where the user had not. «Usar esta» applies a variant as ONE undo step
 * (with its style when the switch is on), then «Ajustado · Deshacer». Nothing to drag.
 */
export function DescribeScreens({ mode, onApplied, onTemplates, onBlank, focusHeading = false, className }: DescribeScreensProps) {
  const t = useDictionary(layout);
  const a = useDictionary(aiText).layoutAi;
  const d = t.describe;
  const { locale } = useI18n();
  const id = useId();
  const reduce = useReducedMotion();
  const announce = useDndAnnounce({ politeness: "polite" });
  const actions = useLayoutActions();
  const { doc, narrow, focusRegion } = useLayoutEnv();
  const designStore = useOptionalDesignDocStore();
  const style = useLayoutStore((state) => state.style);
  const { phase, propose, proposeWithoutAi, cancel, openKey, openClaude, apply, bodyFor, ai } = useDescribe(mode);
  const start = mode === "start";

  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<DescribeKind>("any");
  const [proposalMode, setProposalMode] = useState<ProposalMode>("append");
  // An imported guide is the user's own style: a proposal does not replace it unless they say so.
  const [withStyle, setWithStyle] = useState(style !== "guide");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [blankOpen, setBlankOpen] = useState(false);

  // The variants stay on «Elige una» while «Proponer otras» runs; new ones open it (state adjusted while rendering).
  const [results, setResults] = useState<Results | null>(null);
  const [view, setView] = useState<View>("describe");
  const [moved, setMoved] = useState(false);
  if (phase.kind === "results" && phase !== results) {
    setResults(phase);
    if (start) {
      setView("choose");
      setMoved(true);
    }
  }
  const go = (next: View) => {
    setView(next);
    setMoved(true);
  };

  const body = useMemo(() => bodyFor(description, kind), [bodyFor, description, kind]);
  const ready = body !== null;
  const proposing = phase.kind === "proposing";
  const costLine = [ai.costLine(body), ai.source === "hosted" ? a.oneUsePropose : ""].filter(Boolean).join(" · ");

  const choose = (proposal: LayoutProposal) => {
    const applied = apply(proposal, { mode: start ? "append" : proposalMode, withStyle, from: start ? results : null });
    if (!applied) return;
    const message = d.applied(proposal.name, applied.screens);
    const detail = applied.adjustments > 0 ? `${message} ${d.appliedAdjusted(applied.adjustments)}` : message;
    const undo = () => {
      if (!actions.undoIfLatest(applied.token)) {
        toast(t.common.undoStale);
        return;
      }
      if (applied.previousStyle !== null) actions.setStyle(applied.previousStyle);
      announce(t.announce.undone);
    };
    announce(detail);
    toast(t.adjusted.toast, { description: detail, action: { label: d.undo, onClick: undo } });
    onApplied?.();
    requestAnimationFrame(() => focusRegion(narrow ? "screens" : "canvas"));
  };

  const statusOf = () => {
    switch (phase.kind) {
      case "proposing":
        return { key: "proposing", text: d.proposing, tone: "muted" as const };
      case "cancelled":
        return { key: "cancelled", text: d.cancelled, tone: "muted" as const };
      case "failed":
        return { key: `failed-${phase.message}`, text: phase.message, tone: "danger" as const };
      case "empty":
        return { key: "empty", text: d.noResults, tone: "danger" as const };
      default:
        return null;
    }
  };
  const current = statusOf();
  const status = (
    <div role="status" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait" initial={false}>
        {current && (
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: reduce ? 0 : 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(0.16)}
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-card border px-3 py-2 text-small",
              current.tone === "danger" ? "border-danger/40 text-danger" : "border-app text-muted",
            )}
          >
            {proposing ? <Spinner className="size-3.5 shrink-0 text-accent" /> : <SparkleIcon className="size-3.5 shrink-0 text-accent" />}
            <span className="min-w-0 flex-1">{current.text}</span>
            {proposing && (
              <Button size="sm" variant="secondary" onClick={cancel}>
                {d.cancel}
              </Button>
            )}
            {phase.kind === "failed" && (
              <>
                {phase.fallback && (
                  <Button size="sm" variant="secondary" onClick={() => openKey(description, kind)}>
                    {d.useKey}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openClaude(description, kind)}>
                  {d.useClaude}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => proposeWithoutAi(description, kind)}>
                  {d.noAi}
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const formProps = {
    description,
    onDescriptionChange: setDescription,
    kind,
    onKindChange: setKind,
    ready,
    proposing,
    costLine,
    onPropose: () => void propose(description, kind),
    onWithoutAi: () => proposeWithoutAi(description, kind),
    onUseKey: () => openKey(description, kind),
    onUseClaude: () => openClaude(description, kind),
  };

  /* ---- The dialog: the form, then the variants under it ---- */
  if (!start) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <DescribeForm variant="inline" {...formProps} proposalMode={proposalMode} onProposalModeChange={setProposalMode} status={status} />
        {phase.kind === "results" && (
          <ChooseVariant
            variant="inline"
            proposals={phase.proposals}
            by={phase.by}
            model={phase.model}
            withStyle={withStyle}
            onWithStyleChange={setWithStyle}
            onApply={choose}
            focusHeading
          />
        )}
      </div>
    );
  }

  /* ---- The empty state: «¿Qué vas a construir?» → «Elige una» ---- */
  const filled = results?.filled ?? null;
  const productLabel = (productType: string) => productChips.find((chip) => chip.id === productType)?.label[locale];
  const detailsSummary =
    filled && designStore ? [doc.brand.name, doc.brand.tagline, productLabel(doc.brief.productType)].filter(Boolean).join(" · ") : null;

  const footer = (onTemplates || onBlank || results) && (
    <div className="flex flex-col items-center gap-2">
      {results && (
        <Button variant="secondary" size="sm" onClick={() => go("choose")}>
          {d.showProposals(results.proposals.length)}
        </Button>
      )}
      <p className="m-0 flex flex-wrap items-center justify-center gap-1 text-small text-muted">
        {onTemplates && (
          <Button variant="ghost" size="sm" onClick={onTemplates}>
            {d.orTemplate}
          </Button>
        )}
        {onTemplates && onBlank && <span aria-hidden>·</span>}
        {onBlank && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={blankOpen}
            aria-controls={blankOpen ? `${id}-blank` : undefined}
            onClick={() => setBlankOpen((open) => !open)}
          >
            {d.startBlank}
          </Button>
        )}
      </p>
      <AnimatePresence initial={false}>
        {blankOpen && onBlank && (
          <motion.div key="blank" initial={{ opacity: 0, y: reduce ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={tween(0.16)}>
            <KindQuestion id={`${id}-blank`} autoFocus onChoose={onBlank} onCancel={() => setBlankOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {view === "choose" && results ? (
          <motion.div key="choose" {...screenMotion(reduce, 1)}>
            <ChooseVariant
              variant="page"
              proposals={results.proposals}
              by={results.by}
              model={results.model}
              withStyle={withStyle}
              onWithStyleChange={setWithStyle}
              onApply={choose}
              status={status}
              onBack={() => go("describe")}
              onProposeAgain={() => void propose(description, kind)}
              proposing={proposing}
              costLine={costLine}
              detailsSummary={detailsSummary}
              onFixDetails={() => {
                setDetailsOpen(true);
                go("describe");
              }}
              focusHeading={moved}
            />
          </motion.div>
        ) : (
          <motion.div key="describe" {...screenMotion(reduce, -1)} className="mx-auto w-full max-w-2xl">
            <DescribeForm
              variant="page"
              {...formProps}
              status={status}
              focusHeading={moved || focusHeading}
              details={
                designStore ? (
                  <DetailsPanel doc={doc} hasPages={docHasDesign(doc)} open={detailsOpen} onOpenChange={setDetailsOpen} inferred={filled !== null} />
                ) : undefined
              }
              footer={footer}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
