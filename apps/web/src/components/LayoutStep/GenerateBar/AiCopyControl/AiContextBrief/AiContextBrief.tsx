"use client";

import { AI_CONTEXT_FIELDS, AI_CONTEXT_MAX, type AiContext, type AiContextField } from "@dialmade/doc";
import { useId, useState } from "react";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";

export type AiContextBriefProps = {
  context: AiContext;
  onContextChange: (context: AiContext) => void;
  /** The model's reading of a previous context, so the developer can check what it understood. */
  concept?: string | undefined;
};

const inputClass =
  "rounded-control border border-app-strong bg-white/[0.03] px-2.5 py-1.5 text-small text-fg placeholder:text-muted";

/**
 * «Contexto» of «Diseño con IA»: what the developer knows and Claude does not: who it is for, what it must provoke, the
 * tone, the real facts and what it must not look like. It is asked BEFORE the direction and the screens: more context
 * in is less generic design out. Everything is optional, single line and short; it travels as data.
 */
export function AiContextBrief({ context, onContextChange, concept }: AiContextBriefProps) {
  const t = useDictionary(aiText).aiRender.context;
  const id = useId();
  const filled = AI_CONTEXT_FIELDS.filter((field) => (context[field] ?? "").trim() !== "").length;
  // Folded until there is something to show: the five questions are optional, not the first thing to read.
  const [open, setOpen] = useState(filled > 0);

  const set = (field: AiContextField, value: string) => onContextChange({ ...context, [field]: value });

  return (
    <details className="group flex flex-col gap-1.5" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-caption font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span>
          {t.label} <span className="font-normal text-muted">· {t.optional}</span>
        </span>
        <span className="font-normal text-muted">{t.filled(filled, AI_CONTEXT_FIELDS.length)}</span>
      </summary>
      <div className="mt-1.5 flex flex-col gap-2">
        <p className="m-0 text-caption text-muted">{t.hint}</p>
        {AI_CONTEXT_FIELDS.map((field) => {
          const text = t[field];
          const hint = field === "facts" ? t.facts.hint : undefined;
          const fieldId = `${id}-${field}`;
          return (
            <div key={field} className="flex flex-col gap-1">
              <label htmlFor={fieldId} className="m-0 text-caption text-fg">
                {text.label}
              </label>
              {field === "facts" ? (
                <textarea
                  id={fieldId}
                  value={context[field] ?? ""}
                  maxLength={AI_CONTEXT_MAX[field]}
                  rows={2}
                  placeholder={text.placeholder}
                  aria-describedby={hint ? `${fieldId}-hint` : undefined}
                  onChange={(event) => set(field, event.target.value)}
                  className={`${inputClass} resize-none`}
                />
              ) : (
                <input
                  id={fieldId}
                  type="text"
                  value={context[field] ?? ""}
                  maxLength={AI_CONTEXT_MAX[field]}
                  placeholder={text.placeholder}
                  onChange={(event) => set(field, event.target.value)}
                  className={inputClass}
                />
              )}
              {hint && (
                <p id={`${fieldId}-hint`} className="m-0 text-caption text-muted">
                  {hint}
                </p>
              )}
            </div>
          );
        })}
        {concept && (
          <p className="m-0 rounded-control border border-app px-2.5 py-1.5 text-caption text-muted">
            <span className="font-medium text-fg">{t.understood}: </span>
            {concept}
          </p>
        )}
      </div>
    </details>
  );
}
