import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { navbarSection } from "./definition";

describe("landing.navbar", () => {
  it("pinta la marca, los enlaces y la llamada a la acción", () => {
    const { container } = renderSection(navbarSection, { locale: "es" });
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: "Acme Cloud" })).toBeTruthy();
    const links = container.querySelector(".dl-landing-navbar__links") as HTMLElement;
    expect(within(links).getAllByRole("link").map((a) => a.textContent)).toEqual(["Producto", "Precios", "Clientes", "Recursos"]);
    expect(container.querySelector('[data-dl-prop="ctaLabel"]')?.textContent).toBe("Empieza gratis");
    expect(container.querySelector('[data-dl-prop="secondaryLabel"]')?.textContent).toBe("Iniciar sesión");
    expect(screen.getByRole("banner").getAttribute("data-variant")).toBe("bar");
  });

  it("el menú móvil es un details con nombre accesible y se cierra al elegir un enlace", () => {
    const { container } = renderSection(navbarSection, { locale: "en", variant: "floating" });
    const details = container.querySelector("details") as HTMLDetailsElement;
    expect(within(details.querySelector("summary") as HTMLElement).getByText("Menu")).toBeTruthy();
    details.open = true;
    fireEvent.click(within(details.querySelector(".dl-landing-navbar__panel") as HTMLElement).getByText("Pricing"));
    expect(details.open).toBe(false);
    expect(screen.getByRole("banner").getAttribute("data-variant")).toBe("floating");
  });

  it("sin acción secundaria no la pinta y el énfasis cambia el botón", () => {
    const { container } = renderSection(navbarSection, { props: { secondaryLabel: "", emphasis: "bold" } });
    expect(container.querySelector('[data-dl-prop="secondaryLabel"]')).toBeNull();
    expect(container.querySelector('[data-dl-prop="ctaLabel"]')?.getAttribute("data-variant")).toBe("cta");
  });

  it("el espaciado cambia la altura de la barra (no el relleno de sección)", () => {
    renderSection(navbarSection, { props: { spacing: "roomy" } });
    const header = screen.getByRole("banner");
    expect(header.getAttribute("data-spacing")).toBe("roomy");
    expect(header.getAttribute("data-padding")).toBe("none");
    expect(header.querySelectorAll('[data-dl-prop^="links/"]')).toHaveLength(4);
  });

  it("usa el logo cuando lo hay", () => {
    const { container } = renderSection(navbarSection, { logoUrl: "blob:logo" });
    expect(container.querySelector('img[src="blob:logo"]')).toBeTruthy();
  });
});
