"use client";

import { NOTE_MAX, type BlockId, type ScreenId } from "@dialmade/layout";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { useLayoutActions } from "../../useLayoutStore";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL, FIELD_META } from "../../fieldStyles";
import { useFieldDraft } from "../../useFieldDraft";

export type NoteFieldProps = {
  blockId: BlockId;
  note: string | undefined;
  screenId: ScreenId;
};

/**
 * «Nota»: one line, ≤200 characters with a live counter. The store sanitizes it (data, never
 * instructions); an empty note removes it. Applies on blur or Enter.
 */
export function NoteField({ blockId, note, screenId }: NoteFieldProps) {
  const t = useDictionary(layout);
  const id = useId();
  const actions = useLayoutActions();
  const field = useFieldDraft(`${screenId}:${blockId}:note`, note ?? "", (text) => {
    actions.updateBlock(blockId, { note: text }, screenId);
  });
  const length = field.value.length;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={FIELD_LABEL}>
          {t.inspector.note}
        </label>
        <span id={`${id}-count`} className={cn("tabular-nums", length >= NOTE_MAX ? "text-caption text-warning" : FIELD_META)}>
          <span aria-hidden>{t.inspector.noteCounter(length, NOTE_MAX)}</span>
          <span className="sr-only">{t.inspector.noteCounterLabel(length, NOTE_MAX)}</span>
        </span>
      </div>
      <input
        id={id}
        type="text"
        value={field.value}
        maxLength={NOTE_MAX}
        placeholder={t.inspector.notePlaceholder}
        autoComplete="off"
        aria-describedby={`${id}-hint ${id}-count`}
        onChange={field.onChange}
        onBlur={field.onBlur}
        onKeyDown={field.onKeyDown}
        className={cn(FIELD_CONTROL, "h-8")}
      />
      <p id={`${id}-hint`} className={FIELD_HINT}>
        {t.inspector.noteHint}
      </p>
    </div>
  );
}
