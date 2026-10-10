"use client";

// «Analizar estilo con IA» (importar-guia-spec.md §3 and §5): off by default. Before any call it shows
// the estimated cost and the free uses left; switching it on is the consent. Results come in as
// unlocked `method: "ai"` suggestions through `useAiVision({ onResult })` and never override values
// declared in the user's files. Without free uses or AI on the server it offers the two ways out:
// «Usar mi propia key» and «Copiar prompt para mi Claude» (AiKeyDialog).
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { AiKeyDialog, type AiKeyDialogView } from "@/components/AiKeyDialog";
import { Button, Spinner } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { UseAiVision } from "@/hooks/useAiVision";
import { useDictionary, useI18n } from "@/i18n";
import { ai } from "@/i18n/ai";
import { isCompleteScreenshot, type VisionScreenshot, type VisionScreenshotDraft } from "@/lib/ai/vision/client";
import { formatUsd } from "@/lib/ai/vision/estimate";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type AiAnalyzeToggleProps = {
  /** `useAiVision({ onResult })` of the parent, which attaches the fingerprints to the import. */
  vision: UseAiVision;
  /**
   * Own screenshots of the batch, in order. Before parsing (ImportPanel) sizes are enough for the
   * estimate; to run, each needs `sourceId`, `file`, `swatches` and `contentHash`.
   */
  screenshots: readonly VisionScreenshotDraft[];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Analyze as soon as it is switched on (default). ImportPanel passes `false` and calls `vision.analyze` after parsing. */
  runOnEnable?: boolean;
  disabled?: boolean;
  className?: string;
};

const SparkIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
    <path d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.4 4.4l1.2 1.2M10.4 10.4l1.2 1.2M4.4 11.6l1.2-1.2M10.4 5.6l1.2-1.2" />
  </svg>
);

