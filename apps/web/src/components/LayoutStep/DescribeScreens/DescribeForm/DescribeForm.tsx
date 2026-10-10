"use client";

import { useEffect, useId, useMemo, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Segmented, type SegmentedOption } from "@/components/ui/Segmented";
import { useDictionary } from "@/i18n";
import { layout, type DescribeKind } from "@/i18n/layout";
import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/lib/ai/layout/constants";
import { cn } from "@/lib/cn";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../../fieldStyles";
import { SparkleIcon } from "../../icons";
import type { ProposalMode } from "../../useLayoutStore";

export type DescribeFormProps = {
  /** `page`: the focused «¿Qué vas a construir?» screen (examples, large field). `inline`: inside the dialog. */
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
  /** «≈ $0,002 · te quedan 4 usos gratis · 1 uso = 3 variantes», shown before calling. */
  costLine: string;
  onPropose: () => void;
  onWithoutAi: () => void;
  onUseKey: () => void;
  onUseClaude: () => void;
  /** The request's state (proposing, failed…), under the actions. */
  status?: ReactNode;
  /** «Detalles», under the field (page only). */
  details?: ReactNode;
  /** «o usa una plantilla» · «empieza vacío» (page only). */
  footer?: ReactNode;
  /** Focus the heading when the screen appears (it replaced another one, or nothing else has focus). */
  focusHeading?: boolean;
  /** Id of the heading (page) so the parent can name its region. */
  titleId?: string;
};

const KINDS: readonly DescribeKind[] = ["any", "app", "landing"];
const MODES: readonly ProposalMode[] = ["append", "replace"];

/**
 * The form of «Describe tu producto»: the description (⌘/Ctrl+Enter proposes), the example chips that fill it (page),
 * which screens, «Proponer con IA» and «Sin IA» with the cost line before calling, and the quieter «Usar mi propia
 * key» and «Copiar prompt para mi Claude». Every control is a button or a field.
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
  details,
  footer,
  focusHeading = false,
  titleId: externalTitleId,
}: DescribeFormProps) {
  const t = useDictionary(layout);
  const d = t.describe;
  const id = useId();
  const titleId = externalTitleId ?? `${id}-title`;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const page = variant === "page";

  useEffect(() => {
    if (!page) return;
    const active = document.activeElement;
    if (focusHeading || !active || active === document.body) headingRef.current?.focus({ preventScroll: true });
  }, [page, focusHeading]);

  const kindOptions = useMemo<SegmentedOption<DescribeKind>[]>(() => KINDS.map((value) => ({ value, label: d.kinds[value] })), [d]);
  const modeOptions = useMemo<SegmentedOption<ProposalMode>[]>(() => MODES.map((value) => ({ value, label: d.modes[value] })), [d]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready && !proposing) onPropose();
  };
  // ⌘/Ctrl+Enter proposes from the text area (Enter alone writes a new line).
  const onTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (ready && !proposing) onPropose();
    }
  };
  const tooShort = description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH;

  return (
    <div className={cn("flex flex-col", page ? "gap-6" : "gap-4")}>
      {page && (
        <header className="flex flex-col items-center gap-2 text-center">
          <h2 ref={headingRef} id={titleId} tabIndex={-1} className="m-0 text-h2 text-balance text-fg outline-none">
            {d.startTitle}
          </h2>
          <p className="m-0 max-w-xl text-body text-pretty text-muted">{d.startSubtitle}</p>
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
            ref={textRef}
            id={`${id}-text`}
            value={description}
            rows={page ? 4 : 3}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder={d.placeholder}
            aria-describedby={`${id}-hint`}
            spellCheck
            onChange={(event) => onDescriptionChange(event.target.value)}
            onKeyDown={onTextKeyDown}
            className={cn(FIELD_CONTROL, "resize-y py-2 leading-relaxed", page ? "min-h-32 px-3.5 py-3 text-body" : "min-h-20")}
          />
          <p id={`${id}-hint`} className={cn(FIELD_HINT, "m-0")}>
            {tooShort ? d.tooShort : d.noAiHint}
          </p>
        </div>

        {page && (
          <div role="group" aria-labelledby={`${id}-examples`} className="flex flex-wrap items-center gap-1.5">
            <span id={`${id}-examples`} className={cn(FIELD_LABEL, "me-1")}>
              {d.examplesLabel}
            </span>
            {d.examples.map((example) => (
              <Chip
                key={example.label}
                size="sm"
                onClick={() => {
                  onDescriptionChange(example.text);
                  textRef.current?.focus({ preventScroll: true });
                }}
              >
                {example.label}
              </Chip>
            ))}
          </div>
        )}

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

        {details}

        <div className={cn("flex flex-col gap-2", page && "items-center pt-1")}>
          <div className={cn("flex flex-wrap items-center gap-2", page && "justify-center")}>
            <Button type="submit" variant="primary" size={page ? "lg" : "md"} leadingIcon={<SparkleIcon />} loading={proposing} disabled={!ready || proposing} aria-describedby={`${id}-cost`}>
              {d.propose}
            </Button>
            <Button type="button" variant="secondary" size={page ? "lg" : "md"} disabled={!ready || proposing} onClick={onWithoutAi}>
              {d.noAi}
            </Button>
          </div>
          <p id={`${id}-cost`} className={cn(FIELD_HINT, "m-0 tabular-nums")} aria-live="polite">
            {costLine}
          </p>
          <div className={cn("flex flex-wrap items-center gap-1", page && "justify-center")}>
            <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={onUseKey}>
              {d.useKey}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!ready || proposing} onClick={onUseClaude}>
              {d.useClaude}
            </Button>
          </div>
        </div>
      </form>

      {status}
      {footer}
    </div>
  );
}
