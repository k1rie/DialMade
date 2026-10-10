import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale } from "@dialmade/catalog";
import { createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { UiProvider } from "@dialmade/ui";
import { addDefaultPage } from "../../buildPage";
import { contentContextFromDoc } from "../../context";
import { resolveSectionProps } from "../../props";
import { CREATED_AT } from "../../testing/fixtures";
import type { AnySectionDefinition, ColorMode, RenderContext } from "../../types";

export interface BrandDocOptions {
  name?: string;
  tagline?: string | null;
  secondary?: string | null;
  recipeId?: string;
  pairingId?: string;
  locale?: Locale;
  productType?: string;
}

/** A doc with the full brand board (`pages.brand`), like the app creates it. */
export function brandDoc(options: BrandDocOptions = {}): DesignDoc {
  const doc = createDesignDoc({
    brand: {
      name: options.name ?? "Acme Cloud",
      ...(options.tagline !== null && { tagline: options.tagline ?? "Ship faster, sleep better" }),
      seeds: { primary: "#3A5BD9", ...(options.secondary !== null && { secondary: options.secondary ?? "#f0a024" }) },
    },
    brief: {
      productType: options.productType ?? "saas-general",
      locale: options.locale ?? "es",
      ...(options.recipeId && { recipeId: options.recipeId }),
      ...(options.pairingId && { pairingId: options.pairingId }),
    },
    provenance: { createdAt: CREATED_AT },
  });
  return addDefaultPage(doc, "brand");
}

export interface SectionRenderOptions {
  doc?: DesignDoc;
  /** Render without `ctx.doc` (the section must still work, without numbers). */
  withoutDoc?: boolean;
  mode?: ColorMode;
  locale?: Locale;
  logoUrl?: string;
  variant?: string;
  props?: Record<string, unknown>;
}

export function sectionElement(def: AnySectionDefinition, options: SectionRenderOptions = {}): ReactElement {
  const doc = options.doc ?? brandDoc();
  const locale = options.locale ?? doc.brief.locale;
  const content = contentContextFromDoc(doc, { locale, ...(options.logoUrl && { logoUrl: options.logoUrl }) });
  const ctx: RenderContext = { ...content, mode: options.mode ?? "light", interactive: false, ...(!options.withoutDoc && { doc }) };
  const page = doc.pages.brand;
  const elementId = Object.entries(page?.elements ?? {}).find(([, element]) => element.type === def.type)?.[0] ?? "section-1";
  const stored = { ...(page?.elements[elementId]?.props ?? {}), ...options.props, ...(options.variant && { variant: options.variant }) };
  const resolved = resolveSectionProps(def, stored, content);
  const Section = def.Component;
  return (
    <UiProvider locale={locale}>
      <Section {...resolved.props} variant={resolved.variant} ctx={ctx} elementId={elementId} />
    </UiProvider>
  );
}

export const renderSection = (def: AnySectionDefinition, options?: SectionRenderOptions) => render(sectionElement(def, options));

export const sectionHtml = (def: AnySectionDefinition, options?: SectionRenderOptions) => renderToStaticMarkup(sectionElement(def, options));
