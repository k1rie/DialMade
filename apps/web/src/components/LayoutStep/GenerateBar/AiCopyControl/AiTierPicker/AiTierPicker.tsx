"use client";

import { AI_RENDER_TIERS, type AiRenderTier } from "@dialmade/doc";
import { useId } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";

export type AiTierPickerProps = {
  value: AiRenderTier;
  onChange: (tier: AiRenderTier) => void;
  /** The tier needs the user's key or Claude (the free plan only makes the mockup). */
  needsKey: boolean;
};

/**
 * «Maqueta · Presentable · Producto final»: how much care «Generar con IA» asks for, never a model name. The free
 * plan makes the mockup; the other two run with the user's key (and the model chosen there) or «mi Claude».
 */
export function AiTierPicker({ value, onChange, needsKey }: AiTierPickerProps) {
  const t = useDictionary(aiText).aiRender.tiers;
  const layoutId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Segmented
        label={t.label}
        value={value}
        options={AI_RENDER_TIERS.map((tier) => ({ value: tier, label: t.options[tier] }))}
        onChange={onChange}
        layoutId={`${layoutId}-tier`}
        size="sm"
        accentBar
        className="flex w-full [&>button]:flex-auto [&>button]:whitespace-nowrap"
      />
      {/* Only when the finish changes how it runs: the free plan makes the mockup. */}
      <p className="m-0 text-caption text-muted empty:hidden" aria-live="polite">
        {needsKey ? t.needsKey : null}
      </p>
    </div>
  );
}
