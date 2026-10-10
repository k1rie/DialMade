import { GENERIC_PRODUCT_ID, getProductType, type Locale, type ProductType } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { hashString } from "./content/rng";
import type { ContentContext, RenderContext } from "./types";

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

/** The link part of a `RenderContext` (`PageRenderer` and `renderStaticPage` build it from `linkHref` + `links`). */
export interface LinkOptions {
  /** Href of a screen (`null` when it has none in this render). */
  linkHref?: (screenId: string) => string | null;
  /** Element id → the screen its primary action links to (the blocks' `linkTo`). */
  links?: Readonly<Record<string, string>>;
}

/** `screenHref`, `blockLink` and `linkTarget` for a render context; empty when neither option is given. */
export function linkContext({ linkHref, links }: LinkOptions): Pick<RenderContext, "screenHref" | "blockLink" | "linkTarget"> {
  if (!linkHref && !links) return {};
  const targetOf = (elementId: string): string | null =>
    links && Object.prototype.hasOwnProperty.call(links, elementId) ? (links[elementId] ?? null) : null;
  return {
    ...(linkHref && { screenHref: (screenId: string) => linkHref(screenId) }),
    blockLink: (elementId: string) => {
      const target = targetOf(elementId);
      return target === null ? null : (linkHref?.(target) ?? null);
    },
    linkTarget: targetOf,
  };
}

/** Anchor props of an element's primary action: its screen link when it has one, `#` otherwise. */
export function linkProps(ctx: RenderContext, elementId: string): { href: string; "data-dl-screen-link"?: string } {
  const target = ctx.linkTarget?.(elementId) ?? null;
  const href = ctx.blockLink?.(elementId) ?? "#";
  return target === null ? { href } : { href, "data-dl-screen-link": target };
}

/** Anchor props of a link to a screen (navigation items): its href when known, `fallback` otherwise. */
export function screenLinkProps(
  ctx: RenderContext,
  screenId: string | undefined,
  fallback: string,
): { href: string; "data-dl-screen-link"?: string } {
  if (!screenId || !ctx.screenHref) return { href: fallback };
  const href = ctx.screenHref(screenId);
  return href === null ? { href: fallback } : { href, "data-dl-screen-link": screenId };
}
