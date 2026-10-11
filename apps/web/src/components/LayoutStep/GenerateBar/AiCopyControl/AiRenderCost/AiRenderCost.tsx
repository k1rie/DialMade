"use client";

import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import type { AiFallbackReason } from "@/lib/ai/policy";
import { cn } from "@/lib/cn";

export type AiRenderCostProps = {
  blocked: AiFallbackReason | null;
  /** No screen picked. */
  empty?: boolean;
  id?: string;
  className?: string;
};

/**
 * What stops «Generar con IA» before any call (spec §5.5, §10.1): no screen picked, or why the free tier cannot answer.
 * Nothing otherwise: the cost line («≈ $0.013 · 1 uso de 5 · 3 pantallas · ≈ 30 s») is the CTA's tooltip.
 */
export function AiRenderCost({ blocked, empty = false, id, className }: AiRenderCostProps) {
  const texts = useDictionary(aiText);
  const line = empty ? texts.aiRender.screens.none : blocked ? texts.layoutCopy.blocked[blocked] : null;
  if (!line) return null;
  return (
    <p id={id} role="status" className={cn("m-0 text-caption text-fg", className)}>
      {line}
    </p>
  );
}
