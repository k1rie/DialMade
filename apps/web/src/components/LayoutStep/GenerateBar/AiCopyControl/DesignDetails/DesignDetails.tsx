"use client";

import { Button } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { useByokKey } from "@/lib/ai/byokKey";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { AiDirectionChips } from "../AiDirectionChips";
import { AiRenderCost } from "../AiRenderCost";
import { AiScreensPicker } from "../AiScreensPicker";

export type DesignDetailsProps = {
  plan: AiRenderPlan;
  /** «Usar mi key» (BYOK, with the Opus/Sonnet picker). */
  onUseKey: () => void;
  /** «Copiar prompt para mi Claude» for the picked screens. */
  onUseClaude: () => void;
};

/**
 * «Diseño con IA»: the art direction chips, the screens and the cost line, all before any call, and the two other
 * ways to Claude (spec §5.3, §10.3): the user's key and «Copiar prompt para mi Claude». When the free tier is closed
 * they are the primary way out.
 */
export function DesignDetails({ plan, onUseKey, onUseClaude }: DesignDetailsProps) {
  const texts = useDictionary(aiText);
  const t = texts.aiRender;
  const byok = useByokKey();
  const empty = plan.selected.length === 0;
  return (
    <>
      <p className="m-0 text-caption text-muted">{t.designDescription}</p>
      <AiDirectionChips value={plan.chip} onChange={plan.setChip} />
      <AiScreensPicker screens={plan.screens} selected={plan.selected} onToggle={plan.toggleScreen} />
      <AiRenderCost cost={plan.cost} blocked={plan.blocked} empty={empty} className="border-t border-app pt-3" />
      <div className="flex flex-col items-start gap-1.5 border-t border-app pt-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={plan.blocked && !byok.active ? "primary" : "secondary"} onClick={onUseKey}>
            {byok.active ? t.access.manageKey : t.access.useKey}
          </Button>
          <Button size="sm" variant="secondary" disabled={empty} onClick={onUseClaude}>
            {t.access.useClaude}
          </Button>
        </div>
        <p className="m-0 text-caption text-muted">{empty ? t.access.noScreens : t.access.claudeHint}</p>
      </div>
    </>
  );
}
