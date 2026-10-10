import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { chartCardSection } from "./definition";
import { axisFormatter, chartSummary } from "./summary";

describe("app.chartCard", () => {
  it("pinta la gráfica del perfil con total, variación y leyenda", () => {
    const { container } = renderSection(chartCardSection, { productType: "e-commerce" });
    expect(screen.getByRole("heading", { level: 2, name: "Ventas por canal" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Ventas por canal" })).toBeTruthy();
    expect(container.querySelector(".dl-chart")?.getAttribute("data-type")).toBe("area");
    expect(container.querySelector(".dl-app-chart__total-value")?.textContent).toMatch(/\$/);
    expect(screen.getByRole("button", { name: /Últimos 6 meses/ })).toBeTruthy();
    expect(container.querySelector(".dl-chart-legend, .dl-chart__legend, [class*='legend']")).toBeTruthy();
  });

  it.each(["bar", "line"])("la variante %s cambia el tipo de gráfica", (variant) => {
    const { container } = renderSection(chartCardSection, { variant });
    expect(container.querySelector(".dl-chart")?.getAttribute("data-type")).toBe(variant);
  });

  it("sin resumen ni leyenda cuando se apagan", () => {
    const { container } = renderSection(chartCardSection, { props: { showSummary: false, showLegend: false } });
    expect(container.querySelector(".dl-app-chart__summary")).toBeNull();
    expect(container.querySelector("[class*='legend']")).toBeNull();
  });

  it("chartSummary suma lo sumable y mide el último cambio", () => {
    expect(chartSummary([100, 200, 250], "number", "en")).toEqual({ value: "550", delta: 25 });
    expect(chartSummary([10, 20], "percent", "en")).toEqual({ value: "20%", delta: 100 });
    expect(chartSummary([], "currency", "es").delta).toBe(0);
    expect(axisFormatter("currency", "en")(12000)).toBe("$12K");
    expect(axisFormatter("number", "es")(1500)).toMatch(/^1\.5\sk$/);
  });
});
