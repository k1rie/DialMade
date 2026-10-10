"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { layout, type DescribeKind } from "@/i18n/layout";
import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/lib/ai/layout/constants";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../../fieldStyles";
import { ChevronDownIcon, SparkleIcon } from "../../icons";
import type { ProposalMode } from "../../useLayoutStore";
import { PATH_CARD, PATH_GLYPH } from "../constants";
import { DescribeGlyph } from "../icons";

export type DescribeFormProps = {
  /** `page`: the «Descríbelo» path of «¿Qué vas a construir?». `inline`: inside the «Describir» dialog. */
  variant: "page" | "inline";
  description: string;
  onDescriptionChange: (text: string) => void;
  kind: DescribeKind;
  onKindChange: (kind: DescribeKind) => void;
  /** Only next to existing screens (the dialog): add them or replace every screen. */
  proposalMode?: ProposalMode;
  onProposalModeChange?: (mode: ProposalMode) => void;
  ready: boolean;
  proposing: boolean;
  /** Shown before calling: «≈ $0,002 · 4 usos gratis» (page) or the full line (dialog). */
  costLine: string;
  onPropose: () => void;
  onWithoutAi: () => void;
  onUseKey: () => void;
  onUseClaude: () => void;
  /** The request's state (proposing, failed…), under the actions. */
  status?: ReactNode;
  /** «Dibújalo tú», the other way to start, next to this one with the same weight (page only). */
  aside?: ReactNode;
  /** «o usa una plantilla» and the like, under both paths (page only). */
  footer?: ReactNode;
  /** Focus the heading when the screen appears (it replaced another one, or nothing else has focus). */
  focusHeading?: boolean;
};

const KINDS: readonly DescribeKind[] = ["any", "app", "landing"];
const MODES: readonly ProposalMode[] = ["append", "replace"];
/** Tiny example chips while the field is empty. */
const MAX_CHIPS = 3;
/** The placeholder cycles through the examples while the field is empty. */
const PLACEHOLDER_MS = 4000;

/**
 * The form of «Describe tu producto».
 *
 * As the «Descríbelo» path of «¿Qué vas a construir?» it shows little at first (progressive disclosure): the field,
 * whose placeholder cycles through examples (and up to three tiny example chips while it is empty), «Proponer con IA»
 * with «≈ $0,002 · 4 usos gratis» under it, a quiet «Sin IA» (its explanation on hover or focus) and «Opciones»,
 * which unfolds which screens to propose, «Usar mi propia key» and «Copiar prompt para mi Claude».
 *
 * Inside the «Describir» dialog every control shows at once. ⌘/Ctrl+Enter proposes from the field. Every control is a
 * button or a field.
 */
