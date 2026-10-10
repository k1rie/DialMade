import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("tiene rol switch y se activa con clic", () => {
    const onChange = vi.fn();
    render(<Switch label="Notificaciones" onChange={onChange} />);
    const control = screen.getByRole("switch", { name: "Notificaciones" }) as HTMLInputElement;
    expect(control.checked).toBe(false);
    fireEvent.click(control);
    expect(control.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("acepta descripción, tamaño y desactivado", () => {
    const { container } = render(<Switch label="Compacto" description="Más filas." size="sm" disabled />);
    const control = screen.getByRole("switch", { name: "Compacto" }) as HTMLInputElement;
    expect(control.disabled).toBe(true);
    expect(document.getElementById(control.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Más filas.");
    expect(container.querySelector(".dl-switch")?.getAttribute("data-size")).toBe("sm");
  });
});
