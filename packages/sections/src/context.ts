import { GENERIC_PRODUCT_ID, getProductType, type Locale, type ProductType } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { hashString } from "./content/rng";
import type { ContentContext } from "./types";

/** Stand-in for «generic» (no product type chosen): neutral software copy. */
export const GENERIC_PRODUCT_TYPE: ProductType = {
  id: GENERIC_PRODUCT_ID,
  label: { es: "Producto digital", en: "Digital product" },
  group: "software",
  doNotUseStyles: [],
  keywords: [],
};

export function resolveProductType(productType: string | ProductType | undefined): ProductType {
  if (productType && typeof productType === "object") return productType;
  return (productType && getProductType(productType)) || GENERIC_PRODUCT_TYPE;
}

/** Stable per document: it does not change when the brand is renamed. */
export function contentSeed(doc: Pick<DesignDoc, "brief" | "provenance">): number {
  return hashString(`${doc.brief.productType}|${doc.provenance.createdAt ?? ""}`);
}

export interface ContentContextOptions {
  locale?: Locale;
  logoUrl?: string;
  seed?: number;
}

export function contentContextFromDoc(doc: DesignDoc, options: ContentContextOptions = {}): ContentContext {
  const { name, tagline } = doc.brand;
  return {
    brand: {
      name,
      ...(tagline && { tagline }),
      ...(options.logoUrl && { logoUrl: options.logoUrl }),
    },
    productType: resolveProductType(doc.brief.productType),
    locale: options.locale ?? doc.brief.locale,
    seed: options.seed ?? contentSeed(doc),
  };
}
