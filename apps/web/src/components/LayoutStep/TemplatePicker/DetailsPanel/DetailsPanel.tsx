"use client";

import type { DesignDoc } from "@dialmade/doc";
import { useEffect, useId } from "react";
import { useDesignDocActions } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { cn } from "@/lib/cn";
import { BrandTextField } from "./BrandTextField";
import { ProductTypeChips } from "./ProductTypeChips";

const NAME_MAX = 80;
const TAGLINE_MAX = 200;

export type DetailsPanelProps = {
  doc: DesignDoc;
  /** The doc already shows something (screens or pages): the product type no longer resets the style. */
  hasPages: boolean;
  className?: string;
};

/**
 * Optional details that feed the sample content: brand name, tagline and product type. They write to
 * the DesignDoc live (the minis follow), never block a choice, and each field edit is one undo step.
 * Before the first «Generar» the product type also brings its recipe, pairing and motion (unless locked).
 */
export function DetailsPanel({ doc, hasPages, className }: DetailsPanelProps) {
  const c = useDictionary(layout).templatePicker;
  const actions = useDesignDocActions();
  const titleId = useId();
  const productLabelId = useId();
  const productHintId = useId();

  // Unmounting with a field focused (e.g. the stepper) still closes its undo step.
  useEffect(() => () => actions.commitBatch(), [actions]);

  return (
    <section aria-labelledby={titleId} className={cn("rounded-panel border border-app bg-app-elevated/60 p-4 shadow-surface sm:p-5", className)}>
      <header className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 id={titleId} className="text-[0.9375rem] leading-6 font-semibold tracking-[-0.01em] text-fg">
          {c.details.title}
        </h2>
        <span className="rounded-[6px] border border-app-strong px-1.5 text-caption leading-5 text-muted">{c.details.optional}</span>
        <p className="basis-full text-small text-muted md:ms-auto md:basis-auto">{c.details.description}</p>
      </header>
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
      <div className="mt-4 flex flex-col gap-2">
        <p id={productLabelId} className="text-caption text-muted">
          {c.details.productType}
        </p>
        <ProductTypeChips
          value={doc.brief.productType}
          labelledBy={productLabelId}
          describedBy={productHintId}
          onChange={(id) => actions.setProductType(id, { applyDefaults: !hasPages })}
        />
        <p id={productHintId} className="text-caption text-muted">
          {hasPages ? c.details.productHintExisting : c.details.productHint}
        </p>
      </div>
    </section>
  );
}
