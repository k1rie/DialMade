"use client";

import { useId } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { FULL_ACCESS_RENDER_MODELS, fullAccessModelName, type FullAccessRenderModel } from "@/lib/ai/render/fullAccessModel";

export type AiModelPickerProps = {
  value: FullAccessRenderModel;
  onChange: (model: FullAccessRenderModel) => void;
};

/** «Acceso completo» only: the model of «Generar con IA» on the server's key (Haiku · Sonnet · Opus), next to the finish. */
export function AiModelPicker({ value, onChange }: AiModelPickerProps) {
  const t = useDictionary(aiText).aiRender.models;
  const layoutId = useId();
  return (
    <Segmented
      label={t.label}
      value={value}
      options={FULL_ACCESS_RENDER_MODELS.map((model) => ({ value: model, label: fullAccessModelName(model) }))}
      onChange={onChange}
      layoutId={`${layoutId}-model`}
      size="sm"
      accentBar
      className="flex w-full [&>button]:flex-1 [&>button]:whitespace-nowrap"
    />
  );
}
