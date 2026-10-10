"use client";

import type { ImportedFont } from "@dialmade/import";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { CheckIcon } from "../../icons";

export type FontMatchPickerProps = {
  font: ImportedFont;
  /** The family the import will write (an edit, or the declared one). */
  value: string;
  /** `null` keeps the declared family. */
  onPick: (family: string | null) => void;
  disabled?: boolean;
};

/** Free families offered for a font (metric-compatible, style alternatives or fuzzy candidates). */
export function fontAlternatives(font: ImportedFont): string[] {
  const { match } = font;
  const own = font.family.toLowerCase();
  const pool = [match.kind === "metric-compatible" || match.kind === "style-alt" ? match.family : undefined, ...(match.candidates ?? [])];
  return [...new Set(pool.filter((family): family is string => !!family && family.toLowerCase() !== own))].slice(0, 3);
}

/** For a font without a Google Fonts match: keep it or pick one of up to three free alternatives (radio group). */
export function FontMatchPicker({ font, value, onPick, disabled = false }: FontMatchPickerProps) {
  const t = useDictionary(importText).review.picker;
  const name = useId();
  const hintId = useId();
  const options = [{ family: font.family, keep: true }, ...fontAlternatives(font).map((family) => ({ family, keep: false }))];

  return (
    <fieldset className="flex flex-col gap-1.5 rounded-control border border-app bg-black/20 p-2.5" aria-describedby={hintId} disabled={disabled}>
      <legend className="sr-only">{t.label(font.family)}</legend>
      <p id={hintId} className="text-caption text-muted">
        {t.hint}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const checked = option.keep ? value === font.family : value === option.family;
          return (
            <label
              key={option.family}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-chip border px-2.5 text-small transition-[background-color,border-color,color] duration-150",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                checked ? "glow-purple border-transparent bg-accent-soft text-fg" : "border-app bg-white/[0.03] text-muted hover:border-app-strong hover:text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onPick(option.keep ? null : option.family)}
              />
              {checked && <CheckIcon aria-hidden className="size-3.5 shrink-0 text-accent" />}
              <span style={{ fontFamily: `"${option.family}", var(--font-sans)` }}>{option.keep ? t.keep(option.family) : t.use(option.family)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
