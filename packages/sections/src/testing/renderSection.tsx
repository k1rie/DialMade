import { render } from "@testing-library/react";
import type { Locale } from "@dialmade/catalog";
import { UiProvider } from "@dialmade/ui";
import { contentContextFromDoc } from "../context";
import { resolveSectionProps } from "../props";
import type { AnySectionDefinition, ColorMode, RenderContext } from "../types";
import { acmeDoc } from "./fixtures";

export interface RenderSectionOptions {
  locale?: Locale;
  productType?: string;
  variant?: string;
  props?: Record<string, unknown>;
  mode?: ColorMode;
  logoUrl?: string;
  tagline?: string;
  elementId?: string;
}

/** Renders one section as PageRenderer does (stored props over defaults, inside UiProvider), without the frame. */
export function renderSection(def: AnySectionDefinition, options: RenderSectionOptions = {}) {
  const { locale = "es", productType = "saas-general", variant, props = {}, mode = "light", logoUrl, tagline, elementId = "section-1" } = options;
  const doc = acmeDoc({ productType, locale, ...(tagline !== undefined && { tagline }) });
  const content = contentContextFromDoc(doc, logoUrl ? { logoUrl } : {});
  const ctx: RenderContext = { ...content, mode, interactive: false, doc };
  const resolved = resolveSectionProps(def, { ...(variant && { variant }), ...props }, content);
  const Section = def.Component;
  const view = render(
    <UiProvider locale={locale}>
      <Section {...resolved.props} variant={resolved.variant} ctx={ctx} elementId={elementId} />
    </UiProvider>,
  );
  return { ...view, ctx, resolved, props: resolved.props, invalidKeys: resolved.invalidKeys };
}
