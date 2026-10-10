"use client";

// The model of «Diseño con IA» with the user's key (spec §14, decision 3): Opus 5.5 by default, Sonnet 5.5 offered
// as the cheaper one. Native radios: arrows move between them, Space picks (keyboard alternative for free). The
// choice applies at once and lives only in this tab (@/lib/ai/render/byokModel).
import { useId } from "react";
import { useDictionary, useI18n } from "@/i18n";
import { ai } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import { BYOK_RENDER_MODELS, CHEAPER_BYOK_RENDER_MODEL, setByokRenderModel, useByokRenderModel, type ByokRenderModel } from "@/lib/ai/render/byokModel";
import { formatRange } from "@/lib/ai/render/costLine";
import type { CostRange } from "@/lib/ai/render/estimate";

export type ByokModelPickerProps = {
  /** Cost of the pending generate per model, when the caller knows it («≈ $0.55–0.75 por 3 pantallas»). */
  estimates?: Partial<Record<ByokRenderModel, CostRange>>;
  className?: string;
};

export function ByokModelPicker({ estimates, className }: ByokModelPickerProps) {
  const t = useDictionary(ai).aiAccess.models;
  const { locale } = useI18n();
  const model = useByokRenderModel();
  const name = useId();
  const noteId = useId();

  return (
    <fieldset aria-describedby={noteId} className={cn("m-0 flex min-w-0 flex-col gap-2 border-0 p-0", className)}>
      <legend className="mb-1.5 p-0 text-small font-medium text-fg">{t.legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {BYOK_RENDER_MODELS.map((id) => {
          const estimate = estimates?.[id];
          const checked = model === id;
          return (
            <label
              key={id}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-control border px-3 py-2.5 transition-colors duration-150",
                checked ? "border-accent bg-accent-soft" : "border-app hover:border-app-strong",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              )}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={checked}
                onChange={() => setByokRenderModel(id)}
                className="mt-1 size-4 shrink-0 accent-accent"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-small font-medium text-fg">{t[id].name}</span>
                <span className="text-caption text-muted">{t[id].hint}</span>
                {estimate && <span className="font-mono text-caption text-subtle tabular-nums">{t.perSession(formatRange(estimate, locale))}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <p id={noteId} className="m-0 text-caption text-muted">
        {model === CHEAPER_BYOK_RENDER_MODEL ? t.note : `${t.cheaper} · ${t.note}`}
      </p>
    </fieldset>
  );
}
