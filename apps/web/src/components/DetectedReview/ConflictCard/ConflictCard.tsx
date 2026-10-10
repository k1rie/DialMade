"use client";

import type { LogoChoice, LogoConflict } from "@dialmade/import";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { importText } from "@/i18n/import";
import { cn } from "@/lib/cn";
import { CheckIcon } from "../icons";
import { hexLabel, roleLabel } from "../labels";

export type ConflictCardProps = {
  conflict: LogoConflict;
  choice: LogoChoice;
  onChoose: (choice: LogoChoice) => void;
};

/** Logo vs guide (ΔEok > 0.06): «Usar la guía» (default) · «Usar el logo» · «Primario de la guía + secundario del logo». */
export function ConflictCard({ conflict, choice, onChoose }: ConflictCardProps) {
  const t = useDictionary(importText).review;
  const name = useId();
  const titleId = useId();
  const role = roleLabel(conflict.role, t);

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2.5 rounded-card border border-warning/30 bg-warning/[0.06] p-3">
      <div className="flex items-center gap-3">
        <div aria-hidden className="flex shrink-0 -space-x-1.5">
          <span className="size-7 rounded-chip border-2 border-[var(--app-bg-elevated)]" style={{ backgroundColor: conflict.logo }} />
          <span className="size-7 rounded-chip border-2 border-[var(--app-bg-elevated)]" style={{ backgroundColor: conflict.guide }} />
        </div>
        <div className="min-w-0">
          <p id={titleId} className="text-small font-medium text-fg">
            {t.conflicts.title(role)}
          </p>
          <p className="font-mono text-caption text-muted">
            {t.conflicts.logo} {hexLabel(conflict.logo)} · {t.conflicts.guide} {hexLabel(conflict.guide)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {conflict.choices.map((option) => {
          const checked = option === choice;
          return (
            <label
              key={option}
              className={cn(
                "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-chip border px-2.5 py-1 text-small transition-[background-color,border-color,color] duration-150",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                checked ? "glow-purple border-transparent bg-accent-soft text-fg" : "border-app bg-white/[0.03] text-muted hover:border-app-strong hover:text-fg",
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={checked} onChange={() => onChoose(option)} />
              {checked && <CheckIcon aria-hidden className="size-3.5 shrink-0 text-accent" />}
              {t.conflicts.choices[option] ?? option}
            </label>
          );
        })}
      </div>
    </div>
  );
}
