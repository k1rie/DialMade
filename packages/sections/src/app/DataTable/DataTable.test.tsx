import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { dataTableSection } from "./definition";

describe("app.dataTable", () => {
  it("pedidos del e-commerce: estados como badges, cabecera de fila y paginación", () => {
    const { container } = renderSection(dataTableSection, { productType: "e-commerce" });
    expect(screen.getByRole("heading", { level: 2, name: "Pedidos recientes" })).toBeTruthy();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(
      expect.arrayContaining(["Pedido", "Cliente", "Estado", "Total"]),
    );
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(5);
    expect(within(rows[0] as HTMLElement).getByRole("rowheader").textContent).toMatch(/^#\d+/);
    expect(container.querySelectorAll("tbody .dl-badge").length).toBe(5);
    expect(screen.getByText(/1–5 de 12/)).toBeTruthy();
  });

  it("selección y acciones por fila con nombre accesible", () => {
    renderSection(dataTableSection, { productType: "e-commerce", locale: "en" });
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeTruthy();
    expect(screen.getAllByRole("checkbox", { name: /^Select #\d+/ })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /^Actions for #\d+/ })).toHaveLength(5);
    expect(screen.getByRole("searchbox", { name: "Filter…" })).toBeTruthy();
  });

  it("las personas llevan avatar decorativo y el progreso es una barra con nombre", () => {
    renderSection(dataTableSection, { productType: "online-course-e-learning" });
    const bars = screen.getAllByRole("progressbar");
    expect(bars.length).toBe(5);
    expect(bars[0]?.getAttribute("aria-label")).toMatch(/^Progreso: /);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("knobs: filas por página, sin selección ni barra de filtros, variante abierta", () => {
    const { container } = renderSection(dataTableSection, {
      variant: "plain",
      props: { pageSize: 3, selectable: false, showToolbar: false },
    });
    expect(container.querySelector(".dl-app-table")?.getAttribute("data-variant")).toBe("plain");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
