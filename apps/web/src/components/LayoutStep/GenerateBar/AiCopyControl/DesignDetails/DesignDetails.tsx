"use client";

import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { AiDirectionChips } from "../AiDirectionChips";
import { AiRenderCost } from "../AiRenderCost";
import { AiScreensPicker } from "../AiScreensPicker";

export type DesignDetailsProps = { plan: AiRenderPlan };

/** «Diseño con IA»: the art direction chips, the screens and the cost line, all before any call. */
export function DesignDetails({ plan }: DesignDetailsProps) {
  const t = useDictionary(aiText).aiRender;
  return (
    <>
      <p className="m-0 text-caption text-muted">{t.designDescription}</p>
      <AiDirectionChips value={plan.chip} onChange={plan.setChip} />
      <AiScreensPicker screens={plan.screens} selected={plan.selected} onToggle={plan.toggleScreen} />
      <AiRenderCost cost={plan.cost} blocked={plan.blocked} empty={plan.selected.length === 0} className="border-t border-app pt-3" />
    </>
  );
}
