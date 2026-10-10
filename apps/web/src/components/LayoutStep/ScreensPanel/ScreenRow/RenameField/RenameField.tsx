"use client";

import { LABEL_MAX } from "@dialmade/layout";
import { useEffect, useRef, type FocusEvent, type KeyboardEvent } from "react";

export type RenameFieldProps = {
  /** Current name (the field starts with it selected). */
  name: string;
  /** Accessible name of the field. */
  label: string;
  /** Enter (`refocus`: give focus back to the row) or blur saves. An empty or unchanged name is ignored by the store. */
  onCommit: (value: string, refocus: boolean) => void;
  /** Esc: nothing changes and focus goes back to the row. */
  onCancel: (refocus: boolean) => void;
};

/** Inline rename of a screen row (double click or F2). Commits once, whatever ends it first. */
export function RenameField({ name, label, onCommit, onCancel }: RenameFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }, []);

  const once = (end: () => void) => {
    if (done.current) return;
    done.current = true;
    end();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const { value } = event.currentTarget;
      once(() => onCommit(value, true));
    } else if (event.key === "Escape") {
      // Esc belongs to the field here (not to the canvas deselect or a popover).
      event.preventDefault();
      event.stopPropagation();
      once(() => onCancel(true));
    }
  };

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    once(() => onCommit(value, false));
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={name}
      maxLength={LABEL_MAX}
      aria-label={label}
      autoComplete="off"
      spellCheck={false}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="h-8 w-full min-w-0 rounded-[8px] border border-app-strong bg-white/[0.03] px-2 text-small text-fg transition-[border-color] duration-150 focus-visible:border-accent"
    />
  );
}
