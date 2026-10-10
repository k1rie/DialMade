"use client";

import { getStyleRecipe } from "@dialmade/catalog";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { useDictionary, useI18n } from "@/i18n";
import { layout } from "@/i18n/layout";
import type { LayoutProposal } from "@/lib/ai/layout/normalize";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { KindBadge } from "../../../KindBadge";
import { LayoutThumbnail } from "../../../LayoutThumbnail";
import { warningText } from "./warningText";

export type VariantCardProps = {
  proposal: LayoutProposal;
  /** Position in the list (staggered entrance). */
  index: number;
  /** Shows the recommended style (otherwise «Mantiene tu estilo»). */
  withStyle: boolean;
  onApply: (proposal: LayoutProposal) => void;
  /** The «Elige una» screen: taller thumbnails. */
  large?: boolean;
};

/** Screens drawn as thumbnails on a card; the rest are named. */
const THUMBS = 3;

/**
 * One proposed variant: its screens as schematic thumbnails (LayoutThumbnail) with their names and kind, the name
 * and one-line rationale, the recommended style and why, and what normalization adjusted («3 ajustes», listed,
 * never silent). «Usar esta» applies it (one undo step).
 */
export function VariantCard({ proposal, index, withStyle, onApply, large = false }: VariantCardProps) {
  const t = useDictionary(layout);
  const d = t.describe;
  const { locale } = useI18n();
  const reduce = useReducedMotion();
  const id = useId();
  const recipe = proposal.recipeId ? getStyleRecipe(proposal.recipeId) : undefined;
  const thumbs = proposal.screens.slice(0, THUMBS);

  return (
    <motion.article
      aria-labelledby={`${id}-name`}
      aria-describedby={`${id}-rationale`}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...tween(0.2), delay: Math.min(index * 0.05, 0.12) }}
      className="flex h-full min-w-0 flex-col gap-3 rounded-panel border border-app bg-surface p-2.5 pb-3 shadow-surface transition-colors duration-200 hover:border-app-strong"
    >
      <ul
        aria-label={d.screensLabel}
        className={cn("m-0 grid list-none gap-1.5 rounded-card bg-app p-1.5 shadow-[0_0_0_1px_oklch(1_0_0/0.06)]", thumbs.length > 1 ? "grid-cols-3" : "grid-cols-1")}
      >
        {thumbs.map((screen) => (
          <li key={screen.key} className={cn("flex min-w-0 flex-col gap-1", thumbs.length === 1 && "col-span-1")}>
            <LayoutThumbnail
              layout={screen.layout}
              shell={screen.shell}
              className={cn("w-full overflow-hidden rounded-[6px]", thumbs.length === 1 ? (large ? "aspect-[16/9]" : "aspect-[16/7]") : large ? "aspect-[3/4]" : "aspect-[4/3]")}
            />
            <span className="flex min-w-0 items-center gap-1 px-0.5">
              <span className="min-w-0 truncate text-caption text-fg/85">{screen.name}</span>
              <KindBadge kind={screen.kind} />
            </span>
          </li>
        ))}
        {proposal.screens.length > THUMBS && (
          <li className="col-span-3 truncate px-0.5 text-caption text-muted">
            + {proposal.screens.slice(THUMBS).map((screen) => screen.name).join(" · ")}
          </li>
        )}
      </ul>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1">
        <h4 id={`${id}-name`} className="m-0 text-body font-semibold text-fg">
          {proposal.name}
        </h4>
        <p className="m-0 text-caption text-muted">
          {d.screens(proposal.screens.length)}
        </p>
        <p id={`${id}-rationale`} className="m-0 text-small text-pretty text-fg/85">
          {proposal.rationale}
        </p>
        <p className="m-0 text-caption text-pretty text-muted">
          {withStyle && recipe ? (
            <>
              <span className="font-medium text-fg/85">{d.style(recipe.label[locale])}</span>
              {proposal.recipeReason && ` · ${proposal.recipeReason}`}
            </>
          ) : (
            d.keepStyle
          )}
        </p>
        {proposal.warnings.length > 0 && (
          <details className="group text-caption text-muted">
            <summary className="w-fit cursor-pointer rounded-[6px] underline-offset-4 hover:text-fg hover:underline">
              {d.adjustments(proposal.warnings.length)}
            </summary>
            <p className="m-0 mt-1">{d.adjustmentsHint}</p>
            <ul className="m-0 mt-1 flex list-disc flex-col gap-0.5 ps-4">
              {proposal.warnings.map((warning, n) => (
                <li key={n}>{warningText(warning, d.warning, (type) => t.blocks[type].name)}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <Button variant={index === 0 ? "primary" : "secondary"} size="md" aria-label={d.applyLabel(proposal.name)} onClick={() => onApply(proposal)} className="mx-1">
        {d.apply}
      </Button>
    </motion.article>
  );
}
