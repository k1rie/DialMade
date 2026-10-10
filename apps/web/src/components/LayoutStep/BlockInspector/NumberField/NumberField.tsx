"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL, FIELD_META, NUMBER_CONTROL } from "../../fieldStyles";
import { useFieldDraft, type DraftCommit } from "../../useFieldDraft";

export type NumberFieldProps = {
  /** What is edited (block id + field): a pending edit is committed to it even if the selection changes. */
  draftKey: string;
  label: string;
  value: number;
  min: number;
  /** `null`: no upper limit. */
  max: number | null;
  step: number;
  /** Unit shown inside the field («px», «col.»). Decorative: the hint says it to screen readers. */
  unit?: string;
  /** Visible hint under the field (range, unit). */
  hint?: string;
  /** Id of a hint shared with other fields. */
  describedBy?: string;
  disabled?: boolean;
  /** Applies what the user typed (on blur or Enter); `false` keeps the text. */
  onCommit: DraftCommit;
  /** Controls on each side of the input (the −/+ of «Cantidad»). */
  before?: ReactNode;
  after?: ReactNode;
  className?: string;
};

/** A numeric inspector field (spinbutton) that writes on blur or Enter and restores the value with Esc. */
export function NumberField({
  draftKey,
  label,
  value,
  min,
  max,
  step,
  unit,
  hint,
  describedBy,
  disabled,
  onCommit,
  before,
  after,
  className,
}: NumberFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const field = useFieldDraft(draftKey, String(value), onCommit);
  const described = [hint ? hintId : null, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        {before}
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max ?? undefined}
            step={step}
            value={field.value}
            disabled={disabled}
            aria-describedby={described}
            autoComplete="off"
            onChange={field.onChange}
            onBlur={field.onBlur}
            onKeyDown={field.onKeyDown}
            className={cn(FIELD_CONTROL, NUMBER_CONTROL, "h-8 tabular-nums", unit && "pe-9")}
          />
          {unit && (
            <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 end-2.5 flex items-center", FIELD_META)}>
              {unit}
            </span>
          )}
        </div>
        {after}
      </div>
      {hint && (
        <p id={hintId} className={FIELD_HINT}>
          {hint}
        </p>
      )}
    </div>
  );
}
