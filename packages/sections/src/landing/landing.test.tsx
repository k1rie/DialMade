import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LANDING_SECTION_TYPES, landingLayouts, productTypes, type Locale } from "@dialmade/catalog";
import { UiProvider } from "@dialmade/ui";
import { compileThemeVars, resolveThemeInputs, type DesignDoc } from "@dialmade/doc";
import { buildDefaultPage } from "../buildPage";
import { contentContextFromDoc, resolveProductType } from "../context";
import { PageRenderer } from "../PageRenderer";
import { resolveSectionProps } from "../props";
import { createRegistry, validateSections } from "../registry";
import { renderStaticPage } from "../renderToHtml";
import { acmeDoc } from "../testing/fixtures";
import type { RenderContext } from "../types";
import { landingSections } from ".";
import { EMPHASES } from "./lib/knobs";

const registry = createRegistry(landingSections);
const LOCALES: readonly Locale[] = ["es", "en"];
const STYLE_KEYS = ["align", "emphasis", "background", "spacing"];

function landingDoc(layoutId: string, locale: Locale = "es", productType = "saas-general"): DesignDoc {
  const doc = acmeDoc({ locale, productType });
  return { ...doc, pages: { landing: buildDefaultPage("landing", contentContextFromDoc(doc), layoutId, { registry }) } };
}

function ariaReferencesResolve(root: HTMLElement) {
  for (const node of root.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls]")) {
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
      for (const id of (node.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        expect(root.ownerDocument.getElementById(id), `${attr}="${id}"`).not.toBeNull();
      }
    }
  }
}

describe("catálogo landing.*", () => {
  it("cubre las 8 secciones de los layouts, con 2 variantes cada una y sin errores de registro", () => {
    expect(validateSections(landingSections)).toEqual([]);
    expect(landingSections.map((def) => def.type).sort()).toEqual([...LANDING_SECTION_TYPES].sort());
    for (const layout of landingLayouts) for (const type of layout.sections) expect(registry.get(type), type).toBeDefined();
    for (const def of landingSections) {
      expect(def.kind).toBe("landing");
      expect(def.variants, def.type).toHaveLength(2);
      const keys = def.knobs.map((knob) => knob.key);
      expect(keys[0]).toBe("variant");
      for (const key of STYLE_KEYS) expect(keys, `${def.type} knob ${key}`).toContain(key);
    }
  });

  it("los knobs apuntan a props reales y los select ofrecen valores válidos", () => {
    const ctx = contentContextFromDoc(acmeDoc());
    for (const def of landingSections) {
      const defaults = def.defaultProps(ctx) as Record<string, unknown>;
      for (const knob of def.knobs) {
        if (knob.key === "variant") continue;
        expect(defaults, `${def.type}.${knob.key}`).toHaveProperty(knob.key);
        for (const option of knob.options ?? []) {
          const parsed = def.schema.safeParse({ ...defaults, [knob.key]: option.value });
          expect(parsed.success, `${def.type}.${knob.key}=${option.value}`).toBe(true);
        }
      }
    }
  });

  it("defaultProps es válido, JSON y determinista para los 192 tipos de producto en es y en", () => {
    for (const locale of LOCALES) {
      for (const productType of [...productTypes, resolveProductType("generic")]) {
        const ctx = { brand: { name: "Nimbus", tagline: "Hola" }, productType, locale, seed: 7 };
        for (const def of landingSections) {
          const props = def.defaultProps(ctx);
          const parsed = def.schema.safeParse(props);
          expect(parsed.success, `${def.type} · ${productType.id} · ${locale}`).toBe(true);
          expect(JSON.parse(JSON.stringify(props))).toEqual(props);
          expect(def.defaultProps(ctx)).toEqual(props);
        }
      }
    }
  });
});

describe("landing completa", () => {
  it.each(landingLayouts.map((layout) => [layout.id]))("layout %s: se pinta entera, con un solo h1 y referencias ARIA válidas", (layoutId) => {
    const doc = landingDoc(layoutId);
    const onSectionError = vi.fn();
    const { container } = render(<PageRenderer doc={doc} kind="landing" registry={registry} onSectionError={onSectionError} />);
    expect(onSectionError).not.toHaveBeenCalled();
    const layout = landingLayouts.find((item) => item.id === layoutId)!;
    const rendered = [...container.querySelectorAll("[data-dl-type]")].map((node) => node.getAttribute("data-dl-type"));
    for (const type of layout.sections) expect(rendered).toContain(type);
    expect(container.querySelectorAll(".dl-landing")).toHaveLength(layout.sections.length);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    ariaReferencesResolve(container);
  });

  it("en modo edición un clic en la portada la selecciona", () => {
    const onSelect = vi.fn();
    render(<PageRenderer doc={landingDoc("minimal", "en")} kind="landing" registry={registry} interactive onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("heading", { level: 1 }));
    expect(onSelect).toHaveBeenCalledWith("hero-1");
  });

  it("export estático de la landing más completa, en claro y oscuro, sin secciones caídas", () => {
    for (const mode of ["light", "dark"] as const) {
      const doc = landingDoc("feature-rich", "en", "e-commerce");
      const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode });
      const onSectionError = vi.fn();
      const html = renderStaticPage(doc, "landing", vars, { registry, mode, onSectionError });
      expect(onSectionError).not.toHaveBeenCalled();
      for (const type of LANDING_SECTION_TYPES) expect(html).toContain(`data-dl-type="${type}"`);
      expect(html).toContain('class="dl-landing dl-landing-hero"');
      expect(html).toContain("inert");
    }
  });
});

describe("todas las variantes y énfasis", () => {
  const doc = acmeDoc({ productType: "developer-tool-ide" });
  it.each(LOCALES.map((locale) => [locale]))("%s: se renderizan en servidor sin errores", (locale) => {
    const content = contentContextFromDoc(doc, { locale });
    const ctx: RenderContext = { ...content, mode: "dark", interactive: false, doc };
    for (const def of landingSections) {
      for (const variant of def.variants) {
        for (const emphasis of EMPHASES) {
          const { props } = resolveSectionProps(def, { variant: variant.id, emphasis, background: "brand-gradient", align: "start" }, content);
          const Section = def.Component;
          const html = renderToStaticMarkup(
            <UiProvider locale={locale}>
              <Section {...props} variant={variant.id} ctx={ctx} elementId="x-1" />
            </UiProvider>,
          );
          expect(html, `${def.type}/${variant.id}/${emphasis}`).toContain(`data-variant="${variant.id}"`);
          expect(html).toContain(`data-emphasis="${emphasis}"`);
          expect(html).toContain('data-bg="brand-gradient"');
        }
      }
    }
  });
});
