"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { AiUsageMeter } from "@/components/AiUsageMeter";
import { Popover } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import type { AiGenerateMode } from "@/lib/ai/render/generation";
import { tween } from "@/lib/motion";
import type { AiRenderPlan } from "../useAiRenderPlan";
import { AiCopyTrigger } from "./AiCopyTrigger";
import { CopyDetails } from "./CopyDetails";
import { DesignDetails } from "./DesignDetails";

export type AiCopyControlProps = {
  /** The «IA» state of the bar (GenerateBar owns it: its CTA reads the same plan). */
  plan: AiRenderPlan;
  /** Hover or focus: «Generar» is near (preload the Composer). */
  onIntent?: (() => void) | undefined;
  className?: string;
};

/**
 * The «IA» control next to «Generar» (spec §10.1): a popover with a segmented Sin IA · Textos · Diseño. «Textos» is
 * the one copy request after the deterministic pass (critique #7: its cost, scope, BYOK and «mi Claude»). «Diseño»
 * (only with a preview origin) shows the optional art direction chips, the screens it designs and the cost line
 * («≈ $0.013 · 1 uso de 5 · 3 pantallas · ≈ 30 s»); the CTA then becomes «Generar con IA». Choosing a mode is the
 * consent: nothing is called before «Generar».
 */
export function AiCopyControl({ plan, onIntent, className }: AiCopyControlProps) {
  const t = useDictionary(aiText).aiRender;
  const [open, setOpen] = useState(false);
  const layoutId = useId();
  const modes: AiGenerateMode[] = plan.designAvailable ? ["off", "copy", "design"] : ["off", "copy"];

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label={t.title}
      side="top"
      align="end"
      className="w-80"
      trigger={(props) => <AiCopyTrigger {...props} mode={plan.mode} open={open} onIntent={onIntent} className={className} />}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-small font-semibold text-fg">{t.title}</p>
          <Segmented
            label={t.modesLabel}
            value={plan.mode}
            options={modes.map((mode) => ({ value: mode, label: t.modes[mode] }))}
            onChange={plan.setMode}
            layoutId={`${layoutId}-mode`}
            size="sm"
            accentBar
            className="w-fit"
          />
        </div>
        <AiUsageMeter />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={plan.mode}
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={tween(0.16)}
          >
            {plan.mode === "off" && <p className="m-0 text-caption text-muted">{t.offDescription}</p>}
            {plan.mode === "copy" && <CopyDetails open={open} close={() => setOpen(false)} />}
            {plan.mode === "design" && <DesignDetails plan={plan} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Popover>
  );
}
