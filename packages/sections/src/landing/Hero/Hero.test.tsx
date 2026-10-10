import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { heroSection } from "./definition";

describe("landing.hero", () => {
  it("titular h1 que nombra la sección, CTAs y nota", () => {
    const { container, props } = renderSection(heroSection, { locale: "es" });
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe(props.title);
    expect(screen.getByRole("region", { name: String(props.title) })).toBeTruthy();
    expect(container.querySelector('[data-dl-prop="primaryCta"]')?.textContent).toBe("Empieza gratis");
    expect(container.querySelector('[data-dl-prop="note"]')?.textContent).toContain("Sin tarjeta");
  });

  it("centrada: maqueta del producto decorativa e inerte con los datos del producto", () => {
    const { container } = renderSection(heroSection, { locale: "en" });
    const mockup = container.querySelector(".dl-landing-mockup") as HTMLElement;
    expect(mockup.getAttribute("aria-hidden")).toBe("true");
    expect(mockup.hasAttribute("inert")).toBe(true);
    expect(mockup.querySelectorAll(".dl-stat")).toHaveLength(3);
    expect(mockup.querySelector(".dl-chart, svg")).toBeTruthy();
    expect(mockup.textContent).toContain("app.acmecloud.com");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("partida: collage en vez de ventana", () => {
    const { container } = renderSection(heroSection, { variant: "split" });
    expect(container.querySelector(".dl-landing-collage")).toBeTruthy();
    expect(container.querySelector(".dl-landing-mockup")).toBeNull();
  });

  it("tiendas y medios usan la galería; «none» quita el visual", () => {
    const shop = renderSection(heroSection, { productType: "e-commerce" });
    expect(shop.props.visual).toBe("gallery");
    expect(shop.container.querySelectorAll(".dl-landing-tile")).toHaveLength(4);
    shop.unmount();
    const { container } = renderSection(heroSection, { props: { visual: "none", eyebrow: "", secondaryCta: "", note: "" } });
    expect(container.querySelector(".dl-landing-hero__visual")).toBeNull();
    expect(container.querySelector(".dl-landing-hero__eyebrow")).toBeNull();
    expect(container.querySelector('[data-dl-prop="secondaryCta"]')).toBeNull();
  });
});
