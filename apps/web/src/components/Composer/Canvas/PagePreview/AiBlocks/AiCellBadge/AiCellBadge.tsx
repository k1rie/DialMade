"use client";

import { motion, useReducedMotion } from "motion/react";
import type { MouseEvent } from "react";
import { Spinner } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type AiCellBadgeProps = {
  /**
   * - `designing`: a soft shimmer over the block while its AI version is on its way (spec §10.2.3);
   * - `failed`: «La IA falló aquí · Reintentar» (the block stays on the base design, §10.3);
   * - `inactive`: the block went back to the base design; «Usar IA otra vez».
   */
  kind: "designing" | "failed" | "inactive";
  /** Block label («Hero»), for the buttons' names. */
  label: string;
  /** `failed`: a retry is in flight. */
  busy?: boolean;
  onAction?: () => void;
};

const stop = (event: MouseEvent) => event.stopPropagation();

/**
 * The app's marks on a block cell of the user's page (inside ThemeScope, so `.app-chrome`). Buttons are real app
 * buttons, reachable with Tab and Enter; their clicks never select the block underneath.
 */
export function AiCellBadge({ kind, label, busy = false, onAction }: AiCellBadgeProps) {
  const t = useDictionary(aiText).aiRender.block;
  const reduce = useReducedMotion();

  if (kind === "designing") {
    return (
      <div aria-hidden className="app-chrome pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,var(--app-glow-purple)_50%,transparent_80%)]"
          initial={{ opacity: 0 }}
          animate={reduce ? { opacity: 0.35 } : { opacity: [0.2, 0.5, 0.2] }}
          transition={reduce ? tween(0.2) : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="glass absolute top-2 left-2 inline-flex h-6 items-center gap-1.5 rounded-chip border border-app px-2 text-caption text-fg">
          <Spinner className="size-3 text-accent" />
          {t.designing}
        </span>
      </div>
    );
  }

  const failed = kind === "failed";
  return (
    <div className="app-chrome pointer-events-none absolute top-2 right-2 z-10 flex max-w-[calc(100%-1rem)]">
      <div
        className={cn(
          "glass pointer-events-auto inline-flex min-w-0 items-center gap-1 rounded-chip border py-0.5 ps-2.5 pe-0.5 text-caption shadow-lift",
          failed ? "border-danger/50 text-fg" : "border-app text-muted",
        )}
      >
        {failed && <span className="truncate">{t.failed}</span>}
        {failed && (
          <span aria-hidden className="text-muted">
            ·
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          aria-label={failed ? t.retryLabel(label) : t.useAiLabel(label)}
          onClick={(event) => {
            stop(event);
            onAction?.();
          }}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded-chip px-2 font-medium text-fg transition-colors duration-150 hover:bg-white/10 disabled:opacity-60"
        >
          {busy && <Spinner className="size-3" />}
          {failed ? t.retry : t.useAi}
        </button>
      </div>
    </div>
  );
}
