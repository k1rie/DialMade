"use client";

import { newSeed } from "@dialmade/ai-render";
import { useMemo, useState } from "react";
import { AiKeyDialog, type AiKeyDialogView } from "@/components/AiKeyDialog";
import { BYOK_RENDER_MODELS, type ByokRenderModel } from "@/lib/ai/render/byokModel";
import { estimateRender, type CostRange } from "@/lib/ai/render/estimate";
import { fromAccessTransport, requestBrand, screenBlocks } from "@/lib/ai/render/generation";
import { manualDirection, manualRenderJob, manualTransport, type ManualRenderAnswer } from "@/lib/ai/render/manual";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { useLayoutEnv, useLayoutStore } from "../../../useLayoutStore";
import { documentAfterGenerate } from "../documentAfterGenerate";

export type DesignAccessDialogProps = {
  plan: AiRenderPlan;
  /** Which way out is open: the key (with the Opus/Sonnet picker) or «Copiar prompt para mi Claude». */
  view: AiKeyDialogView | null;
  onClose: () => void;
};

/**
 * The two ways out of «Diseño con IA» besides the free tier (spec §5.3, §10.3), for the screens «Generar con IA» will
 * design: «Usar mi key» (the BYOK model picker with the cost of this generate per model) and «Copiar prompt para mi
 * Claude» (the same contract and data as the API paths; the pasted answer runs «Generar» and then the generation
 * through the manual transport, so it passes the same sanitizer and gates).
 */
export function DesignAccessDialog({ plan, view, onClose }: DesignAccessDialogProps) {
  const { doc, generate } = useLayoutEnv();
  const screens = useLayoutStore((state) => state.screens);
  const order = useLayoutStore((state) => state.screenOrder);
  // One seed per mount: the prompt the user copies and the transport that replays the answer share the direction.
  const [seed] = useState(newSeed);
  const open = view !== null;

  const prepared = useMemo(() => {
    if (!open || plan.selected.length === 0) return null;
    const next = documentAfterGenerate(doc, screens, order);
    const inputs = plan.selected.filter((id) => next.screens[id]).map((id) => screenBlocks(next, id));
    if (inputs.length === 0) return null;
    const brand = requestBrand(next);
    const recipeId = next.brief.recipeId;
    // The engine reuses the document's direction for «Automática» or the same chip: the prompt must carry that one.
    const existing = next.aiRender?.direction;
    const reuse = existing !== undefined && (plan.chip === "auto" || plan.chip === existing.chip);
    const direction = reuse ? { axes: existing.axes, moves: existing.moves, rationale: existing.rationale } : manualDirection(seed, recipeId, plan.chip);
    const estimates: Partial<Record<ByokRenderModel, CostRange>> = Object.fromEntries(
      BYOK_RENDER_MODELS.map((model) => [model, estimateRender({ path: "byok", model, brand, screens: inputs, newDirection: !reuse, recipeId, tier: plan.tier })]),
    );
    return { direction, estimates, job: manualRenderJob({ brand, direction, screens: inputs, tier: plan.tier }) };
  }, [open, plan.selected, plan.chip, plan.tier, doc, screens, order, seed]);

  const onManualResult = (answer: ManualRenderAnswer) => {
    if (!prepared) return;
    onClose();
    const outcome = generate({ ai: null });
    if (outcome === "revealing" || outcome === "done") plan.startWith(fromAccessTransport(manualTransport({ direction: prepared.direction, answer, tier: plan.tier })));
  };

  return (
    <AiKeyDialog<ManualRenderAnswer>
      open={open}
      onOpenChange={(next) => !next && onClose()}
      reason={plan.blocked}
      manual={prepared?.job ?? null}
      onManualResult={onManualResult}
      initialView={view ?? "key"}
      renderModels={{ ...(prepared && { estimates: prepared.estimates }) }}
    />
  );
}
