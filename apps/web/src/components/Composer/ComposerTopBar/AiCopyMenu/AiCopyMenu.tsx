"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { useId, useState } from "react";
import { AiKeyDialog } from "@/components/AiKeyDialog";
import { Button } from "@/components/ui/Button";
import type { UseAiCopy } from "@/hooks/useAiCopy";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { cn } from "@/lib/cn";
import { estimateCopyCost, formatUsd } from "../../aiEstimate";
import { SparklesIcon } from "../../icons";
import { Popover } from "../../Popover";

export type AiCopyMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DesignDoc;
  kind: OutputKind;
  pageLabel: string;
  ai: UseAiCopy;
  /** Runs the request and applies the patch (Composer owns undo and toasts). */
  onGenerate: (instructions: string) => void;
};

const ENV_LINES = ["ANTHROPIC_API_KEY=…", "DIALMADE_AI_MONTHLY_BUDGET_USD=5"];

/**
 * «Generar copy con IA» for the whole page: estimated cost and remaining budget before running it.
 * Without AI it explains that the default copy is already there, and offers BYOK (AiKeyDialog) or
 * the server variables for self-hosting.
 */
export function AiCopyMenu({ open, onOpenChange, doc, kind, pageLabel, ai, onGenerate }: AiCopyMenuProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer);
  const instructionsId = useId();
  const [instructions, setInstructions] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const loading = ai.status === "loading";
  const estimate = open ? estimateCopyCost(doc, kind, undefined, ai.model) : 0;

  const openKeyDialog = () => {
    onOpenChange(false);
    setKeyOpen(true);
  };

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
            <p className="text-small font-semibold text-fg">{ai.available ? t.ai.title : t.ai.unavailableTitle}</p>
            <p className="mt-1 text-caption text-muted">{ai.available ? t.ai.description(pageLabel) : t.ai.unavailableBody}</p>
          </div>
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
              <p>{t.ai.howTo}</p>
              <pre className="overflow-x-auto rounded-control border border-app bg-black/30 px-3 py-2 font-mono text-[12px] leading-5 text-fg">
                {ENV_LINES.join("\n")}
              </pre>
              <p>{t.ai.restart}</p>
            </div>
          )}
        </div>
      </Popover>
      <AiKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
    </>
  );
}
