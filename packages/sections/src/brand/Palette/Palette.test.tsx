import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyPatch } from "@dialmade/doc";
import { brandDoc, renderSection } from "../testing/renderSection";
import { paletteSection } from "./definition";

describe("brand.palette", () => {
  it("chips con hex de ambos modos, escalas 50–950 y resumen AA", () => {
    renderSection(paletteSection);
    const chips = within(screen.getByRole("list", { name: "Colores principales" }));
    const primary = chips.getByText("Primario").closest("li") as HTMLElement;
    expect(primary.textContent).toContain("--primary");
    expect(primary.textContent).toContain("#3A5BD9");
    expect(primary.textContent).toMatch(/Oscuro #[0-9A-F]{6}/);
    const brand = screen.getByRole("list", { name: "Marca" });
    expect(within(brand).getAllByRole("listitem")).toHaveLength(11);
    expect(brand.textContent).toContain("(paso ancla)");
    expect(screen.getByText(/Claro: 45\/45 pares AA/)).toBeTruthy();
  });

  it("tabla de roles y tabla de contraste del modo actual", () => {
    renderSection(paletteSection, { mode: "dark" });
    expect(screen.getByRole("table", { name: "Roles en claro y oscuro" })).toBeTruthy();
    const contrast = within(screen.getByRole("table", { name: "Contraste WCAG en modo oscuro" }));
    const row = contrast.getByRole("rowheader", { name: "Tinta sobre Papel" }).closest("tr") as HTMLElement;
    expect(row.textContent).toMatch(/\d+,\d+:1/);
    expect(row.textContent).toContain("Pasa");
  });

  it("recalcula el contraste cuando el doc sobrescribe colores", () => {
    const base = brandDoc();
    const patched = applyPatch(base, [{ op: "add", path: "/tokens/color/light/foreground", value: "#9a9a9a" }]);
    if (!patched.ok) throw new Error(patched.error.message);
    renderSection(paletteSection, { doc: patched.doc });
    const contrast = within(screen.getByRole("table", { name: "Contraste WCAG en modo claro" }));
    const row = contrast.getByRole("rowheader", { name: "Tinta sobre Papel" }).closest("tr") as HTMLElement;
    expect(row.textContent).toContain("Falla");
    expect(screen.getByText(/Claro: \d+\/45 pares AA/).textContent).not.toContain("45/45");
  });

  it("muestras: sin tablas; sin color secundario no hay fila CTA", () => {
    renderSection(paletteSection, { variant: "swatches", doc: brandDoc({ secondary: null }) });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("list", { name: "CTA" })).toBeNull();
    expect(screen.getByRole("list", { name: "Neutro" })).toBeTruthy();
  });
});
