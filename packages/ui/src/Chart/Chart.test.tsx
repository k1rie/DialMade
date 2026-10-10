import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { Chart } from "./Chart";

const categories = ["Ene", "Feb", "Mar"];

describe("Chart", () => {
  it("el SVG es una imagen con <title> y <desc>", () => {
    render(<Chart type="bar" title="Ingresos" description="Suben cada mes" categories={categories} series={[{ name: "2026", values: [1, 2, 3] }]} />);
    const svg = screen.getByRole("img", { name: "Ingresos" });
    expect(svg.querySelector("title")?.textContent).toBe("Ingresos");
    expect(svg.querySelector("desc")?.textContent).toBe("Suben cada mes");
    expect(svg.getAttribute("aria-describedby")).toBe(svg.querySelector("desc")?.id);
  });

  it("incluye una tabla de datos oculta para lectores de pantalla", () => {
    render(
      <UiProvider locale="es">
        <Chart
          type="line"
          title="Usuarios"
          categoryLabel="Mes"
          categories={categories}
          series={[
            { name: "Web", values: [1200, 1500, 1800] },
            { name: "App", values: [300, 400, 500] },
          ]}
        />
      </UiProvider>,
    );
    const table = screen.getByRole("table", { name: "Usuarios — Datos de la gráfica" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Mes", "Web", "App"]);
    expect(within(table).getByRole("rowheader", { name: "Mar" })).toBeTruthy();
    expect(within(table).getByText("1800")).toBeTruthy();
  });

  it("pinta una barra por valor y colorea por serie", () => {
    const { container } = render(
      <Chart
        type="bar"
        title="Uso"
        categories={categories}
        series={[
          { name: "A", values: [1, 2, 3] },
          { name: "B", values: [3, -1, 2], color: 4 },
        ]}
      />,
    );
    expect(container.querySelectorAll(".dl-chart__bar")).toHaveLength(6);
    expect(container.querySelectorAll(".dl-chart__bar[data-negative]")).toHaveLength(1);
    const groups = container.querySelectorAll("g.dl-chart__series");
    expect([...groups].map((g) => g.getAttribute("data-series"))).toEqual(["1", "4"]);
    expect(container.querySelector(".dl-chart-legend")).toBeTruthy();
  });

  it("el área usa un degradado con id válido", () => {
    const { container } = render(<Chart type="area" title="Tráfico" categories={categories} series={[{ name: "Visitas", values: [5, 9, 7] }]} />);
    const area = container.querySelector(".dl-chart__area") as SVGPathElement;
    const fill = area.getAttribute("fill") ?? "";
    const id = fill.slice("url(#".length, -1);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(container.querySelector(`linearGradient[id="${id}"]`)).toBeTruthy();
    expect(container.querySelector(".dl-chart__line")?.getAttribute("d")).toMatch(/^M[\d.]+,[\d.]+C/);
    expect(container.querySelector(".dl-chart-legend")).toBeNull();
  });
});
