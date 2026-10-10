import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GALLERY_COPY } from "./copy";
import { Gallery } from "./Gallery";
import { GALLERY_SECTIONS } from "./sections";

describe("Gallery", () => {
  it.each(["es", "en"] as const)("renderiza todas las secciones en %s", (locale) => {
    const { container } = render(<Gallery locale={locale} />);
    const copy = GALLERY_COPY[locale];
    for (const id of GALLERY_SECTIONS) {
      expect(screen.getByRole("heading", { level: 2, name: copy.sections[id].title })).toBeTruthy();
    }
    expect(screen.getAllByRole("region").length).toBeGreaterThanOrEqual(GALLERY_SECTIONS.length);
    expect(screen.getByRole("table", { name: copy.table.caption })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: copy.charts.revenueTitle }).length).toBe(1);
    expect(screen.getByRole("dialog", { name: copy.overlays.deleteTitle })).toBeTruthy();
    expect(screen.getByRole("menu", { name: copy.overlays.options })).toBeTruthy();

    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of container.querySelectorAll("[aria-labelledby], [aria-describedby], [aria-controls]")) {
      for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
        for (const ref of node.getAttribute(attr)?.split(" ").filter(Boolean) ?? []) {
          expect(document.getElementById(ref), `${attr}="${ref}"`).not.toBeNull();
        }
      }
    }
  });

  it("todos los controles de formulario tienen nombre accesible", () => {
    render(<Gallery locale="es" />);
    const controls = [
      ...screen.getAllByRole("textbox"),
      ...screen.getAllByRole("combobox"),
      ...screen.getAllByRole("checkbox"),
      ...screen.getAllByRole("radio"),
      ...screen.getAllByRole("switch"),
      ...screen.getAllByRole("button"),
    ];
    for (const control of controls) {
      const labelled =
        control.getAttribute("aria-label") ||
        control.getAttribute("aria-labelledby") ||
        (control as HTMLInputElement).labels?.length ||
        control.textContent?.trim();
      expect(labelled, control.outerHTML.slice(0, 120)).toBeTruthy();
    }
  });

  it("filtra y ordena secciones, con el nivel de encabezado pedido", () => {
    render(<Gallery locale="en" sections={["charts", "buttons"]} headingLevel={3} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).filter((h) => h.className.includes("dl-gallery-section__title"));
    expect(headings.map((h) => h.textContent)).toEqual(["Charts", "Buttons"]);
    expect(within(document.body).queryByRole("table", { name: "Recent invoices" })).toBeNull();
  });
});
