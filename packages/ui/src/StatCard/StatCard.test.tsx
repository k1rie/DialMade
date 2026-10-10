import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("muestra etiqueta, valor y delta con su dirección", () => {
    const { container } = render(
      <UiProvider locale="es">
        <StatCard label="Ingresos" value="$48,250" delta={12.4} deltaLabel="vs. el mes pasado" trend={[1, 2, 3]} />
      </UiProvider>,
    );
    expect(screen.getByText("Ingresos")).toBeTruthy();
    expect(screen.getByText("$48,250")).toBeTruthy();
    const delta = container.querySelector(".dl-stat__delta") as HTMLElement;
    expect(delta.textContent).toMatch(/^Sube \+12\.4\s?%$/);
    expect(delta.dataset.sentiment).toBe("positive");
    expect(container.querySelector(".dl-sparkline")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("invertDelta convierte una subida en algo negativo", () => {
    const { container } = render(<StatCard label="Churn" value="2.4%" delta={0.8} invertDelta />);
    const delta = container.querySelector(".dl-stat__delta") as HTMLElement;
    expect(delta.dataset.trend).toBe("up");
    expect(delta.dataset.sentiment).toBe("negative");
  });

  it("delta 0 es neutro", () => {
    const { container } = render(<StatCard label="Tickets" value="37" delta={0} />);
    expect((container.querySelector(".dl-stat__delta") as HTMLElement).dataset.sentiment).toBe("neutral");
  });
});
