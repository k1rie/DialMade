"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { useDndAnnounce } from "@/components/dnd/DndAnnouncer";
import { Button, Spinner } from "@/components/ui/Button";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { layout, type DescribeKind } from "@/i18n/layout";
import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/lib/ai/layout/constants";
import type { LayoutProposal } from "@/lib/ai/layout/normalize";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../fieldStyles";
import { SparkleIcon } from "../icons";
import { useLayoutActions, useLayoutEnv, useLayoutStore, type ProposalMode } from "../useLayoutStore";
import { useDescribe } from "./useDescribe";
import { VariantCard } from "./VariantCard";

export type DescribeScreensProps = {
  /** `start`: the empty state (the variant becomes the project). `add`: next to existing screens (add or replace). */
  mode: "start" | "add";
  /** After a variant was applied (the dialog closes). */
  onApplied?: () => void;
  /** Draws its own title (the empty state); a dialog names it instead. */
  showHeader?: boolean;
  /** Id of the title, when the parent names the region with it. */
  titleId?: string;
  className?: string;
};

const KINDS: readonly DescribeKind[] = ["any", "app", "landing"];
const MODES: readonly ProposalMode[] = ["append", "replace"];

/**
 * «Describe tu producto» (Modo Layout v1.1): free text in, 2–3 variants out, each one screens made only of library
 * blocks on the grid, with links, a recommended style and its reason. «Proponer con IA» is ONE request and ONE free
 * use for every variant, with the cost and the free uses left shown before calling; «Sin IA» proposes from keywords
 * and synonyms for free; «Usar mi propia key» and «Copiar prompt para mi Claude» are the other ways. Every variant
 * shows what was adjusted to fit the grid; «Usar esta» applies it as ONE undo step (with its style when the switch is
 * on), then «Ajustado · Deshacer». Every control is a button or a field: nothing to drag.
 */
