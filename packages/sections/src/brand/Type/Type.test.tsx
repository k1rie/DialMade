import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { brandDoc, renderSection } from "../testing/renderSection";
import { typeSection } from "./definition";

describe("brand.type", () => {
  it("specimen: familias del pairing, escala completa con tamaños reales y pesos", () => {
    renderSection(typeSection, { doc: brandDoc({ pairingId: "editorial-serif" }) });
    expect(screen.getByRole("heading", { level: 3, name: "Newsreader" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Inter" })).toBeTruthy();
    const scale = within(screen.getByRole("list", { name: "Escala tipográfica" }));
    const steps = scale.getAllByRole("listitem");
    expect(steps.map((step) => step.querySelector(".dl-brand-type-scale__name")?.textContent)).toEqual([
      "Display",
      "Título 1",
      "Título 2",
      "Título 3",
      "Cuerpo",
      "Pequeño",
      "Leyenda",
    ]);
    expect(steps[0]?.textContent).toContain("Acme Cloud");
    expect(steps[4]?.textContent).toMatch(/16 px · 1\.6 · 400/);
    expect(steps[0]?.textContent).toMatch(/\d+–\d+ px/);
    expect(screen.getByRole("heading", { level: 3, name: "Pesos" })).toBeTruthy();
  });

  it("muestra de display personalizada y variante solo escala", () => {
    const { container } = renderSection(typeSection, { variant: "scale", props: { sample: "Hola mundo", showGlyphs: false } });
    expect(screen.getByText("Hola mundo")).toBeTruthy();
    expect(container.querySelector(".dl-brand-type-font")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Caracteres" })).toBeNull();
    expect(container.querySelector(".dl-brand-type__pairing")?.textContent).toBe("Inter");
  });
});
