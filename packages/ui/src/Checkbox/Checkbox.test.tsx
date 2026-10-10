import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("se etiqueta y se describe", () => {
    render(<Checkbox label="Acepto" description="Puedes leerlos en Ajustes." />);
    const checkbox = screen.getByRole("checkbox", { name: "Acepto" });
    const descriptionId = checkbox.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(descriptionId)?.textContent).toBe("Puedes leerlos en Ajustes.");
  });

  it("se marca al hacer clic en la etiqueta", () => {
    render(<Checkbox label="Recordarme" />);
    const checkbox = screen.getByRole("checkbox", { name: "Recordarme" }) as HTMLInputElement;
    fireEvent.click(screen.getByText("Recordarme"));
    expect(checkbox.checked).toBe(true);
  });

  it("aplica el estado indeterminado", () => {
    render(<Checkbox label="Todo" indeterminate />);
    expect((screen.getByRole("checkbox", { name: "Todo" }) as HTMLInputElement).indeterminate).toBe(true);
  });

  it("marca inválido y desactivado", () => {
    render(<Checkbox label="Privacidad" invalid disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Privacidad" }) as HTMLInputElement;
    expect(checkbox.getAttribute("aria-invalid")).toBe("true");
    expect(checkbox.disabled).toBe(true);
  });
});
