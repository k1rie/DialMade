import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { footerSection } from "./definition";

describe("landing.footer", () => {
  it("columnas de enlaces, eslogan y línea legal con el año", () => {
    renderSection(footerSection, { locale: "es" });
    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: "Pie de página" });
    expect(within(nav).getAllByRole("list")).toHaveLength(3);
    expect(within(nav).getByRole("list", { name: "Legal" })).toBeTruthy();
    expect(within(footer).getByText("Ship faster, sleep better")).toBeTruthy();
    expect(within(footer).getByText("© 2026 Acme Cloud. Todos los derechos reservados.")).toBeTruthy();
  });

  it("una línea: marca, enlaces del producto y legales", () => {
    const { container } = renderSection(footerSection, { variant: "simple", locale: "en" });
    const links = [...container.querySelectorAll(".dl-landing-footer__inline a")].map((a) => a.textContent);
    expect(links).toEqual(["Product", "Pricing", "Customers", "Resources", "Privacy", "Terms", "Cookies"]);
  });

  it("énfasis audaz añade la marca gigante decorativa", () => {
    const { container } = renderSection(footerSection, { props: { emphasis: "bold" } });
    const wordmark = container.querySelector(".dl-landing-footer__wordmark") as HTMLElement;
    expect(wordmark.getAttribute("aria-hidden")).toBe("true");
    expect(wordmark.style.getPropertyValue("--_wm-chars")).toBe("10");
  });
});
