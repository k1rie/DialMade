import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiProvider } from "../UiProvider";
import { Button } from "./Button";
import { buttonStyleProps } from "./buttonClasses";

describe("Button", () => {
  it("renderiza un botón con su texto, variante y tamaño", () => {
    render(
      <Button variant="cta" size="lg">
        Empezar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Empezar" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.dataset.variant).toBe("cta");
    expect(button.dataset.size).toBe("lg");
    expect(button.className).toContain("dl-button");
  });

  it("llama a onClick y no lo hace si está desactivado", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Guardar
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("en carga queda ocupado, desactivado y anuncia «Cargando…» en el idioma activo", () => {
    render(
      <UiProvider locale="es">
        <Button loading>Guardar</Button>
      </UiProvider>,
    );
    const button = screen.getByRole("button", { name: /Guardar.*Cargando…/ });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("los iconos son decorativos", () => {
    const { container } = render(<Button iconStart="plus">Nuevo</Button>);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button").textContent).toBe("Nuevo");
  });

  it("previewState fuerza el aspecto del estado", () => {
    render(<Button previewState="hover">Hover</Button>);
    expect(screen.getByRole("button").dataset.previewState).toBe("hover");
  });

  it("buttonStyleProps pinta un enlace como botón", () => {
    render(
      <a href="/signup" {...buttonStyleProps({ variant: "outline", size: "sm" })}>
        Registro
      </a>,
    );
    const link = screen.getByRole("link", { name: "Registro" });
    expect(link.className).toBe("dl-button");
    expect(link.dataset.variant).toBe("outline");
  });
});
