"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { AI_SESSION_SCREENS } from "@/lib/ai/config";
import { cn } from "@/lib/cn";
import type { AiRenderScreenOption } from "../../useAiRenderPlan";

export type AiScreensPickerProps = {
  screens: readonly AiRenderScreenOption[];
  selected: readonly string[];
  onToggle: (id: string) => void;
};

/**
 * Which screens «Generar con IA» designs (spec §5.2, §10.1): up to 3 per use, by default the first ones without AI.
 * The label counts them («2/3»); once 3 are picked the others wait for the next use. The app's checkboxes (native
 * inputs: Tab and Space, with their labels), one row per screen.
 */
export function AiScreensPicker({ screens, selected, onToggle }: AiScreensPickerProps) {
  const texts = useDictionary(aiText).aiRender;
  const t = texts.screens;
  const tag = texts.block.tag;
  const labelId = useId();
  const full = selected.length >= AI_SESSION_SCREENS;
  return (
    <fieldset aria-labelledby={labelId} className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <p id={labelId} className="m-0 flex items-baseline justify-between text-caption font-medium text-fg">
        {t.label}
        <span className="font-normal text-muted tabular-nums">
          <span aria-hidden>{t.count(selected.length, AI_SESSION_SCREENS)}</span>
          <span className="sr-only">{`, ${t.countLabel(selected.length, AI_SESSION_SCREENS)}`}</span>
        </span>
      </p>
      <ul className="-mx-1 m-0 flex max-h-40 list-none flex-col overflow-y-auto p-0">
        {screens.map((screen) => {
          const checked = selected.includes(screen.id);
          const disabled = screen.blocks === 0 || (!checked && full);
          return (
            <li key={screen.id}>
              <label
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-control px-1.5 text-small transition-colors duration-150",
                  disabled ? "cursor-not-allowed text-muted" : "cursor-pointer text-fg hover:bg-white/[0.04]",
                )}
              >
                <Checkbox checked={checked} disabled={disabled} onChange={() => onToggle(screen.id)} />
                <span className="min-w-0 flex-1 truncate">{screen.name}</span>
                {screen.designed && (
                  <span className="shrink-0 rounded-chip bg-accent-soft px-1.5 text-[11px] leading-[18px] font-medium text-fg">
                    <span aria-hidden>{tag}</span>
                    <span className="sr-only">{t.designed}</span>
                  </span>
                )}
                <span className="shrink-0 text-caption text-muted tabular-nums">{t.blocks(screen.blocks)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
