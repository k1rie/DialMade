"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import type { LayoutProposal } from "@/lib/ai/layout/normalize";
import { cn } from "@/lib/cn";
import { FIELD_HINT } from "../../fieldStyles";
import { ArrowLeftIcon, SparkleIcon } from "../../icons";
import type { DescribeBy } from "../useDescribe";
import { VariantCard } from "./VariantCard";

export type ChooseVariantProps = {
  /** `page`: the «Elige una» screen (back, «Proponer otras», Esc goes back). `inline`: under the dialog's form. */
  variant: "page" | "inline";
  proposals: readonly LayoutProposal[];
  by: DescribeBy;
  model: string;
  withStyle: boolean;
  onWithStyleChange: (next: boolean) => void;
  onApply: (proposal: LayoutProposal) => void;
  /** A request in flight or its failure («Proponer otras»). */
  status?: ReactNode;
  /** Page only. */
  onBack?: () => void;
  onProposeAgain?: () => void;
  proposing?: boolean;
  /** The cost of «Proponer otras», shown before calling again. */
  costLine?: string;
  /** «Detalles: Navaja Club · Restaurante o local», with «Corregir» (back to «Detalles»). */
  detailsSummary?: string | null;
  onFixDetails?: () => void;
  focusHeading?: boolean;
};

/**
 * The 2–3 proposed variants as large cards (VariantCard: thumbnails per screen, name and rationale, style,
 * adjustments, «Usar esta») with «Aplicar también el estilo recomendado». As the «Elige una» screen it also offers
 * «Volver a describir» (Esc too; the text stays) and «Proponer otras», with its cost shown again.
 */
export function ChooseVariant({
  variant,
  proposals,
  by,
  model,
  withStyle,
  onWithStyleChange,
  onApply,
  status,
  onBack,
  onProposeAgain,
  proposing = false,
  costLine,
  detailsSummary,
  onFixDetails,
  focusHeading = false,
}: ChooseVariantProps) {
  const t = useDictionary(layout);
  const d = t.describe;
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const page = variant === "page";
  const recommendsStyle = proposals.some((proposal) => proposal.recipeId);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true });
  }, [focusHeading]);

  // Esc goes back to «Describe», unless a control inside handled it.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!page || event.key !== "Escape" || event.defaultPrevented || !onBack) return;
    event.preventDefault();
    onBack();
  };

  const by_ = by === "ai" ? d.resultsBy.ai(model) : d.resultsBy[by];

  return (
    <section aria-labelledby={`${id}-title`} onKeyDown={onKeyDown} className={cn("flex flex-col", page ? "gap-5" : "gap-3")}>
      {page ? (
        <header className="flex flex-col gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" leadingIcon={<ArrowLeftIcon />} onClick={onBack} className="self-start">
              {d.backToDescribe}
            </Button>
          )}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 ref={headingRef} id={`${id}-title`} tabIndex={-1} className="m-0 text-h2 text-balance text-fg outline-none">
              {d.chooseTitle}
            </h2>
            <p className="m-0 text-body text-muted">
              {by_} · {d.results(proposals.length)}
            </p>
          </div>
        </header>
      ) : (
        <div className="min-w-0">
          <h4 ref={headingRef} id={`${id}-title`} tabIndex={-1} className="m-0 text-small font-semibold text-fg outline-none">
            {d.resultsTitle}
          </h4>
          <p className="m-0 text-caption text-muted">
            {by_} · {d.results(proposals.length)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {detailsSummary ? (
          <p className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 text-caption text-muted">
            <span className="min-w-0">{d.details.summary(detailsSummary)}</span>
            {onFixDetails && (
              <button type="button" onClick={onFixDetails} className="rounded-[6px] text-accent underline-offset-4 hover:underline focus-visible:underline">
                {d.details.fix}
              </button>
            )}
          </p>
        ) : (
          <span />
        )}
        {recommendsStyle && <Switch size="sm" checked={withStyle} onCheckedChange={onWithStyleChange} label={d.applyStyle} />}
      </div>

      {status}

      <div className={cn("grid gap-3 md:gap-4", proposals.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2", proposing && "opacity-60 transition-opacity duration-200")}>
        {proposals.map((proposal, index) => (
          <VariantCard key={proposal.id} proposal={proposal} index={index} withStyle={withStyle} onApply={onApply} large={page} />
        ))}
      </div>

      {page && onProposeAgain && (
        <div className="flex flex-col items-center gap-1.5">
          <Button variant="secondary" size="md" leadingIcon={<SparkleIcon />} loading={proposing} disabled={proposing} aria-describedby={`${id}-cost`} onClick={onProposeAgain}>
            {d.proposeAgain}
          </Button>
          {costLine && (
            <p id={`${id}-cost`} className={cn(FIELD_HINT, "m-0 tabular-nums")}>
              {costLine}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
