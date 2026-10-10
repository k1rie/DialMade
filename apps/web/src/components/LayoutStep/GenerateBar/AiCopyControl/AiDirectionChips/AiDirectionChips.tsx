"use client";

import { AI_DIRECTION_CHIPS, type AiDirectionChip } from "@dialmade/doc";
import { useId, useRef, type KeyboardEvent } from "react";
import { Chip } from "@/components/ui/Chip";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";

export type AiDirectionChipsProps = {
  value: AiDirectionChip;
  onChange: (chip: AiDirectionChip) => void;
};

/**
 * «Dirección de arte» (spec §4.2, user decision 4): optional chips that fix 2–3 axes of the art direction before the
 * seeded draw; «Automática» (default) leaves every axis to the brand and the seed. One choice: a radio group with
 * arrow keys (roving tabindex), Home and End.
 */
export function AiDirectionChips({ value, onChange }: AiDirectionChipsProps) {
  const t = useDictionary(aiText).aiRender.chips;
  const labelId = useId();
  const hintId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const current = AI_DIRECTION_CHIPS.indexOf(value);
    let next: number | undefined;
    if (keys[event.key] !== undefined) next = (current + keys[event.key]! + AI_DIRECTION_CHIPS.length) % AI_DIRECTION_CHIPS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = AI_DIRECTION_CHIPS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    onChange(AI_DIRECTION_CHIPS[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="m-0 text-caption font-medium text-fg">
        {t.label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hintId} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
        {AI_DIRECTION_CHIPS.map((chip, index) => {
          const checked = chip === value;
          return (
            <Chip
              key={chip}
              ref={(element) => {
                refs.current[index] = element;
              }}
              size="sm"
              role="radio"
              selected={checked}
              aria-pressed={undefined}
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(chip)}
            >
              {t.options[chip]}
            </Chip>
          );
        })}
      </div>
      <p id={hintId} className="m-0 text-caption text-muted">
        {t.hint}
      </p>
    </div>
  );
}
