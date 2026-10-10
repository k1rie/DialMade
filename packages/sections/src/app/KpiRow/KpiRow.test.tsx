import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { kpiRowSection } from "./definition";

describe("app.kpiRow", () => {
  it("cards: una StatCard por KPI con su variación y tendencia", () => {
    const { container } = renderSection(kpiRowSection);
    const region = screen.getByRole("region", { name: "Indicadores clave" });
    expect(region.querySelectorAll(".dl-stat")).toHaveLength(4);
    expect(container.querySelectorAll(".dl-sparkline")).toHaveLength(4);
    expect(within(region).getByText("Ingresos recurrentes (MRR)")).toBeTruthy();
    expect(within(region).getAllByText("vs. periodo anterior")).toHaveLength(4);
  });

  it("una bajada es buena noticia cuando el KPI se invierte (bajas, espera…)", () => {
    const items = [
      { id: "churn", label: "Bajas", value: "1,2 %", delta: -4, invert: true, trend: [3, 2, 1] },
      { id: "users", label: "Usuarios", value: "900", delta: -4, invert: false, trend: [3, 2, 1] },
    ];
    const { container } = renderSection(kpiRowSection, { props: { items, count: 2 } });
    const sentiments = [...container.querySelectorAll(".dl-stat__delta")].map((el) => el.getAttribute("data-sentiment"));
    expect(sentiments).toEqual(["positive", "negative"]);
  });

  it("strip: una sola superficie; count y showTrend recortan", () => {
    const { container } = renderSection(kpiRowSection, { variant: "strip", props: { count: 3, showTrend: false } });
    expect(container.querySelector(".dl-app-kpis__strip")).toBeTruthy();
    expect(container.querySelectorAll(".dl-app-kpis__cell")).toHaveLength(3);
    expect(container.querySelector(".dl-sparkline")).toBeNull();
    expect(container.querySelectorAll(".dl-app-delta")).toHaveLength(3);
  });

  it("el valor lleva su longitud para ajustarse a la tarjeta", () => {
    const { container } = renderSection(kpiRowSection, { props: { items: [{ id: "t", label: "T", value: "2 min 51 s", delta: 1, invert: false, trend: [] }], count: 1 } });
    const value = container.querySelector<HTMLElement>(".dl-app-kpis__value-text");
    expect(value?.style.getPropertyValue("--_kpi-chars")).toBe("10");
  });
});
