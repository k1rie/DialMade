"use client";

import { parseColor } from "@dialmade/palette";
import { useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { formatHex } from "../../format";

export type HexInputProps = {
  /** `#rrggbb`; undefined shows the placeholder. */
  value?: string;
  /** Called with `#rrggbb` when a valid color is typed (live) or committed (Enter/blur). Accepts any CSS color. */
  onCommit: (hex: string) => void;
  label: string;
  /** Message announced when the typed value is not a color. */
  invalidLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "md";
  className?: string;
};

const BARE_HEX = /^[0-9a-f]{3}([0-9a-f]{3})?$/i;
const FULL_HEX = /^#?[0-9a-f]{6}$/i;

/** «ff5a36», «#f53», «rgb(…)», «oklch(…)» → `#rrggbb`, or null. */
function toHex(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return parseColor(BARE_HEX.test(trimmed) ? `#${trimmed}` : trimmed);
}

/**
 * Monospace hex field: shows `#RRGGBB`, applies full 6-digit hex live while typing, and any CSS color
 * on Enter or blur. Invalid input stays visible with an error until fixed; Esc reverts.
 */
export function HexInput({ value, onCommit, label, invalidLabel, placeholder, autoFocus, size = "md", className }: HexInputProps) {
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value ? formatHex(value).slice(1) : "";
  const text = draft ?? shown;
  const invalid = draft !== null && draft.trim() !== "" && toHex(draft) === null;

  const commit = () => {
    if (draft === null) return;
    const hex = toHex(draft);
    if (hex && hex !== value) onCommit(hex);
    setDraft(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape" && draft !== null) {
      setDraft(null);
    }
  };

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-0.5 rounded-control border bg-white/[0.04] transition-[border-color] duration-150",
        size === "sm" ? "h-8 px-2" : "h-9 px-2.5",
        invalid ? "border-danger" : "border-app-strong has-[input:focus-visible]:border-accent has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-accent",
        className,
      )}
    >
      <span aria-hidden className="font-mono text-mono text-subtle">
        #
      </span>
      <input
        type="text"
        inputMode="text"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="characters"
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        data-autofocus={autoFocus || undefined}
        maxLength={48}
        placeholder={placeholder}
        value={text}
        onFocus={(event) => {
          setDraft(shown);
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value.replace(/^#/, "");
          setDraft(next);
          if (FULL_HEX.test(next)) {
            const hex = toHex(next);
            if (hex && hex !== value) onCommit(hex);
          }
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-full min-w-0 bg-transparent font-mono text-mono text-fg uppercase outline-none placeholder:text-subtle placeholder:normal-case focus-visible:shadow-none focus-visible:outline-none"
      />
      {invalid && (
        <span id={errorId} role="alert" className="sr-only">
          {invalidLabel}
        </span>
      )}
    </div>
  );
}
