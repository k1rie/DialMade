"use client";

import { GENERIC_PRODUCT_ID, getProductType, productChips, type Locale } from "@dialmade/catalog";
import { toast } from "sonner";
import { Chip } from "@/components/ui/Chip";
import { useDesignDocActions, useDesignHistory } from "@/hooks/useDesignDoc";
import { useDictionary } from "@/i18n";
import { composer } from "@/i18n/composer";

export type ProductChipsProps = {
  productType: string;
  locale: Locale;
};

/**
 * Optional product type (never blocks). Picking one regenerates the pages' default copy and sample
 * data for it; the toast offers to undo, since text edits are replaced.
 */
export function ProductChips({ productType, locale }: ProductChipsProps) {
  const t = useDictionary(composer);
  const actions = useDesignDocActions();
  const history = useDesignHistory();
  const known = productChips.some((chip) => chip.id === productType);
  const extra = known || productType === GENERIC_PRODUCT_ID ? undefined : getProductType(productType);

  const pick = (id: string, label: string) => {
    if (id === productType) return;
    const result = actions.setProductType(id, { rebuildPages: true });
    if (!result.ok) return;
    toast(t.brief.productChanged(label), { action: { label: t.undoAction, onClick: () => history.undo() } });
  };

  return (
    <div role="group" aria-label={t.brief.product} className="flex flex-wrap gap-1.5">
      {extra && (
        <Chip size="sm" selected onSelectedChange={() => {}}>
          {extra.label[locale]}
        </Chip>
      )}
      {productChips.map((chip) => (
        <Chip key={chip.id} size="sm" selected={chip.id === productType} onSelectedChange={() => pick(chip.id, chip.label[locale])}>
          {chip.label[locale]}
        </Chip>
      ))}
    </div>
  );
}
