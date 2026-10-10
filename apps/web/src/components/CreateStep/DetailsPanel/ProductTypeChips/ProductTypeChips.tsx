"use client";

import { productChips } from "@dialmade/catalog";
import { Chip } from "@/components/ui/Chip";
import { useI18n } from "@/i18n";

export type ProductTypeChipsProps = {
  /** `brief.productType` (a ProductType id or "generic"). */
  value: string;
  onChange: (productTypeId: string) => void;
  labelledBy: string;
  describedBy?: string;
};

/** The 12 common product types plus «Otro» (generic). Single choice; never blocks the flow. */
export function ProductTypeChips({ value, onChange, labelledBy, describedBy }: ProductTypeChipsProps) {
  const { locale } = useI18n();
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="flex flex-wrap gap-1.5">
      {productChips.map((chip) => (
        <Chip key={chip.id} selected={chip.id === value} onSelectedChange={() => chip.id !== value && onChange(chip.id)}>
          {chip.label[locale]}
        </Chip>
      ))}
    </div>
  );
}
