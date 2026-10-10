"use client";

import { parseColorWithAlpha } from "@dialmade/palette";
import { motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type ChipEditorKind = "color" | "family" | "px";

export type ChipEditorProps = {
  kind: ChipEditorKind;
  initial: string;
  /** What is edited («Editar radio»…), for the form's name. */
  label: string;
  /** Returns the error message to show, or nothing when saved. */
  onSave: (value: string) => string | undefined;
  onCancel: () => void;
};

/** Inline editor under a chip: Enter saves, Esc cancels, focus goes back to «Editar» (the chip does it). */
export function ChipEditor({ kind, initial, label, onSave, onCancel }: ChipEditorProps) {
  const t = useDictionary(importText).review.chip;
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const preview = kind === "color" ? parseColorWithAlpha(value.trim()) : null;
  const fieldLabel = kind === "color" ? t.colorLabel : kind === "px" ? t.pxLabel : t.familyLabel;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(onSave(value.trim()));
  };

  return (
    <motion.form
      aria-label={label}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tween(0.18)}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-control border border-app-strong bg-black/25 p-2.5"
    >
      <label htmlFor={inputId} className="text-caption text-muted">
        {fieldLabel}
      </label>
      <div className="flex items-center gap-2">
        {kind === "color" && (
          <span
            aria-hidden
            className="size-8 shrink-0 rounded-chip shadow-[inset_0_0_0_1px_oklch(1_0_0/0.12)]"
            style={{ backgroundColor: preview ?? "transparent" }}
          />
        )}
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          inputMode={kind === "px" ? "decimal" : undefined}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
          }}
          className={cn(
            "h-8 min-w-0 flex-1 rounded-control border bg-surface px-2.5 text-small text-fg",
            kind !== "family" && "font-mono",
            error ? "border-danger/60" : "border-app-strong",
          )}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button size="sm" type="submit">
          {t.save}
        </Button>
      </div>
    </motion.form>
  );
}