export function DescribeScreens({ mode, onApplied, showHeader = true, titleId: externalTitleId, className }: DescribeScreensProps) {
  const t = useDictionary(layout);
  const a = useDictionary(aiText).layoutAi;
  const d = t.describe;
  const id = useId();
  const titleId = externalTitleId ?? `${id}-title`;
  const announce = useDndAnnounce({ politeness: "polite" });
  const actions = useLayoutActions();
  const { narrow, focusRegion } = useLayoutEnv();
  const style = useLayoutStore((state) => state.style);
  const { phase, propose, proposeWithoutAi, cancel, openKey, openClaude, apply, bodyFor, ai } = useDescribe(mode);

  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<DescribeKind>("any");
  const [proposalMode, setProposalMode] = useState<ProposalMode>("append");
  // An imported guide is the user's own style: a proposal does not replace it unless they say so.
  const [withStyle, setWithStyle] = useState(style !== "guide");

  const body = useMemo(() => bodyFor(description, kind), [bodyFor, description, kind]);
  const ready = body !== null;
  const proposing = phase.kind === "proposing";
  const cost = ai.costLine(body);
  const costLine = [cost, ai.source === "hosted" ? a.oneUsePropose : ""].filter(Boolean).join(" · ");

  const kindOptions = useMemo<SegmentedOption<DescribeKind>[]>(() => KINDS.map((value) => ({ value, label: d.kinds[value] })), [d]);
  const modeOptions = useMemo<SegmentedOption<ProposalMode>[]>(() => MODES.map((value) => ({ value, label: d.modes[value] })), [d]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready && !proposing) void propose(description, kind);
  };
  // ⌘/Ctrl+Enter proposes from the text area (Enter alone writes a new line).
  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (ready && !proposing) void propose(description, kind);
    }
  };

  const choose = (proposal: LayoutProposal) => {
    const applied = apply(proposal, { mode: mode === "start" ? "append" : proposalMode, withStyle });
    if (!applied) return;
    const message = d.applied(proposal.name, applied.screens);
    const detail = applied.adjustments > 0 ? d.appliedAdjusted(applied.adjustments) : undefined;
    const undo = () => {
      if (!actions.undoIfLatest(applied.token)) {
        toast(t.common.undoStale);
        return;
      }
      if (applied.previousStyle !== null) actions.setStyle(applied.previousStyle);
      announce(t.announce.undone);
    };
    announce(detail ? `${message} ${detail}` : message);
    toast(t.adjusted.toast, { description: detail ? `${message} ${detail}` : message, action: { label: d.undo, onClick: undo } });
    onApplied?.();
    requestAnimationFrame(() => focusRegion(narrow ? "screens" : "canvas"));
  };

  const status = (() => {
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
  })();

  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-4", className)}>
      {showHeader && (
        <header className="flex flex-col gap-1">
          <h3 id={titleId} className="m-0 flex items-center gap-2 text-h3 text-fg [&_svg]:size-4 [&_svg]:text-accent">
            <SparkleIcon />
            {mode === "start" ? d.title : d.titleAdd}
          </h3>
          <p className="m-0 max-w-2xl text-small text-pretty text-muted">{d.subtitle}</p>
        </header>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`${id}-text`} className={FIELD_LABEL}>
              {d.label}
            </label>
            <span aria-hidden className="text-caption text-subtle tabular-nums">
              {d.counter(description.length, MAX_DESCRIPTION_LENGTH)}
            </span>
          </div>
          <textarea
            id={`${id}-text`}
            value={description}
            rows={3}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder={d.placeholder}
            aria-describedby={`${id}-hint`}
            spellCheck
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={onTextKeyDown}
            className={cn(FIELD_CONTROL, "min-h-20 resize-y py-2 leading-relaxed")}
          />
          <p id={`${id}-hint`} className={FIELD_HINT}>
            {description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH ? d.tooShort : d.noAiHint}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>{d.kindLabel}</span>
            <Segmented accentBar size="sm" label={d.kindLabel} layoutId={`${id}-kind`} value={kind} options={kindOptions} onChange={setKind} />
          </div>
          {mode === "add" && (
            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>{d.modeLabel}</span>
              <Segmented accentBar size="sm" label={d.modeLabel} layoutId={`${id}-mode`} value={proposalMode} options={modeOptions} onChange={setProposalMode} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" size="md" leadingIcon={<SparkleIcon />} loading={proposing} disabled={!ready || proposing} aria-describedby={`${id}-cost`}>
            {d.propose}
          </Button>
          <Button type="button" variant="secondary" size="md" disabled={!ready || proposing} onClick={() => proposeWithoutAi(description, kind)}>
            {d.noAi}
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
          <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={() => openKey(description, kind)}>
            {d.useKey}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={() => openClaude(description, kind)}>
            {d.useClaude}
          </Button>
        </div>
        <p id={`${id}-cost`} className={cn(FIELD_HINT, "tabular-nums")} aria-live="polite">
          {costLine}
        </p>
      </form>

      <div role="status" aria-live="polite" aria-atomic="true" className="min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {status && (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={tween(0.16)}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-card border px-3 py-2 text-small",
                status.tone === "danger" ? "border-danger/40 text-danger" : "border-app text-muted",
              )}
            >
              {proposing ? <Spinner className="size-3.5 shrink-0 text-accent" /> : <SparkleIcon className="size-3.5 shrink-0 text-accent" />}
              <span className="min-w-0 flex-1">{status.text}</span>
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

      <AnimatePresence initial={false}>
        {phase.kind === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tween(0.2)}
            role="group"
            aria-labelledby={`${id}-results`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 id={`${id}-results`} className="m-0 text-small font-semibold text-fg">
                  {d.resultsTitle}
                </h4>
                <p className="m-0 text-caption text-muted">
                  {phase.by === "ai" ? d.resultsBy.ai(phase.model) : d.resultsBy[phase.by]} · {d.results(phase.proposals.length)}
                </p>
              </div>
              {phase.proposals.some((proposal) => proposal.recipeId) && (
                <Switch size="sm" checked={withStyle} onCheckedChange={setWithStyle} label={d.applyStyle} />
              )}
            </div>
            <div className={cn("grid gap-3", phase.proposals.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
              {phase.proposals.map((proposal, index) => (
                <VariantCard key={proposal.id} proposal={proposal} index={index} withStyle={withStyle} onApply={choose} autoFocus={index === 0} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
