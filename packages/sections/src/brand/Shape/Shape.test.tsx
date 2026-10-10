import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { brandDoc, renderSection } from "../testing/renderSection";
import { shapeSection } from "./definition";

describe("brand.shape", () => {
  it("radios con sus px, elevación, bordes, espaciado y dials", () => {
    const { container } = renderSection(shapeSection, { doc: brandDoc({ recipeId: "glass" }) });
    const radii = [...container.querySelectorAll(".dl-brand-shape__radius")].map((el) => el.getAttribute("data-radius"));
    expect(radii).toEqual(["sm", "md", "lg", "xl", "full"]);
    expect(container.querySelectorAll(".dl-brand-shape__space")).toHaveLength(10);
    expect(screen.getByRole("meter", { name: "Densidad" }).getAttribute("aria-valuenow")).toBe("5");
    expect(screen.queryByText(/no usa sombras/)).toBeNull();
  });

  it("una receta plana lo explica; el resumen no lleva espaciado", () => {
    const { container } = renderSection(shapeSection, { doc: brandDoc({ recipeId: "minimal-swiss" }), variant: "summary" });
    expect(screen.getByText(/no usa sombras/)).toBeTruthy();
    expect(container.querySelector('[data-area="spacing"]')).toBeNull();
    expect(container.querySelector('[data-area="controls"]')).toBeTruthy();
    expect(container.querySelector('.dl-brand-shape__radius[data-radius="sm"]')?.textContent).toContain("0 px");
  });
});
