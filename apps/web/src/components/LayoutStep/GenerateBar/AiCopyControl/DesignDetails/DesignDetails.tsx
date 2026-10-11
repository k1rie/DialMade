"use client";

import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { useByokKey } from "@/lib/ai/byokKey";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { AiAccessActions } from "../AiAccessActions";
import { AiDirectionChips } from "../AiDirectionChips";
import { AiRenderCost } from "../AiRenderCost";
import { AiScreensPicker } from "../AiScreensPicker";
import { AiTierPicker } from "../AiTierPicker";

export type DesignDetailsProps = {
  plan: AiRenderPlan;
  /** «Usar mi key» (BYOK, with the Opus/Sonnet picker). */
  onUseKey: () => void;
  /** «Usar mi Claude»: the prompt for the picked screens. */
  onUseClaude: () => void;
};

/**
 * «Diseño con IA»: the finish (Maqueta · Presentable · Producto final), the art direction chips and the screens, a status only when the free tier cannot answer, and the
 * two other ways to Claude (spec §5.3, §10.3): the user's key and «Usar mi Claude». When the free tier is closed the
 * key is the primary way out. The cost line lives in the CTA's tooltip.
 */
export function DesignDetails({ plan, onUseKey, onUseClaude }: DesignDetailsProps) {
  const t = useDictionary(aiText).aiRender;
  const byok = useByokKey();
  const empty = plan.selected.length === 0;
  return (
    <>
      <p className="m-0 text-caption text-muted">{t.designDescription}</p>
      <AiTierPicker value={plan.tier} onChange={plan.setTier} needsKey={plan.tierNeedsKey} />
      <AiDirectionChips value={plan.chip} onChange={plan.setChip} />
      <AiScreensPicker screens={plan.screens} selected={plan.selected} onToggle={plan.toggleScreen} />
      <AiRenderCost blocked={plan.blocked} empty={empty} />
      <AiAccessActions hasKey={byok.active} keyFirst={(plan.blocked !== null || plan.tierNeedsKey) && !byok.active} claudeDisabled={empty} onUseKey={onUseKey} onUseClaude={onUseClaude} />
    </>
  );
}
