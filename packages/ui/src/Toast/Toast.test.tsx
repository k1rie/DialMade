import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../UiProvider";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("es un status con título, descripción y acciones", () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    render(
      <UiProvider locale="es">
        <Toast variant="success" title="Guardado" description="Todo bien" action={{ label: "Deshacer", onClick }} onDismiss={onDismiss} />
      </UiProvider>,
    );
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain("Guardado");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("los errores usan alert", () => {
    render(<Toast variant="destructive" title="Falló" />);
    expect(screen.getByRole("alert").textContent).toContain("Falló");
  });
});