export function AiAnalyzeToggle({ vision, screenshots, checked, onCheckedChange, runOnEnable = true, disabled, className }: AiAnalyzeToggleProps) {
  const t = useDictionary(ai).vision;
  const { locale } = useI18n();
  const labelId = useId();
  const descriptionId = useId();
  const costId = useId();
  const switchRef = useRef<HTMLButtonElement>(null);
  const [dialog, setDialog] = useState<AiKeyDialogView | null>(null);

  const complete = useMemo(() => (screenshots.every(isCompleteScreenshot) ? (screenshots as readonly VisionScreenshot[]) : null), [screenshots]);
  const count = Math.min(screenshots.length, vision.maxImages);
  const busy = vision.status === "preparing" || vision.status === "loading";
  const reason = vision.error?.fallback ?? vision.fallbackReason;
  /** Known to be blocked (no key, and the free tier cannot answer). While the status loads it is not. */
  const blocked = vision.source === null && vision.fallbackReason !== null;
  const manual = useMemo(() => (dialog && complete ? vision.manualJob({ screenshots: complete }) : null), [dialog, complete, vision]);

  const run = () => {
    if (!complete || complete.length === 0) return;
    vision.analyze({ screenshots: complete }).catch(() => {
      // Shown from vision.error.
    });
  };

  const toggle = (next: boolean) => {
    onCheckedChange(next);
    if (!next) {
      if (busy) vision.cancel();
      return;
    }
    if (blocked) {
      setDialog("key");
      return;
    }
    if (runOnEnable) run();
  };

  const estimate = t.estimate(formatUsd(vision.estimateUsd(screenshots), locale));
  const costLine =
    vision.source === "byok"
      ? `${estimate} · ${t.withKey}`
      : vision.source === "hosted"
        ? `${estimate} · ${vision.freeUsesRemaining === null ? t.oneUse : t.usesLeft(vision.freeUsesRemaining)}`
        : vision.fallbackReason
          ? t.blocked[vision.fallbackReason]
          : estimate;

  const result = vision.result;
  let statusLine: { key: string; text: string; tone: "muted" | "fg" | "danger" } | null = null;
  if (vision.status === "preparing") statusLine = { key: "preparing", text: t.preparing, tone: "muted" };
  else if (vision.status === "loading") statusLine = { key: "loading", text: t.analyzing(count), tone: "muted" };
  else if (checked && vision.status === "error" && vision.error) statusLine = { key: `error-${vision.error.code}`, text: vision.error.message, tone: "danger" };
  else if (checked && result) {
    const n = result.fingerprints.length;
    const text = result.source === "claude" ? t.doneManual(n) : result.cached ? t.doneCached(n) : t.done(n, formatUsd(result.costUsd, locale));
    statusLine = { key: `done-${result.source}-${n}`, text, tone: "fg" };
  }

  const showWaysOut = checked && !busy && (blocked || vision.error?.fallback != null);
  const showRetry = checked && vision.status === "error" && !vision.error?.fallback && !!complete;

  return (
    <div className={cn("flex flex-col gap-2 rounded-card border border-app bg-white/[0.02] p-3", className)}>
      <div className="flex items-start gap-3">
        {/* Switching it on is the consent to a call: its description carries the cost and the free uses left. */}
        <Switch
          ref={switchRef}
          checked={checked}
          onCheckedChange={toggle}
          disabled={disabled || screenshots.length === 0}
          aria-labelledby={labelId}
          aria-describedby={screenshots.length > 0 ? `${descriptionId} ${costId}` : descriptionId}
          className="mt-0.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span id={labelId} className="flex items-center gap-1.5 text-small font-medium text-fg">
            <span className="text-accent [&_svg]:size-3.5">
              <SparkIcon />
            </span>
            {t.label}
          </span>
          <p id={descriptionId} className="m-0 text-caption text-muted">
            {screenshots.length === 0 ? t.noScreenshots : t.description}
          </p>
          {screenshots.length > 0 && (
            <p id={costId} className="m-0 font-mono text-caption text-muted tabular-nums">
              {costLine}
              {screenshots.length > vision.maxImages && <span className="font-sans"> · {t.firstN(vision.maxImages, screenshots.length)}</span>}
            </p>
          )}
        </div>
      </div>

      <div aria-live="polite" className="min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {statusLine && (
            <motion.div
              key={statusLine.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={tween(0.18)}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12"
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-caption",
                  statusLine.tone === "danger" ? "text-danger" : statusLine.tone === "fg" ? "text-fg" : "text-muted",
                )}
              >
                {busy && <Spinner className="size-3.5 text-accent" />}
                {statusLine.text}
              </span>
              {busy && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    vision.cancel();
                    // «Cancelar» goes away with the request: focus returns to the switch.
                    requestAnimationFrame(() => switchRef.current?.focus());
                  }}
                >
                  {t.cancel}
                </Button>
              )}
              {showRetry && (
                <Button size="sm" variant="ghost" onClick={() => complete && void vision.retry().catch(() => {})}>
                  {t.retry}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {checked && result && result.fingerprints.length > 0 && !busy && vision.status !== "error" && (
          <p className="m-0 mt-1 pl-12 text-caption text-muted">{t.chipsHint}</p>
        )}
      </div>

      {showWaysOut && (
        <div className="flex flex-wrap gap-2 pl-12">
          <Button size="sm" variant="secondary" onClick={() => setDialog("key")}>
            {t.useKey}
          </Button>
          <Button size="sm" variant="ghost" disabled={!complete} onClick={() => setDialog("manual")}>
            {t.useClaude}
          </Button>
        </div>
      )}

      <AiKeyDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        reason={reason}
        manual={manual}
        initialView={dialog ?? "key"}
        onManualResult={(value) => vision.acceptResult(value)}
        onKeySaved={() => {
          if (checked && complete) void vision.analyze({ screenshots: complete, force: true }).catch(() => {});
        }}
      />
    </div>
  );
}
