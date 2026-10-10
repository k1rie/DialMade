"use client";

import type { DesignDoc } from "@dialmade/doc";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId } from "react";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";
import { ChevronDownIcon } from "../../icons";
import { BrandTextField } from "./BrandTextField";
import { ProductTypeChips } from "./ProductTypeChips";

const NAME_MAX = 80;
const TAGLINE_MAX = 200;

export type DetailsPanelProps = {
  doc: DesignDoc;
  /** The doc already shows something (screens or pages): the product type no longer resets the style. */
  hasPages: boolean;
  /** Collapsed by default inside «Describe». */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Some fields were filled from the description: say so, so the user checks them. */
  inferred?: boolean;
  className?: string;
};

/**
 * «Detalles» inside «Describe tu producto», collapsed: brand name, tagline and product type, which feed the sample
 * content. The description fills the ones the user has not set (the AI all three, «Sin IA» the product type); the
 * user corrects them here. They write to the DesignDoc live, never block a choice, and each field edit is one undo
 * step. Before the first «Generar» the product type also brings its recipe, pairing and motion (unless locked).
 */
export function DetailsPanel({ doc, hasPages, open, onOpenChange, inferred = false, className }: DetailsPanelProps) {
  const t = useDictionary(layout);
  const c = t.templatePicker;
  const d = t.describe.details;
  const actions = useDesignDocActions();
  const id = useId();
  const productLabelId = `${id}-product`;
  const productHintId = `${id}-product-hint`;

  // Unmounting with a field focused (e.g. the stepper) still closes its undo step.
  useEffect(() => () => actions.commitBatch(), [actions]);

  return (
    <section aria-labelledby={`${id}-title`} className={cn("rounded-card border border-app bg-white/[0.02]", className)}>
      <h3 id={`${id}-title`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => onOpenChange(!open)}
          className="flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-card px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronDownIcon className={cn("size-3.5 shrink-0 text-muted transition-transform duration-200", !open && "-rotate-90")} />
          <span className="text-small font-semibold text-fg">{d.title}</span>
          <span className="rounded-[6px] border border-app-strong px-1.5 text-caption leading-5 font-normal text-muted">{d.optional}</span>
          <span className="min-w-0 truncate text-caption font-normal text-muted">
            {inferred ? d.inferred : `${doc.brand.name}${doc.brand.tagline ? ` · ${doc.brand.tagline}` : ""}`}
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={`${id}-panel`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={tween(0.22)}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 px-3 pt-1 pb-4">
              <p className="m-0 text-caption text-muted">{d.hint}</p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <BrandTextField
                  label={c.details.name}
                  value={doc.brand.name}
                  placeholder={c.details.namePlaceholder}
                  maxLength={NAME_MAX}
                  required
                  onChange={(name) => actions.setBrandText({ name })}
                  onEditStart={actions.beginBatch}
                  onEditEnd={actions.commitBatch}
                />
                <BrandTextField
                  label={c.details.tagline}
                  value={doc.brand.tagline ?? ""}
                  placeholder={c.details.taglinePlaceholder}
                  maxLength={TAGLINE_MAX}
                  onChange={(tagline) => actions.setBrandText({ tagline })}
                  onEditStart={actions.beginBatch}
                  onEditEnd={actions.commitBatch}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p id={productLabelId} className="m-0 text-caption text-muted">
                  {c.details.productType}
                </p>
                <ProductTypeChips
                  value={doc.brief.productType}
                  labelledBy={productLabelId}
                  describedBy={productHintId}
                  onChange={(productType) => actions.setProductType(productType, { applyDefaults: !hasPages })}
                />
                <p id={productHintId} className="m-0 text-caption text-muted">
                  {hasPages ? c.details.productHintExisting : c.details.productHint}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
