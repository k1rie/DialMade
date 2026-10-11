"use client";

import { AI_CONTEXT_FIELDS } from "@dialmade/doc";
import { useState } from "react";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { useByokKey } from "@/lib/ai/byokKey";
import { fullAccessModelName } from "@/lib/ai/render/fullAccessModel";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { AiAccessActions } from "../AiAccessActions";
import { AiContextBrief } from "../AiContextBrief";
import { AiDirectionChips } from "../AiDirectionChips";
import { AiModelPicker } from "../AiModelPicker";
import { AiRenderCost } from "../AiRenderCost";
import { AiScreensPicker } from "../AiScreensPicker";
import { AiStyleBrief } from "../AiStyleBrief";
import { AiTierPicker } from "../AiTierPicker";
import { ChevronIcon } from "./icons";

export type DesignDetailsProps = {
  plan: AiRenderPlan;
  /** «Usar mi key» (BYOK, with the Opus/Sonnet picker). */
  onUseKey: () => void;
  /** «Usar mi Claude»: the prompt for the picked screens. */
  onUseClaude: () => void;
  /** «Personalizar» starts open (closed by default). */
  defaultOptionsOpen?: boolean;
};

/**
 * «Diseño con IA»: the screens it designs, a status only when the free tier cannot answer, and the two other ways to
 * Claude (spec §5.3, §10.3): the user's key and «Usar mi Claude». Everything optional («Contexto», the art direction
 * chips, «Estilo», the finish and the model) waits in one closed «Personalizar» whose summary says what is set, so the
 * panel stays a few lines long. When the free tier is closed the key is the primary way out. The cost line lives in the
 * CTA's tooltip.
 */
export function DesignDetails({ plan, onUseKey, onUseClaude, defaultOptionsOpen = false }: DesignDetailsProps) {
  const t = useDictionary(aiText).aiRender;
  const byok = useByokKey();
  // A finish the free plan does not make opens the options: its note says why the key comes first.
  const [optionsOpen, setOptionsOpen] = useState(defaultOptionsOpen || plan.tierNeedsKey);
  const empty = plan.selected.length === 0;
  const filled = AI_CONTEXT_FIELDS.filter((field) => (plan.context[field] ?? "").trim() !== "").length;
  const summary = [
    t.tiers.options[plan.tier],
    ...(plan.fullAccess ? [fullAccessModelName(plan.fullAccess.model)] : []),
    t.chips.options[plan.chip],
    ...(filled > 0 ? [t.options.context(filled, AI_CONTEXT_FIELDS.length)] : []),
    ...(plan.style.trim() !== "" || plan.references.length > 0 ? [t.options.style] : []),
  ].join(" · ");
  return (
    <>
      <p className="m-0 text-caption text-muted">{t.designDescription}</p>
      <AiScreensPicker screens={plan.screens} selected={plan.selected} onToggle={plan.toggleScreen} />
      <details className="group flex flex-col" open={optionsOpen} onToggle={(event) => setOptionsOpen(event.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-control border border-app px-2.5 py-1.5 text-caption font-medium text-fg hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
          <span className="shrink-0">
            {t.options.label} <span className="font-normal text-muted">· {t.options.optional}</span>
          </span>
          <span className="min-w-0 flex-1 truncate text-end font-normal text-muted">{summary}</span>
          <ChevronIcon className="size-3 shrink-0 text-muted transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        {/* Mounted only while open: the segmented pills measure themselves on mount, never inside a closed box. */}
        {optionsOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <AiContextBrief context={plan.context} onContextChange={plan.setContext} concept={plan.concept} />
            <AiDirectionChips value={plan.chip} onChange={plan.setChip} />
            <AiStyleBrief style={plan.style} onStyleChange={plan.setStyle} references={plan.references} onReferencesChange={plan.setReferences} />
            <AiTierPicker value={plan.tier} onChange={plan.setTier} needsKey={plan.tierNeedsKey} />
            {plan.fullAccess && <AiModelPicker value={plan.fullAccess.model} onChange={plan.fullAccess.setModel} />}
          </div>
        )}
      </details>
      <AiRenderCost blocked={plan.blocked} empty={empty} />
      <AiAccessActions hasKey={byok.active} keyFirst={(plan.blocked !== null || plan.tierNeedsKey) && !byok.active} claudeDisabled={empty} onUseKey={onUseKey} onUseClaude={onUseClaude} />
    </>
  );
}
