import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../testing/renderSection";
import { artDirectionSection } from "./definition";

describe("brand.artDirection", () => {
  it("moodboard: degradados, aplicaciones (minis) y qué hacer / evitar", () => {
    renderSection(artDirectionSection);
    expect(within(screen.getByRole("list", { name: "Degradados y texturas" })).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("img", { name: "Vista previa de Landing page: Acme Cloud" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Vista previa de Dashboard y componentes: Acme Cloud" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Haz" })).toBeTruthy();
    expect(screen.getByText(/Usa el primario/)).toBeTruthy();
  });

  it("normas editables: las reglas guardadas sustituyen a las de por defecto", () => {
    const { container } = renderSection(artDirectionSection, {
      variant: "guidelines",
      props: { dos: ["Fotos con luz natural"], donts: ["   "], showApplications: false },
    });
    expect(screen.getByText("Fotos con luz natural")).toBeTruthy();
    expect(screen.queryByText(/Usa el primario/)).toBeNull();
    expect(screen.getByText(/No pongas texto/)).toBeTruthy();
    expect(container.querySelectorAll(".dl-brand-dodont__visual").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: /Landing page/ })).toBeNull();
  });
});
