import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { productTypes, type Locale } from "@dialmade/catalog";
import { compileThemeVars, resolveThemeInputs } from "@dialmade/doc";
import { buildDefaultPage } from "../buildPage";
import { APP_SHELL_TYPE, APP_SHELL_WIDGETS } from "../constants";
import { contentContextFromDoc, resolveProductType } from "../context";
import { PageRenderer } from "../PageRenderer";
import { resolveSectionProps } from "../props";
import { sectionRegistry, validateSections } from "../registry";
import { renderStaticPage } from "../renderToHtml";
import { acmeContent, acmeDoc } from "../testing/fixtures";
import type { ContentContext } from "../types";
import { appSections } from ".";

const TYPES = [
  "app.shell",
  "app.kpiRow",
  "app.chartCard",
  "app.activity",
  "app.dataTable",
  "app.settingsForm",
  "app.emptyState",
  "app.confirmDialog",
  "app.componentGallery",
];

const LOCALES: Locale[] = ["es", "en"];

function idsAreUnique(container: HTMLElement) {
  const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
  expect(ids.length - new Set(ids).size, "ids duplicados").toBe(0);
  for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
    for (const el of container.querySelectorAll(`[${attr}]`)) {
      for (const ref of (el.getAttribute(attr) ?? "").split(/\s+/).filter(Boolean)) {
        expect(container.querySelector(`[id="${ref}"]`), `${attr}="${ref}"`).toBeTruthy();
      }
    }
  }
}

describe("catálogo app", () => {
  it("registra las 9 secciones sin problemas", () => {
    expect(appSections.map((def) => def.type)).toEqual(TYPES);
    expect(validateSections(appSections)).toEqual([]);
    for (const type of TYPES) expect(sectionRegistry.get(type)?.kind).toBe("app");
    expect(sectionRegistry.get(APP_SHELL_TYPE)?.container).toBe(true);
  });

  it("defaultProps válidas y JSON para los 192 tipos de producto (y «generic») en es y en", () => {
    for (const id of [...productTypes.map((type) => type.id), "generic"]) {
      for (const locale of LOCALES) {
        const ctx: ContentContext = { brand: { name: "Nimbo" }, productType: resolveProductType(id), locale, seed: 11 };
        for (const def of appSections) {
          const props = def.defaultProps(ctx);
          const parsed = def.schema.safeParse(props);
          expect(parsed.success, `${def.type} · ${id} · ${locale}: ${parsed.error?.message}`).toBe(true);
          expect(JSON.parse(JSON.stringify(props))).toEqual(props);
        }
      }
    }
  });

  it("los datos son deterministas por producto", () => {
    const a = buildDefaultPage("app", acmeContent());
    const b = buildDefaultPage("app", acmeContent());
    expect(a).toEqual(b);
    const shop = buildDefaultPage("app", acmeContent(acmeDoc({ productType: "e-commerce" })));
    expect(shop.elements["data-table-1"]?.props.title).not.toEqual(a.elements["data-table-1"]?.props.title);
  });
});

describe("página por defecto", () => {
  it("root → app.shell → widgets, con las props guardadas válidas y la marca como binding", () => {
    const page = buildDefaultPage("app", acmeContent());
    const shell = page.elements[page.elements[page.root]!.children[0]!]!;
    expect(shell.type).toBe(APP_SHELL_TYPE);
    expect(shell.children.map((id) => page.elements[id]?.type)).toEqual(APP_SHELL_WIDGETS);
    expect(shell.props.brandName).toEqual({ bind: "brand.name" });
    for (const [id, element] of Object.entries(page.elements)) {
      const def = sectionRegistry.get(element.type);
      if (!def) continue;
      expect(resolveSectionProps(def, element.props, acmeContent()).invalidKeys, id).toEqual([]);
    }
  });

  it.each(LOCALES)("%s: se pinta entera, con ids únicos y referencias ARIA válidas", (locale) => {
    const doc = acmeDoc({ locale });
    const onSectionError = vi.fn();
    const { container } = render(<PageRenderer doc={doc} kind="app" mode="dark" onSectionError={onSectionError} />);
    expect(onSectionError).not.toHaveBeenCalled();
    idsAreUnique(container);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const content = container.querySelector(".dl-app-shell__content") as HTMLElement;
    expect([...content.children].map((child) => child.getAttribute("data-dl-type"))).toEqual(APP_SHELL_WIDGETS);
    expect(within(content.querySelector('[data-dl-type="app.dataTable"]') as HTMLElement).getByRole("table")).toBeTruthy();
    expect(within(content).getAllByRole("img", { name: /.+/ }).length).toBeGreaterThan(0);
  });

  it("los bindings siguen a la marca", () => {
    const doc = acmeDoc();
    const page = buildDefaultPage("app", contentContextFromDoc(doc));
    const { rerender } = render(<PageRenderer doc={doc} kind="app" page={page} />);
    expect(screen.getAllByText("Acme Cloud").length).toBeGreaterThan(0);
    rerender(<PageRenderer doc={{ ...doc, brand: { ...doc.brand, name: "Nimbus Labs" } }} kind="app" page={page} />);
    expect(screen.queryAllByText("Acme Cloud")).toHaveLength(0);
    expect(screen.getByText("Nimbus Labs · UI kit")).toBeTruthy();
  });

  it("modo edición: el shell y cada widget se seleccionan", () => {
    const onSelect = vi.fn();
    render(<PageRenderer doc={acmeDoc({ locale: "es" })} kind="app" interactive onSelect={onSelect} />);
    const groups = screen.getAllByRole("group", { name: /Indicadores|Marco del dashboard|Tabla/ });
    expect(groups.length).toBeGreaterThanOrEqual(3);
    const kpis = screen.getByRole("group", { name: "Indicadores" });
    fireEvent.click(kpis);
    expect(onSelect).toHaveBeenLastCalledWith(kpis.getAttribute("data-dl-id"));
  });

  it("se exporta a HTML estático sin secciones rotas", () => {
    const doc = acmeDoc();
    const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "light" });
    const onSectionError = vi.fn();
    const html = renderStaticPage(doc, "app", vars, { onSectionError });
    expect(onSectionError).not.toHaveBeenCalled();
    for (const type of APP_SHELL_WIDGETS) expect(html).toContain(`data-dl-type="${type}"`);
    expect(html).toContain("dl-app-shell__sidebar");
  });
});
