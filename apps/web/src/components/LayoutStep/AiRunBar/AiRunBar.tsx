"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { Button, Spinner } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { countBlockStates } from "../generateFlow";
import { SparkleIcon } from "../icons";
import { useGenerateAi } from "../useGenerateFlow";

export type AiRunBarProps = {
  /** «Cancelar»: aborts the request, applies nothing. */
  onCancel: () => void;
  /** «Seguir editando el layout»: the page fades out and the boxes come back. */
  onKeepEditing: () => void;
  /** «Ir a Ajustar». */
  onFinish: () => void;
  className?: string;
};

/**
 * The floating bar while the generated page stays in the canvas with the optional AI copy: «Escribiendo…» and
 * «Cancelar» (on the hosted free tier, «Si cancelas, el uso ya cuenta»), then the summary («6 bloques con
 * textos nuevos», the texts kept because the user edited them, the failures), «Reintentar», the ways out when
 * the free tier cannot answer («Usar mi propia key», «Copiar prompt para mi Claude»), and the next step: «Ir a
 * Ajustar» or «Seguir editando el layout». Same look as the GenerateBar it replaces. When a state change takes
 * away the focused button (or the bar replaces the focused «Generar»), focus lands on the bar's main action.
 */
export function AiRunBar({ onCancel, onKeepEditing, onFinish, className }: AiRunBarProps) {
  const t = useDictionary(aiText).layoutCopy;
  const r = useDictionary(layout).generate.reveal;
  const { ai, run, canRetry, retry, openKeyDialog, copyPrompt } = useGenerateAi();
  const mainRef = useRef<HTMLButtonElement | null>(null);

  const counts = countBlockStates(ai.blocks);
  const writing = run.kind === "writing";

  // Focus lost to <body> (the button it was on went away): the main action of the new state.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body) mainRef.current?.focus({ preventScroll: true });
  }, [run.kind]);

  let status: { key: string; text: string; tone: "muted" | "fg" | "danger" };
  switch (run.kind) {
    case "writing":
      status = { key: "writing", text: t.writing(Math.max(1, counts.writing)), tone: "muted" };
      break;
    case "manual":
      status = { key: "manual", text: t.manualWaiting, tone: "muted" };
      break;
    case "done": {
      const parts = [run.done > 0 ? t.done(run.done) : counts.error > 0 ? "" : t.noChanges];
      if (run.stale > 0) parts.push(t.stale(run.stale));
      if (counts.error > 0) parts.push(t.errors(counts.error));
      status = { key: `done-${run.done}-${run.stale}-${counts.error}`, text: parts.filter(Boolean).join(" "), tone: "fg" };
      break;
    }
    case "failed":
      status = { key: `failed-${run.message}`, text: run.message, tone: "danger" };
      break;
    case "cancelled":
      status = { key: "cancelled", text: run.spent ? `${t.cancelled} ${t.cancelledSpent}` : t.cancelled, tone: "muted" };
      break;
    default:
      status = { key: "idle", text: "", tone: "muted" };
  }

  const fallback = run.kind === "failed" ? run.fallback : null;
  const showClaude = run.kind === "manual" || run.kind === "failed" || run.kind === "cancelled";

  return (
    <div className={cn("@container flex w-full min-w-0 justify-center pointer-events-none!", className)}>
      <div
        role="group"
        aria-label={r.barLabel}
        className="glass pointer-events-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2 rounded-panel border border-app p-2 shadow-lift"
      >
        <p role="status" aria-live="polite" aria-atomic="true" className="m-0 flex min-w-0 flex-1 basis-56 items-center gap-2 px-2 text-caption">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status.key}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={tween(0.16)}
              className={cn(
                "flex min-w-0 items-center gap-2",
                status.tone === "danger" ? "text-danger" : status.tone === "fg" ? "text-fg" : "text-muted",
              )}
            >
              {writing ? <Spinner className="size-3.5 shrink-0 text-accent" /> : <SparkleIcon className="size-3.5 shrink-0 text-accent" />}
              <span className="min-w-0">{status.text}</span>
            </motion.span>
          </AnimatePresence>
          {writing && run.spends && <span className="text-muted">{t.cancelSpends}</span>}
        </p>

        {writing ? (
          <Button ref={mainRef} size="md" variant="secondary" onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : (
          <>
            {canRetry && (
              <Button size="md" variant="secondary" aria-label={t.retryAll(counts.error)} onClick={retry}>
                {t.retry}
              </Button>
            )}
            {fallback && (
              <Button size="md" variant="secondary" onClick={openKeyDialog}>
                {t.useKey}
              </Button>
            )}
            {showClaude && (
              <Button size="md" variant="ghost" onClick={copyPrompt}>
                {t.useClaude}
              </Button>
            )}
            <Button size="md" variant="ghost" onClick={onKeepEditing}>
              {r.keepEditing}
            </Button>
            <Button ref={mainRef} size="md" variant="primary" onClick={onFinish}>
              {r.toAdjust}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
