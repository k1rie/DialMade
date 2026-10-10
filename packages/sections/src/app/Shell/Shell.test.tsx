import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getProductType } from "@dialmade/catalog";
import { shellStyleFor } from "../content";
import { renderSection } from "../../testing/renderSection";
import { shellSection } from "./definition";

describe("app.shell", () => {
  it("pinta la navegación con la página actual, el título y las acciones", () => {
    renderSection(shellSection);
    const main = screen.getByRole("navigation", { name: "Navegación principal" });
    const links = within(main).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(4);
    expect(links[0]?.getAttribute("aria-current")).toBe("page");
    expect(within(main).queryByRole("link", { name: /Ajustes/ })).toBeNull();
    expect(within(screen.getByRole("navigation", { name: "Cuenta" })).getByRole("link", { name: /Ajustes/ })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Exportar/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Invitar al equipo/ })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeTruthy();
  });

  it("marca, plan y persona en la barra lateral", () => {
    const { container } = renderSection(shellSection, { locale: "en" });
    const switcher = screen.getByRole("button", { name: /Acme Cloud.*Pro plan/ });
    expect(switcher.getAttribute("aria-haspopup")).toBe("menu");
    expect(container.querySelector(".dl-app-shell__user-name")?.textContent).toMatch(/\S+ \S+/);
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy();
  });

  it("usa el logo cuando lo hay (decorativo: el nombre sigue en texto)", () => {
    const { container } = renderSection(shellSection, { logoUrl: "blob:logo" });
    const logos = container.querySelectorAll('img[src="blob:logo"]');
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) expect(logo.getAttribute("alt")).toBe("");
  });

  it.each(["sidebar", "inset", "rail"])("%s: barra lateral con la navegación", (variant) => {
    const { container } = renderSection(shellSection, { variant });
    expect(container.querySelector(".dl-app-shell__frame")?.getAttribute("data-variant")).toBe(variant);
    expect(container.querySelector(".dl-app-shell__sidebar")).toBeTruthy();
  });

  it("topnav: sin barra lateral, la navegación va en la barra superior", () => {
    const { container } = renderSection(shellSection, { variant: "topnav" });
    expect(container.querySelector(".dl-app-shell__sidebar")).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(nav.closest(".dl-app-shell__topbar")).toBeTruthy();
    expect(nav.querySelector('[data-orientation="horizontal"]')).toBeTruthy();
  });

  it("tono y densidad salen del Dashboard Style del producto", () => {
    expect(shellStyleFor({})).toEqual({ tone: "default", density: "comfortable" });
    expect(shellStyleFor(getProductType("developer-tool-ide")!)).toEqual({ tone: "inverted", density: "compact" });
    expect(shellStyleFor(getProductType("online-course-e-learning")!)).toEqual({ tone: "brand", density: "spacious" });
    expect(shellStyleFor({ dashboardStyle: "User Behavior Analytics" })).toEqual({ tone: "default", density: "comfortable" });
    const { container } = renderSection(shellSection, { productType: "developer-tool-ide" });
    const frame = container.querySelector(".dl-app-shell__frame");
    expect(frame?.getAttribute("data-tone")).toBe("inverted");
    expect(frame?.getAttribute("data-density")).toBe("compact");
  });

  it("los knobs cambian tono, densidad y búsqueda", () => {
    const { container } = renderSection(shellSection, { props: { tone: "brand", density: "spacious", showSearch: false } });
    const frame = container.querySelector(".dl-app-shell__frame");
    expect(frame?.getAttribute("data-tone")).toBe("brand");
    expect(frame?.getAttribute("data-density")).toBe("spacious");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
