"use client";

import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { cn } from "@/lib/cn";
import type { RenderCostFacts } from "../../useAiRenderPlan";

export type AiRenderCostProps = {
  cost: RenderCostFacts | null;
  blocked: AiFallbackReason | null;
  /** No screen picked. */
  empty?: boolean;
  id?: string;
  className?: string;
};

/**
 * The cost line of «Generar con IA», BEFORE any call (spec §5.5, §10.1): «≈ $0.013 · 1 uso de 5 · 3 pantallas · ≈
 * 30 s», and what one use includes (the design session). When the free tier cannot answer, why.
 */
export function AiRenderCost({ cost, blocked, empty = false, id, className }: AiRenderCostProps) {
  const texts = useDictionary(aiText);
  const t = texts.aiRender;
  let line: string | null = null;
  if (empty) line = t.screens.none;
  else if (blocked) line = texts.layoutCopy.blocked[blocked];
  else if (cost?.byok) line = t.cost.withKey(cost.cost, cost.screens, cost.seconds);
  else if (cost) line = t.cost.line(cost.cost, cost.left, cost.total, cost.screens, cost.seconds);
  return (
    <div id={id} className={cn("flex flex-col gap-1", className)}>
      {line && <p className={cn("m-0 font-mono text-caption tabular-nums", blocked || empty ? "text-fg" : "text-muted")}>{line}</p>}
      {!blocked && !empty && !cost?.byok && <p className="m-0 text-caption text-muted">{t.cost.session}</p>}
    </div>
  );
}
