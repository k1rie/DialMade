"use client";

import { useId } from "react";
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
 * With more screens it says so before calling («6 pantallas = 2 usos»): the user picks 3 now and the rest later.
 * Native checkboxes: Tab and Space, with their labels.
 */
export function AiScreensPicker({ screens, selected, onToggle }: AiScreensPickerProps) {
  const t = useDictionary(aiText).aiRender.screens;
  const labelId = useId();
  const full = selected.length >= AI_SESSION_SCREENS;
  const withBlocks = screens.filter((screen) => screen.blocks > 0).length;
  const uses = Math.ceil(withBlocks / AI_SESSION_SCREENS);
  return (
    <fieldset aria-labelledby={labelId} className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <p id={labelId} className="m-0 text-caption font-medium text-fg">
        {t.label} <span className="font-normal text-muted">· {t.hint(AI_SESSION_SCREENS)}</span>
      </p>
      <ul className="m-0 flex max-h-40 list-none flex-col gap-0.5 overflow-y-auto p-0">
        {screens.map((screen) => {
          const checked = selected.includes(screen.id);
          const disabled = screen.blocks === 0 || (!checked && full);
          return (
            <li key={screen.id}>
              <label
                className={cn(
                  "flex items-center gap-2 rounded-control px-2 py-1 text-small",
                  disabled ? "cursor-not-allowed text-muted" : "cursor-pointer text-fg hover:bg-white/[0.04]",
                )}
              >
                <input type="checkbox" className="size-3.5 accent-[var(--app-accent)]" checked={checked} disabled={disabled} onChange={() => onToggle(screen.id)} />
                <span className="min-w-0 flex-1 truncate">{screen.name}</span>
                <span className="shrink-0 text-caption text-muted tabular-nums">
                  {t.blocks(screen.blocks)}
                  {screen.designed && ` · ${t.designed}`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {uses > 1 && <p className="m-0 text-caption text-muted">{t.more(withBlocks, uses, AI_SESSION_SCREENS)}</p>}
    </fieldset>
  );
}
