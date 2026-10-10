import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../testing/renderSection";
import { identitySection } from "./definition";

describe("brand.identity", () => {
  it("muestra el logo sobre claro, oscuro y marca, con zona de respeto, tamaños y versiones", () => {
    const { container } = renderSection(identitySection);
    expect(screen.getByRole("heading", { level: 2, name: "El logo en cada superficie" })).toBeTruthy();
    expect([...container.querySelectorAll(".dl-brand-identity__surface")].map((el) => el.getAttribute("data-surface"))).toEqual([
      "light",
      "dark",
      "brand",
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Zona de respeto" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Tamaño mínimo" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Versiones" })).toBeTruthy();
    expect(container.querySelector(".dl-board-section__number")?.textContent).toBe("01");
  });

  it("con logo subido usa la imagen y no inventa versiones", () => {
    const { container } = renderSection(identitySection, { logoUrl: "blob:logo" });
    const surfaces = container.querySelectorAll('.dl-brand-identity__surface img[src="blob:logo"]');
    expect(surfaces).toHaveLength(3);
    expect(screen.getAllByRole("img", { name: "Acme Cloud" })).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "Versiones" })).toBeNull();
  });

  it("destacado y sin reglas", () => {
    const { container } = renderSection(identitySection, {
      variant: "spotlight",
      props: { showClearSpace: false, showSizes: false, title: "Nuestro logo" },
    });
    expect(container.querySelector('[data-layout="spotlight"]')).toBeTruthy();
    expect(container.querySelector(".dl-brand-identity__rules")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Nuestro logo" })).toBeTruthy();
  });
});
