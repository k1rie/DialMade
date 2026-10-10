import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Radio } from "./Radio";
import { RadioGroup } from "./RadioGroup";

describe("Radio", () => {
  it("es un radio etiquetado", () => {
    render(<Radio label="Mensual" name="plan" value="m" />);
    expect(screen.getByRole("radio", { name: "Mensual" })).toBeTruthy();
  });
});

describe("RadioGroup", () => {
  const options = [
    { value: "m", label: "Mensual" },
    { value: "y", label: "Anual" },
    { value: "e", label: "Empresa", disabled: true },
  ];

  it("es un radiogroup con nombre y selección por defecto", () => {
    render(<RadioGroup label="Facturación" options={options} defaultValue="y" />);
    const group = screen.getByRole("radiogroup", { name: "Facturación" });
    expect(group.tagName).toBe("FIELDSET");
    expect((screen.getByRole("radio", { name: "Anual" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Empresa" }) as HTMLInputElement).disabled).toBe(true);
  });

  it("cambia de opción y avisa", () => {
    const onValueChange = vi.fn();
    render(<RadioGroup label="Facturación" options={options} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Mensual" }));
    expect(onValueChange).toHaveBeenCalledWith("m");
    expect((screen.getByRole("radio", { name: "Mensual" }) as HTMLInputElement).checked).toBe(true);
  });

  it("enlaza el error al grupo", () => {
    render(<RadioGroup label="Plan" options={options} error="Elige uno" />);
    const group = screen.getByRole("radiogroup", { name: "Plan" });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    const describedBy = group.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Elige uno");
  });
});
