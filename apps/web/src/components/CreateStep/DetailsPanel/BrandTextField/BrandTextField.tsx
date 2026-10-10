"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type BrandTextFieldProps = {
  label: string;
  /** Value stored in the doc (already trimmed). */
  value: string;
  placeholder?: string;
  maxLength: number;
  /** A blank draft is never sent and the stored value comes back on blur. */
  required?: boolean;
  /** Live edit on every keystroke (the doc trims it). */
  onChange: (text: string) => void;
  /** Focus/blur: the parent groups the keystrokes into one undo step. */
  onEditStart?: () => void;
  onEditEnd?: () => void;
  className?: string;
};

/**
 * Text field bound to the DesignDoc through a local draft: the doc trims and rejects blank names,
 * so typing «Acme Labs» or clearing the field must not fight the stored value while focused.
 */
export function BrandTextField({
  label,
  value,
  placeholder,
  maxLength,
  required = false,
  onChange,
  onEditStart,
  onEditEnd,
  className,
}: BrandTextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [stored, setStored] = useState(value);
  if (stored !== value) {
    setStored(value);
    if (!focused) setDraft(value);
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-caption text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        onFocus={() => {
          setFocused(true);
          onEditStart?.();
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (!required || next.trim()) onChange(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(value);
          onEditEnd?.();
        }}
        className={cn(
          "h-10 w-full min-w-0 rounded-control border border-app-strong bg-app/60 px-3 text-body text-fg placeholder:text-subtle",
          "transition-[border-color,background-color] duration-150 hover:border-white/20 focus-visible:border-accent/70 focus-visible:bg-app/80",
        )}
      />
    </div>
  );
}
