import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../testing/renderSection";
import { componentsSection } from "./definition";

describe("brand.components", () => {
  it("vitrina: botones, formulario con error, etiquetas, tarjeta de plan y tabla corta", () => {
    renderSection(componentsSection);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Desactivado" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("textbox", { name: "Correo electrónico" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Empresa" }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("switch", { name: "Avisos por correo" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Equipo" })).toBeTruthy();
    expect(screen.getByRole("article")).toBeTruthy();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(5);
  });

  it("estados: matriz de componentes × 5 estados con nombres únicos", () => {
    renderSection(componentsSection, { variant: "states", locale: "en" });
    const matrix = within(screen.getByRole("table", { name: "Interactive states" }));
    expect(matrix.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Component",
      "Default",
      "Hover",
      "Focus",
      "Pressed",
      "Disabled",
    ]);
    expect(matrix.getAllByRole("button", { name: "Continue" }).length).toBe(25);
    expect(matrix.getByRole("textbox", { name: "Field · Focus" })).toBeTruthy();
    expect(matrix.getByRole("switch", { name: "Switch · Disabled" }).hasAttribute("disabled")).toBe(true);
  });

  it("sin tabla si se apaga", () => {
    renderSection(componentsSection, { props: { showTable: false } });
    expect(screen.queryByRole("table")).toBeNull();
  });
});
