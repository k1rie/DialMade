"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { Button, Spinner } from "@/components/ui/Button";
import { useDesignDoc } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { RENDER_SESSION_ERROR_CODES, type RenderErrorCode } from "@/lib/ai/render/api";
import { useAiGeneration } from "@/lib/ai/render/generation";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { SparklesIcon } from "../icons";
import { failedScreens, runCounts, runProgress } from "./summary";

export type AiRunBarProps = { className?: string };

const RUNNING = new Set(["session", "direction", "screens"]);
type SessionCode = (typeof RENDER_SESSION_ERROR_CODES)[number];
const isSessionCode = (code: RenderErrorCode): code is SessionCode => (RENDER_SESSION_ERROR_CODES as readonly string[]).includes(code);

/**
 * The floating progress bar of «Generar con IA» in Ajustar (spec §10.2): honest progress from the stream's real
 * events («Eligiendo dirección de arte…», then «Diseñando Inicio · bloque 2 de 6» with the direction's rationale),
 * «Cancelar» always there while it runs («Se cobra lo generado hasta ahora»), and at the end the summary («6 bloques
 * con IA · 1 en base (falló) · 2 avisos»), «Reintentar» per failed screen (free) and «Cerrar». Screen readers hear one
 * polite announcement per finished screen [C9], never one per block. The user keeps editing underneath.
 */
export function AiRunBar({ className }: AiRunBarProps) {
  const texts = useDictionary(aiText);
  const t = texts.aiRender.run;
  const state = useAiGeneration((s) => s);
  const doc = useDesignDoc((s) => s.doc);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const running = RUNNING.has(state.phase);
  const nameOf = (screenId: string) => doc?.screens[screenId]?.name ?? screenId;

  // The button that had focus went away with its state (Cancelar → Cerrar): focus the bar's main action.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (!running && (!active || active === document.body)) closeRef.current?.focus({ preventScroll: true });
  }, [running]);

  const errorText = (code: RenderErrorCode) => (isSessionCode(code) ? texts.aiRender.errors[code] : texts.errors[code]);
  const failed = failedScreens(state);
  const counts = runCounts(state);
  const progress = runProgress(state);

  let status: { key: string; text: string; tone: "muted" | "fg" | "danger" };
  if (state.phase === "session") status = { key: "session", text: t.opening, tone: "muted" };
  else if (state.phase === "direction") status = { key: "direction", text: t.choosing, tone: "muted" };
  else if (state.phase === "screens" && progress) {
    const parts = [t.designing(nameOf(progress.screenId), progress.n, progress.total)];
    if (progress.others > 0) parts.push(t.parallel(progress.others));
    status = { key: `screens-${progress.screenId}`, text: parts.join(" "), tone: "fg" };
  } else if (state.phase === "screens") status = { key: "screens", text: t.summary(counts.ai, counts.base, counts.warnings), tone: "fg" };
  else if (state.phase === "cancelled") status = { key: "cancelled", text: t.cancelled, tone: "muted" };
  else if (state.phase === "failed") status = { key: `failed-${state.error}`, text: state.error ? errorText(state.error) : t.screenFailed(""), tone: "danger" };
  else status = { key: `done-${counts.ai}-${counts.base}`, text: t.summary(counts.ai, counts.base, counts.warnings), tone: "fg" };

  const detail =
    state.phase === "screens" && state.direction?.rationale
      ? t.direction(state.direction.rationale)
      : state.phase === "cancelled"
        ? t.cancelledPaid
        : state.phase === "done" && state.error
          ? errorText(state.error)
          : null;

  const announcement = state.announcement;
  const announced = announcement
    ? state.screens[announcement.screenId]?.phase === "failed"
      ? t.announceFailed(nameOf(announcement.screenId))
      : t.announce(nameOf(announcement.screenId), announcement.ai, announcement.base)
    : "";

  return (
    <>
      {/* One polite message per finished screen; `n` makes a repeated text announce again. */}
      <p role="status" className="sr-only">
        {announced}
        {announcement && announcement.n % 2 ? "​" : ""}
      </p>
      <AnimatePresence>
        {state.phase !== "idle" && (
          <motion.div
            key="ai-run-bar"
            className={cn("pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4", className)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={tween(0.24)}
          >
            <div
              role="group"
              aria-label={t.label}
              className="glass pointer-events-auto flex max-w-2xl min-w-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap rounded-panel border border-app p-2 shadow-lift"
            >
              <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5 px-2">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={status.key}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={tween(0.16)}
                    className={cn(
                      "m-0 flex min-w-0 items-center gap-2 text-caption",
                      status.tone === "danger" ? "text-danger" : status.tone === "fg" ? "text-fg" : "text-muted",
                    )}
                  >
                    {running ? <Spinner className="size-3.5 shrink-0 text-accent" /> : <SparklesIcon aria-hidden className="size-3.5 shrink-0 text-accent" />}
                    <span className="min-w-0">{status.text}</span>
                  </motion.p>
                </AnimatePresence>
                {detail && <p className="m-0 line-clamp-2 text-caption text-muted">{detail}</p>}
                {running && <p className="m-0 text-caption text-muted">{t.cancelHint}</p>}
                {!running &&
                  failed.map((screenId) => (
                    <p key={screenId} className="m-0 text-caption text-danger">
                      {t.screenFailed(nameOf(screenId))}
                    </p>
                  ))}
              </div>
              {running ? (
                <Button size="md" variant="secondary" onClick={state.actions.cancel}>
                  {t.cancel}
                </Button>
              ) : (
                <>
                  {failed.slice(0, 3).map((screenId) => (
                    <Button key={screenId} size="md" variant="secondary" aria-label={t.retryScreenLabel(nameOf(screenId))} onClick={() => void state.actions.retryScreen(screenId)}>
                      {failed.length > 1 ? `${t.retryScreen} · ${nameOf(screenId)}` : t.retryScreen}
                    </Button>
                  ))}
                  <Button ref={closeRef} size="md" variant="ghost" onClick={state.actions.dismiss}>
                    {t.close}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
