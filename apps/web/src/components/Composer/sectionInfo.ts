import type { Locale } from "@dialmade/catalog";
import type { Page } from "@dialmade/doc";
import { VARIANT_PROP, sectionRegistry, type AnySectionDefinition } from "@dialmade/sections";

export type SectionInfo = {
  id: string;
  type: string;
  def: AnySectionDefinition | undefined;
  label: string;
  /** Stored variant (or the default one) and its label. */
  variant: string | undefined;
  variantLabel: string | undefined;
};

/** Label and variant of a page element, from the section registry. */
export function sectionInfo(page: Page, id: string, locale: Locale): SectionInfo {
  const element = page.elements[id];
  const type = element?.type ?? id;
  const def = sectionRegistry.get(type);
  const stored = element?.props[VARIANT_PROP];
  const variant = def?.variants.find((v) => v.id === stored) ?? def?.variants[0];
  return {
    id,
    type,
    def,
    label: def?.label[locale] ?? type,
    variant: variant?.id,
    variantLabel: variant?.label[locale],
  };
}
