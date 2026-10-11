"use client";

import { memo } from "react";
import type { ThemeVars } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { cn } from "@/lib/cn";
import { CheckIcon } from "../../icons";
import { StyleSample } from "../../StyleSample";

export type SampleCardProps = {
  /** What the card applies (a variant id, a palette style id); `null` is «none» (the plain style). */
  value: string | null;
  vars: ThemeVars;
  mode: PreviewMode;
  selected: boolean;
  /** Short visible name. */
  name: string;
  /** Accessible name. */
  description: string;
  onApply: (value: string | null, mode: PreviewMode) => void;
};

/** One option of the theme panel painted with the user's brand (a specimen card and its name). Click or Enter applies. */
export const SampleCard = memo(function SampleCard({ value, vars, mode, selected, name, description, onApply }: SampleCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={description}
      title={name}
      onClick={() => onApply(value, mode)}
      className="flex w-full min-w-0 flex-col gap-1 rounded-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span
        className={cn(
          "relative block aspect-[4/5] w-full overflow-hidden rounded-card border transition-[border-color] duration-150",
          selected ? "glow-purple border-transparent" : "border-app hover:border-app-strong",
        )}
      >
        <StyleSample vars={vars} mode={mode} layout="theme" />
        {selected && (
          <span aria-hidden className="absolute right-1 bottom-1 grid size-4 place-items-center rounded-full bg-accent text-white [&_svg]:size-2.5">
            <CheckIcon strokeWidth={2.2} />
          </span>
        )}
      </span>
      <span aria-hidden className="block truncate text-caption text-muted">
        {name}
      </span>
    </button>
  );
});
