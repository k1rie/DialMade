import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { testimonialsSection } from "./definition";

describe("landing.testimonials", () => {
  it("tres citas con autor, cargo, empresa y valoración", () => {
    const { container } = renderSection(testimonialsSection, { locale: "es" });
    const quotes = container.querySelectorAll("blockquote");
    expect(quotes).toHaveLength(3);
    expect(quotes[0]?.textContent).toMatch(/^«.+»$/);
    expect(screen.getAllByRole("img", { name: "Valoración: 5 de 5" })).toHaveLength(3);
    const first = container.querySelector("figcaption") as HTMLElement;
    expect(within(first).getByText(/·/)).toBeTruthy();
  });

  it("cita destacada: la primera fuera de la rejilla y las demás en tarjetas", () => {
    const { container } = renderSection(testimonialsSection, { variant: "spotlight", locale: "en", props: { showRating: false } });
    expect(container.querySelector(".dl-landing-quotes__spotlight blockquote")?.textContent).toMatch(/^“.+”$/);
    expect(container.querySelector(".dl-landing-quotes__list")?.children).toHaveLength(2);
    expect(screen.queryByRole("img", { name: /Rated/ })).toBeNull();
    expect(container.querySelector('[data-dl-prop="items/1/quote"]')).toBeTruthy();
  });

  it("productos de consumo: sin empresa en el cargo", () => {
    const { props } = renderSection(testimonialsSection, { productType: "e-commerce" });
    for (const item of props.items as { company: string }[]) expect(item.company).toBe("");
  });
});
