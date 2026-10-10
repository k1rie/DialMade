"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { buttonBase, buttonSizes, buttonVariants } from "@/components/ui/Button/variants";
import { DownloadIcon } from "../icons";

export type FigmaInstallProps = {
  id: string;
  open: boolean;
  steps: readonly string[];
  pluginHref: string;
  pluginLabel: string;
  variablesLabel: string;
  lightLabel: string;
  darkLabel: string;
  onVariables: (mode: "light" | "dark") => void;
};

/**
 * «Cómo instalar el plugin», inside the Figma card: the three steps, the plugin's ZIP (served by the app) and the
 * variables-only downloads. The card's «Cómo instalar» button toggles it (`aria-controls` = `id`).
 */
export function FigmaInstall({ id, open, steps, pluginHref, pluginLabel, variablesLabel, lightLabel, darkLabel, onVariables }: FigmaInstallProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={tween(0.2)}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3 rounded-control border border-app bg-white/[0.03] p-3">
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-small text-muted marker:text-fg">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a href={pluginHref} download className={cn(buttonBase, buttonSizes.sm, buttonVariants.secondary, "self-start")}>
              <DownloadIcon />
              <span className="relative">{pluginLabel}</span>
            </a>
            <div className="flex flex-wrap items-center gap-2 text-caption text-muted">
              <span>{variablesLabel}</span>
              <button type="button" className="rounded-chip px-1.5 py-0.5 text-fg underline-offset-2 hover:underline focus-visible:outline-2" onClick={() => onVariables("light")}>
                {lightLabel}
              </button>
              <button type="button" className="rounded-chip px-1.5 py-0.5 text-fg underline-offset-2 hover:underline focus-visible:outline-2" onClick={() => onVariables("dark")}>
                {darkLabel}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