export function DescribeForm({
  variant,
  description,
  onDescriptionChange,
  kind,
  onKindChange,
  proposalMode,
  onProposalModeChange,
  ready,
  proposing,
  costLine,
  onPropose,
  onWithoutAi,
  onUseKey,
  onUseClaude,
  status,
  aside,
  footer,
  focusHeading = false,
}: DescribeFormProps) {
  const t = useDictionary(layout);
  const d = t.describe;
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const page = variant === "page";
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [example, setExample] = useState(0);
  const empty = description.length === 0;

  useEffect(() => {
    if (!page) return;
    const active = document.activeElement;
    if (focusHeading || !active || active === document.body) headingRef.current?.focus({ preventScroll: true });
  }, [page, focusHeading]);

  // A new example in the placeholder every few seconds, only while it can be seen.
  useEffect(() => {
    if (!page || !empty) return;
    const timer = setInterval(() => setExample((n) => (n + 1) % d.examples.length), PLACEHOLDER_MS);
    return () => clearInterval(timer);
  }, [page, empty, d.examples.length]);

  const kindOptions = useMemo<SegmentedOption<DescribeKind>[]>(() => KINDS.map((value) => ({ value, label: d.kinds[value] })), [d]);
  const modeOptions = useMemo<SegmentedOption<ProposalMode>[]>(() => MODES.map((value) => ({ value, label: d.modes[value] })), [d]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready && !proposing) onPropose();
  };
  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (ready && !proposing) onPropose();
    }
  };
  const tooShort = description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH;

  const field = (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={`${id}-text`} className={cn(FIELD_LABEL, page && "sr-only")}>
          {d.label}
        </label>
        {!page && (
          <span aria-hidden className="text-caption text-subtle tabular-nums">
            {d.counter(description.length, MAX_DESCRIPTION_LENGTH)}
          </span>
        )}
      </div>
      <textarea
        ref={textRef}
        id={`${id}-text`}
        value={description}
        rows={page ? 4 : 3}
        maxLength={MAX_DESCRIPTION_LENGTH}
        placeholder={page ? d.examples[example % d.examples.length]!.text : d.placeholder}
        aria-describedby={tooShort || !page ? `${id}-hint` : undefined}
        spellCheck
        onChange={(event) => onDescriptionChange(event.target.value)}
        onKeyDown={onTextKeyDown}
        className={cn(FIELD_CONTROL, "resize-y py-2 leading-relaxed", page ? "min-h-28 px-3.5 py-3 text-body" : "min-h-20")}
      />
      {(tooShort || !page) && (
        <p id={`${id}-hint`} className={cn(FIELD_HINT, "m-0")}>
          {tooShort ? d.tooShort : d.noAiHint}
        </p>
      )}
    </div>
  );

  const quietActions = (
    <>
      <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={onUseKey}>
        {d.useKey}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={onUseClaude}>
        {d.useClaude}
      </Button>
    </>
  );

  /* ---- The dialog: everything at once ---- */
  if (!page) {
    return (
      <div className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {field}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL}>{d.kindLabel}</span>
              <Segmented accentBar size="sm" label={d.kindLabel} layoutId={`${id}-kind`} value={kind} options={kindOptions} onChange={onKindChange} />
            </div>
            {proposalMode && onProposalModeChange && (
              <div className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL}>{d.modeLabel}</span>
                <Segmented accentBar size="sm" label={d.modeLabel} layoutId={`${id}-mode`} value={proposalMode} options={modeOptions} onChange={onProposalModeChange} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" size="md" leadingIcon={<SparkleIcon />} loading={proposing} disabled={!ready || proposing} aria-describedby={`${id}-cost`}>
              {d.propose}
            </Button>
            <Button type="button" variant="secondary" size="md" disabled={!ready || proposing} onClick={onWithoutAi}>
              {d.noAi}
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
            {quietActions}
          </div>
          <p id={`${id}-cost`} className={cn(FIELD_HINT, "m-0 tabular-nums")} aria-live="polite">
            {costLine}
          </p>
        </form>
        {status}
      </div>
    );
  }

  /* ---- «¿Qué vas a construir?»: two paths of the same weight, little at first ---- */
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h2 ref={headingRef} tabIndex={-1} className="m-0 text-h2 text-balance text-fg outline-none">
          {d.startTitle}
        </h2>
        <p className="m-0 max-w-xl text-body text-pretty text-muted">{d.startSubtitle}</p>
      </header>

      <div className="grid items-stretch gap-4 md:grid-cols-2">
        <section aria-labelledby={`${id}-path`} className={PATH_CARD}>
          <div className="flex items-start gap-3">
            <span aria-hidden className={PATH_GLYPH}>
              <DescribeGlyph />
            </span>
            <div className="min-w-0">
              <h3 id={`${id}-path`} className="m-0 text-h3 text-fg">
                {d.describePath.title}
              </h3>
              <p className="m-0 mt-0.5 text-small text-pretty text-muted">{d.describePath.hint}</p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-1 flex-col gap-3" noValidate>
            {field}
            {empty && (
              <div role="group" aria-label={d.examplesLabel} className="-mt-1 flex flex-wrap gap-1">
                {d.examples.slice(0, MAX_CHIPS).map((item) => (
                  <Chip
                    key={item.label}
                    size="sm"
                    onClick={() => {
                      onDescriptionChange(item.text);
                      textRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-1.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" size="md" leadingIcon={<SparkleIcon />} loading={proposing} disabled={!ready || proposing} aria-describedby={`${id}-cost`}>
                  {d.propose}
                </Button>
                <Tooltip content={d.noAiHint}>
                  <Button type="button" variant="ghost" size="md" disabled={!ready || proposing} onClick={onWithoutAi}>
                    {d.noAi}
                  </Button>
                </Tooltip>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ms-auto"
                  aria-expanded={optionsOpen}
                  aria-controls={`${id}-options`}
                  aria-label={d.optionsLabel}
                  trailingIcon={<ChevronDownIcon className={cn("transition-transform duration-200", optionsOpen && "rotate-180")} />}
                  onClick={() => setOptionsOpen((open) => !open)}
                >
                  {d.options}
                </Button>
              </div>
              <p id={`${id}-cost`} className={cn(FIELD_HINT, "m-0 tabular-nums")} aria-live="polite">
                {costLine}
              </p>
            </div>

            <AnimatePresence initial={false}>
              {optionsOpen && (
                <motion.div
                  key="options"
                  id={`${id}-options`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={tween(0.18)}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 border-t border-app pt-3">
                    <div className="flex flex-col gap-1.5">
                      <span className={FIELD_LABEL}>{d.kindLabel}</span>
                      <Segmented accentBar size="sm" label={d.kindLabel} layoutId={`${id}-kind`} value={kind} options={kindOptions} onChange={onKindChange} />
                    </div>
                    <div className="-ms-2 flex flex-wrap items-center gap-1">{quietActions}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
          {status}
        </section>

        {aside}
      </div>

      {footer}
    </div>
  );
}
