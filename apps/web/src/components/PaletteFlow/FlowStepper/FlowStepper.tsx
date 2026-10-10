"use client";

import { motion } from "motion/react";
import { useDictionary, useI18n } from "@/i18n";
import { flow } from "@/i18n/flow";
import { cn } from "@/lib/cn";
import { smooth } from "@/lib/motion";

export const FLOW_STEPS = ["brand", "create", "compose", "export"] as const;
export type FlowStepperStep = (typeof FLOW_STEPS)[number];

export type FlowStepperProps = {
  current: FlowStepperStep;
  /** Steps that can be opened right now (the current one included). */
  available: Readonly<Record<FlowStepperStep, boolean>>;
  onSelect: (step: FlowStepperStep) => void;
  className?: string;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden className="size-3">
      <path d="M2.5 6.25 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** «1 Marca · 2 Crear · 3 Ajustar · 4 Exportar». Completed steps can be reopened; locked ones are disabled. */
export function FlowStepper({ current, available, onSelect, className }: FlowStepperProps) {
  const { t } = useI18n();
  const f = useDictionary(flow);
  const currentIndex = FLOW_STEPS.indexOf(current);
  const labels: Record<FlowStepperStep, string> = {
    brand: f.stepper.brand,
    create: f.stepper.create,
    compose: f.stepper.compose,
    export: f.stepper.export,
  };

  return (
    <nav aria-label={f.stepper.label} className={cn("glass mx-auto w-fit max-w-full rounded-card border border-app p-1 shadow-surface", className)}>
      <ol className="flex items-center">
        {FLOW_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isDone = index < currentIndex;
          const enabled = isCurrent || available[step];
          return (
            <li key={step} className="flex items-center">
              {index > 0 && <span aria-hidden className={cn("mx-0.5 h-px w-2.5 sm:w-4", isDone || isCurrent ? "bg-accent/50" : "bg-white/10")} />}
              <button
                type="button"
                disabled={!enabled}
                aria-current={isCurrent ? "step" : undefined}
                title={enabled ? undefined : f.stepper.locked}
                onClick={() => !isCurrent && onSelect(step)}
                className={cn(
                  "group relative flex h-8 items-center gap-2 rounded-control px-2 text-small transition-colors duration-150 sm:px-2.5",
                  isCurrent ? "text-fg" : "text-muted enabled:hover:text-fg",
                  "disabled:cursor-not-allowed disabled:text-subtle",
                )}
              >
                {isCurrent && (
                  <motion.span
                    layoutId="flow-stepper-current"
                    transition={smooth}
                    aria-hidden
                    className="absolute inset-0 rounded-control border border-app bg-white/[0.07] shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)]"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-5 shrink-0 items-center justify-center rounded-[6px] font-mono text-[11px] leading-none font-medium transition-colors duration-150",
                    isCurrent && "bg-accent-cta text-white",
                    isDone && "bg-accent-soft text-accent",
                    !isCurrent && !isDone && "border border-app-strong",
                  )}
                >
                  {isDone ? <CheckIcon /> : index + 1}
                </span>
                <span className={cn("relative font-medium", !isCurrent && "max-sm:sr-only")}>{labels[step]}</span>
                <span className="sr-only">
                  {`, ${f.stepper.position(index + 1, FLOW_STEPS.length)}`}
                  {isDone && `, ${t.status.done}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
