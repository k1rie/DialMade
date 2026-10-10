"use client";

import type { DesignDoc } from "@dialmade/doc";
import { useId, useMemo, useState } from "react";
import { AiKeyDialog, type AiKeyDialogView } from "@/components/AiKeyDialog";
import { AiUsageMeter } from "@/components/AiUsageMeter";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import type { AiCopyResult, UseAiCopy } from "@/hooks/useAiCopy";
import { useAiStatus } from "@/hooks/useAiStatus";
import { useDictionary, useI18n } from "@/i18n";
import { ai as aiText } from "@/i18n/ai";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { estimateCopyCost, estimateScreensCopyCost } from "@/lib/ai/estimate";
import { formatUsd } from "@/lib/money";
import { SparklesIcon } from "../../icons";
import type { PageTarget } from "../../pageOps";

export type AiCopyMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DesignDoc;
  /** The page whose copy is rewritten: a screen (one request for that screen) or a page kind. */
  target: PageTarget;
  pageLabel: string;
  ai: UseAiCopy;
  /** Runs the request and applies the patch (Composer owns undo and toasts). */
  onGenerate: (instructions: string) => void;
  /** A «Copiar prompt para mi Claude» answer, already validated: apply it like a generated one. */
  onManualResult: (result: AiCopyResult) => void;
};

const ENV_LINES = ["ANTHROPIC_API_KEY=…", "DIALMADE_AI_MONTHLY_BUDGET_USD=5"];

/**
 * «Generar copy con IA» for the whole page, under the AI access policy: the free uses left («3 de 5
 * usos gratis este mes»), the estimated cost and the remaining budget before running it. When the free
 * tier cannot answer (no uses, budget or daily limit) it offers the two ways out, «Usar mi propia key»
 * and «Copiar prompt para mi Claude»; only when the server has no AI at all does it show the variables
 * for self-hosting. The default copy is always there without AI.
 */
export function AiCopyMenu({ open, onOpenChange, doc, target, pageLabel, ai, onGenerate, onManualResult }: AiCopyMenuProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const reasons = useDictionary(aiText).key.reasons;
  const { status } = useAiStatus();
  const instructionsId = useId();
  const [instructions, setInstructions] = useState("");
  const [dialog, setDialog] = useState<AiKeyDialogView | null>(null);
  const loading = ai.status === "loading";
  const screenId = target.screen?.id;
  const kind = target.kind;
  const estimate = !open
    ? 0
    : screenId
      ? estimateScreensCopyCost(doc, [{ id: screenId }], ai.model)
      : estimateCopyCost(doc, kind, undefined, ai.model);
  const reason = ai.fallbackReason;
  const notConfigured = reason === "not-configured";
  const trimmed = instructions.trim();
  const manual = useMemo(
    () => {
      if (!dialog) return null;
      const extra = trimmed ? { instructions: trimmed } : {};
      return ai.manualJob(screenId ? { screens: [{ id: screenId }], ...extra } : { kind, ...extra });
    },
    [dialog, ai, kind, screenId, trimmed],
  );

  const openDialog = (view: AiKeyDialogView) => {
    onOpenChange(false);
    setDialog(view);
  };
  const openKeyDialog = () => openDialog("key");

  const keyButton = (
    <button
      type="button"
      onClick={openKeyDialog}
      className="rounded-[6px] text-caption font-medium text-fg underline decoration-white/25 underline-offset-2 hover:decoration-white/60"
    >
      {ai.source === "byok" ? t.ai.manageKey : t.ai.useOwnKey}
    </button>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        label={t.ai.title}
        align="end"
        className="w-80"
        trigger={(props) => (
          <Button {...props} size="sm" variant="secondary" loading={loading} leadingIcon={<SparklesIcon className="text-accent" />}>
            <span className="max-md:sr-only">{t.ai.button}</span>
          </Button>
        )}
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-small font-semibold text-fg">{ai.available ? t.ai.title : notConfigured ? t.ai.unavailableTitle : t.ai.outOfFreeTitle}</p>
            <p className="mt-1 text-caption text-muted">
              {ai.available ? t.ai.description(pageLabel) : reason && !notConfigured ? reasons[reason](status?.freeUsesTotal ?? 0) : t.ai.unavailableBody}
            </p>
          </div>
          <AiUsageMeter />
          {ai.available ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={instructionsId} className="text-caption font-medium text-muted">
                  {t.ai.instructionsLabel}
                </label>
                <textarea
                  id={instructionsId}
                  rows={2}
                  value={instructions}
                  maxLength={280}
                  placeholder={t.ai.instructionsPlaceholder}
                  onChange={(event) => setInstructions(event.target.value)}
                  className="resize-none rounded-control border border-app-strong bg-white/[0.03] px-2.5 py-1.5 text-small text-fg placeholder:text-subtle"
                />
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-control border border-app bg-white/[0.02] px-3 py-2 text-caption">
                <dt className="text-muted">{t.ai.estimate}</dt>
                <dd className="font-mono text-fg tabular-nums">≈ {formatUsd(estimate, locale)}</dd>
                <dt className="text-muted">{t.ai.budget}</dt>
                <dd className={cn("font-mono tabular-nums", ai.remainingBudgetUsd === null ? "text-muted" : "text-fg")}>
                  {ai.source === "byok"
                    ? t.ai.byok
                    : ai.remainingBudgetUsd === null
                      ? t.ai.budgetUnknown
                      : formatUsd(ai.remainingBudgetUsd, locale)}
                </dd>
                <dd className="col-span-2 text-muted">{t.ai.estimateHint}</dd>
              </dl>
              <div className="flex items-center justify-between gap-2">
                {keyButton}
                <div className="flex gap-2">
                  {loading && (
                    <Button size="sm" variant="ghost" onClick={ai.cancel}>
                      {t.ai.cancel}
                    </Button>
                  )}
                  <Button size="sm" variant="primary" loading={loading} leadingIcon={<SparklesIcon />} onClick={() => onGenerate(instructions.trim())}>
                    {t.ai.generate}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 text-caption text-muted">
              <div className="flex flex-col items-start gap-1 rounded-control border border-app bg-white/[0.02] px-3 py-2">
                <Button size="sm" variant="primary" leadingIcon={<SparklesIcon />} onClick={openKeyDialog}>
                  {t.ai.useOwnKey}
                </Button>
                <p>{t.ai.ownKeyHint}</p>
              </div>
              <div className="flex flex-col items-start gap-1 rounded-control border border-app bg-white/[0.02] px-3 py-2">
                <Button size="sm" variant="secondary" onClick={() => openDialog("manual")}>
                  {t.ai.useClaude}
                </Button>
                <p>{t.ai.claudeHint}</p>
              </div>
              {notConfigured && (
                <>
                  <p>{t.ai.howTo}</p>
                  <pre className="overflow-x-auto rounded-control border border-app bg-black/30 px-3 py-2 font-mono text-[12px] leading-5 text-fg">
                    {ENV_LINES.join("\n")}
                  </pre>
                  <p>{t.ai.restart}</p>
                </>
              )}
            </div>
          )}
        </div>
      </Popover>
      <AiKeyDialog<AiCopyResult>
        open={dialog !== null}
        onOpenChange={(next) => !next && setDialog(null)}
        reason={ai.available ? null : reason}
        manual={manual}
        initialView={dialog ?? "key"}
        onManualResult={(result) => onManualResult(result)}
      />
    </>
  );
}
