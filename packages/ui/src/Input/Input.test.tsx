import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("enlaza etiqueta, pista y error", () => {
    render(<Input label="Email" hint="No lo compartimos." error="Email no válido" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    const texts = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(["No lo compartimos.", "Email no válido"]);
    expect(input.closest(".dl-input")?.hasAttribute("data-invalid")).toBe(true);
  });

  it("sin etiqueta visible sigue teniendo nombre accesible", () => {
    render(<Input label="Buscar" hideLabel type="search" iconStart="search" />);
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeTruthy();
  });

  it("sin etiqueta ni mensajes devuelve solo el control", () => {
    const { container } = render(<Input aria-label="Nombre" />);
    expect(container.querySelector(".dl-field")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeTruthy();
  });

  it("propaga cambios, desactivado y required", () => {
    const onChange = vi.fn();
    render(<Input label="Nombre" required disabled onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: /Nombre/ }) as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.disabled).toBe(true);
    expect(input.closest(".dl-input")?.hasAttribute("data-disabled")).toBe(true);
  });

  it("al pulsar el marco (icono, relleno) enfoca el campo", () => {
    const { container } = render(<Input aria-label="Buscar" iconStart="search" />);
    fireEvent.pointerDown(container.querySelector(".dl-input__icon") as Element);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Buscar" }));
  });

  it("conserva el aria-describedby propio", () => {
    render(
      <>
        <p id="extra">Extra</p>
        <Input label="Código" hint="6 dígitos" aria-describedby="extra" />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Código" });
    expect(input.getAttribute("aria-describedby")?.startsWith("extra ")).toBe(true);
    fireEvent.change(input, { target: { value: "123" } });
    expect((input as HTMLInputElement).value).toBe("123");
  });
});
