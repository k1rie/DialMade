import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { brandDoc, renderSection } from "../testing/renderSection";
import { coverSection } from "./definition";

describe("brand.cover", () => {
  it("pinta el nombre (h1), la tagline, el índice y la ficha", () => {
    renderSection(coverSection);
    expect(screen.getByRole("heading", { level: 1, name: "Acme Cloud" })).toBeTruthy();
    expect(screen.getByText("Ship faster, sleep better")).toBeTruthy();
    const index = within(screen.getByRole("navigation", { name: "Índice de la guía" }));
    expect(index.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "01 Identidad",
      "02 Paleta",
      "03 Tipografía",
      "04 Formas",
      "05 Componentes",
      "06 Dirección de arte",
    ]);
    const facts = screen.getByLabelText("Ficha de la marca");
    expect(facts.textContent).toContain("#3A5BD9");
    expect(facts.textContent).toContain("Inter");
  });

  it("sigue a la marca: renombrar el doc cambia el nombre (binding)", () => {
    const doc = brandDoc();
    renderSection(coverSection, { doc: { ...doc, brand: { ...doc.brand, name: "Nimbus" } } });
    expect(screen.getByRole("heading", { level: 1, name: "Nimbus" })).toBeTruthy();
  });

  it("sin tagline no deja un párrafo vacío y el antetítulo sigue al idioma", () => {
    const { container } = renderSection(coverSection, { doc: brandDoc({ tagline: null, locale: "en" }) });
    expect(container.querySelector(".dl-brand-cover__tagline")).toBeNull();
    expect(screen.getByText("Style guide")).toBeTruthy();
  });

  it("centrada: usa el logo cuando lo hay y oculta índice y ficha si se apagan", () => {
    const { container } = renderSection(coverSection, {
      variant: "centered",
      logoUrl: "blob:logo",
      props: { showIndex: false, showFacts: false },
    });
    expect(container.querySelector('[data-variant="centered"]')).toBeTruthy();
    expect(container.querySelector('img[src="blob:logo"]')).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(container.querySelector(".dl-brand-cover__facts")).toBeNull();
  });
});
