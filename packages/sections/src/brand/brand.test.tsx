import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageSchema, compileThemeVars, resolveThemeInputs } from "@dialmade/doc";
import { BRAND_BOARD_SECTIONS } from "../constants";
import { contentContextFromDoc } from "../context";
import { PageRenderer } from "../PageRenderer";
import { createRegistry, validateSections } from "../registry";
import { renderStaticPage } from "../renderToHtml";
import { brandSections } from ".";
import { brandDoc, renderSection, sectionHtml } from "./testing/renderSection";

const registry = createRegistry(brandSections);

describe("brandSections", () => {
  it("cubre el board completo, en orden, y es un registro válido", () => {
    expect(brandSections.map((def) => def.type)).toEqual(BRAND_BOARD_SECTIONS);
    expect(validateSections(brandSections)).toEqual([]);
    for (const def of brandSections) {
      expect(def.kind).toBe("brand");
      expect(def.variants.length).toBe(2);
    }
  });

  it("defaultProps es JSON y pasa su schema en es y en", () => {
    for (const locale of ["es", "en"] as const) {
      const ctx = contentContextFromDoc(brandDoc({ locale }));
      for (const def of brandSections) {
        const props = def.defaultProps(ctx);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
        expect(def.schema.safeParse(props).success, def.type).toBe(true);
      }
    }
  });

  it("la página por defecto del doc es válida y guarda la marca como binding", () => {
    const page = brandDoc().pages.brand!;
    expect(PageSchema.safeParse(page).success).toBe(true);
    expect(page.elements["cover-1"]?.props).toMatchObject({ brandName: { bind: "brand.name" }, tagline: { bind: "brand.tagline" } });
  });

  it.each(["es", "en"] as const)("todas las variantes renderizan en SSR (%s, claro y oscuro, dos recetas)", (locale) => {
    for (const recipeId of ["glass", "minimal-swiss"]) {
      const doc = brandDoc({ locale, recipeId });
      for (const def of brandSections) {
        for (const { id: variant } of def.variants) {
          for (const mode of ["light", "dark"] as const) {
            expect(sectionHtml(def, { doc, variant, mode }), `${def.type}:${variant}`).toContain("dl-");
          }
        }
      }
    }
  });

  it("funciona sin doc en el contexto (sin números ni hex)", () => {
    for (const def of brandSections) {
      const { unmount } = renderSection(def, { withoutDoc: true });
      unmount();
    }
  });

  it("el board completo tiene un h1, un h2 por sección y numeración 01–06", () => {
    const doc = brandDoc();
    const { container } = render(<PageRenderer doc={doc} kind="brand" registry={registry} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.id);
    expect(titles).toEqual(["identity-1-title", "palette-1-title", "type-1-title", "shape-1-title", "components-1-title", "art-direction-1-title"]);
    const numbers = [...container.querySelectorAll(".dl-board-section__number")].map((el) => el.textContent);
    expect(numbers).toEqual(["01", "02", "03", "04", "05", "06"]);
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ocultar una sección renumera el resto y el índice de la portada", () => {
    const doc = brandDoc();
    const page = doc.pages.brand!;
    const hiddenDoc = { ...doc, pages: { ...doc.pages, brand: { ...page, hidden: ["identity-1"] } } };
    const { container } = render(<PageRenderer doc={hiddenDoc} kind="brand" registry={registry} />);
    expect([...container.querySelectorAll(".dl-board-section__number")].map((el) => el.textContent)).toEqual(["01", "02", "03", "04", "05"]);
    const index = within(screen.getByRole("navigation"));
    expect(index.getByRole("link", { name: "01 Paleta" }).getAttribute("href")).toBe("#palette-1-title");
    expect(index.queryByText("Identidad")).toBeNull();
  });

  it("se exporta a HTML estático sin secciones fallidas", () => {
    const doc = brandDoc({ locale: "en" });
    const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "dark" });
    const errors: string[] = [];
    const html = renderStaticPage(doc, "brand", vars, { mode: "dark", fonts: false, registry, onSectionError: (id) => errors.push(id) });
    expect(errors).toEqual([]);
    for (const block of ["dl-brand-cover", "dl-brand-identity", "dl-brand-palette", "dl-brand-type", "dl-brand-shape", "dl-brand-components", "dl-brand-art"]) {
      expect(html).toContain(block);
    }
    expect(html).toContain("WCAG contrast in dark mode");
  });
});
