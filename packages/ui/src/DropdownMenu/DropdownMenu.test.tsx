import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu, type DropdownMenuEntry } from "./DropdownMenu";

const onSelect = vi.fn();
const items: DropdownMenuEntry[] = [
  { type: "label", id: "l", label: "Cuenta" },
  { id: "profile", label: "Perfil", icon: "user", shortcut: "⌘P", onSelect },
  { id: "export", label: "Exportar", disabled: true, onSelect },
  { type: "separator", id: "s" },
  { id: "sidebar", label: "Barra lateral", checked: true },
  { id: "delete", label: "Eliminar", destructive: true },
];

describe("DropdownMenu", () => {
  it("expone menú, elementos, separador y casilla", () => {
    render(<DropdownMenu label="Mi cuenta" items={items} />);
    expect(screen.getByRole("menu", { name: "Mi cuenta" })).toBeTruthy();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    for (const name of ["Perfil", "Exportar", "Eliminar"]) expect(screen.getByRole("menuitem", { name })).toBeTruthy();
    expect(screen.getByText("⌘P").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Barra lateral" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Exportar" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("con trigger, el menú se etiqueta por el botón expandido", () => {
    render(<DropdownMenu label="Mi cuenta" trigger="Opciones" items={items} />);
    const trigger = screen.getByRole("button", { name: "Opciones" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByRole("menu", { name: "Opciones" }).id).toBe(trigger.getAttribute("aria-controls"));
  });

  it("navega con flechas saltando los desactivados y no activa los desactivados", () => {
    render(<DropdownMenu label="Mi cuenta" items={items} />);
    const menu = screen.getByRole("menu");
    const profile = screen.getByRole("menuitem", { name: "Perfil" });
    expect(profile.tabIndex).toBe(0);
    profile.focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitemcheckbox", { name: "Barra lateral" }));
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Eliminar" }));
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(profile);
    fireEvent.click(screen.getByRole("menuitem", { name: "Exportar" }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(profile);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
