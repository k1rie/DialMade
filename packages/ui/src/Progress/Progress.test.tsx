import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("expone valor, rango y etiqueta", () => {
    render(
      <UiProvider locale="es">
        <Progress label="Subiendo" value={64} showValue />
      </UiProvider>,
    );
    const bar = screen.getByRole("progressbar", { name: "Subiendo" });
    expect(bar.getAttribute("aria-valuenow")).toBe("64");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toMatch(/64\s?%/);
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("64%");
  });

  it("sin valor es indeterminada", () => {
    render(<Progress aria-label="Procesando" />);
    const bar = screen.getByRole("progressbar", { name: "Procesando" });
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.closest(".dl-progress")?.hasAttribute("data-indeterminate")).toBe(true);
  });

  it("acepta un texto de valor propio", () => {
    render(<Progress label="Almacenamiento" value={86} valueText="8,6 de 10 GB" showValue />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("8,6 de 10 GB");
  });
});
