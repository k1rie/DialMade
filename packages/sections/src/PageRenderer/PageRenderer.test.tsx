import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Page } from "@dialmade/doc";
import { buildDefaultPage } from "../buildPage";
import { acmeContent, acmeDoc, testRegistry } from "../testing/fixtures";
import { PageRenderer } from "./PageRenderer";

const landingPage = (): Page => buildDefaultPage("landing", acmeContent(), "minimal", { registry: testRegistry });

function brokenLandingPage(): Page {
  const page = landingPage();
  page.elements["features-1"]!.props = { explode: true };
  return page;
}

function renderLanding(props: Partial<Parameters<typeof PageRenderer>[0]> = {}) {
  return render(<PageRenderer doc={acmeDoc()} kind="landing" page={landingPage()} registry={testRegistry} {...props} />);
}

describe("PageRenderer", () => {
  it("envuelve cada elemento con data-dl-id y data-dl-type", () => {
    const { container } = renderLanding();
    const page = container.querySelector(".dl-page");
    expect(page?.getAttribute("data-dl-kind")).toBe("landing");
    expect(page?.getAttribute("data-dl-id")).toBe("root");
    const hero = container.querySelector('[data-dl-id="hero-1"]');
    expect(hero?.getAttribute("data-dl-type")).toBe("landing.hero");
    expect(hero?.classList.contains("dl-el--landing-hero")).toBe(true);
    expect(within(hero as HTMLElement).getByRole("heading", { level: 1 })).toBeTruthy();
    expect(container.querySelector("#hero-1-header")).toBeTruthy();
  });

  it("resuelve los bindings con la marca actual", () => {
    const doc = acmeDoc();
    const page = landingPage();
    const { rerender } = render(<PageRenderer doc={doc} kind="landing" page={page} registry={testRegistry} />);
    expect(screen.getByRole("link", { name: "Acme Cloud" })).toBeTruthy();
    expect(screen.getByTestId("tagline").textContent).toBe("Ship faster, sleep better");
    const renamed = { ...doc, brand: { ...doc.brand, name: "Nimbus" } };
    rerender(<PageRenderer doc={renamed} kind="landing" page={page} registry={testRegistry} />);
    expect(screen.getByRole("link", { name: "Nimbus" })).toBeTruthy();
  });

  it("pasa variante, modo y props editadas; las props inválidas vuelven al valor por defecto", () => {
    const page = landingPage();
    page.elements["hero-1"]!.props = { variant: "split", title: "Hola", subtitle: 42 };
    renderLanding({ page, mode: "dark" });
    const header = screen.getByRole("banner");
    expect(header.getAttribute("data-variant")).toBe("split");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hola");
    expect(header.querySelector("p")?.textContent).not.toBe("");
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("una variante desconocida usa la primera", () => {
    const page = landingPage();
    page.elements["hero-1"]!.props = { variant: "nope" };
    renderLanding({ page });
    expect(screen.getByRole("banner").getAttribute("data-variant")).toBe("centered");
  });

  it("no pinta los elementos ocultos ni los excluidos", () => {
    const { container } = renderLanding({ page: { ...landingPage(), hidden: ["hero-1"] }, exclude: new Set(["navbar-1"]) });
    expect(container.querySelector('[data-dl-id="hero-1"]')).toBeNull();
    expect(container.querySelector('[data-dl-id="navbar-1"]')).toBeNull();
    expect(container.querySelector('[data-dl-id="cta-1"]')).toBeTruthy();
  });

  it("aísla una sección que falla y sigue pintando el resto", () => {
    const onSectionError = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderLanding({ page: brokenLandingPage(), interactive: true, onSectionError });
    spy.mockRestore();
    expect(onSectionError).toHaveBeenCalledWith("features-1", expect.any(Error));
    expect(screen.getByRole("alert").textContent).toContain("Features");
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("en modo estático una sección rota o sin registrar no deja rastro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = renderLanding({ page: brokenLandingPage() });
    spy.mockRestore();
    expect(container.querySelector('[data-dl-id="features-1"]')?.textContent).toBe("");
    expect(container.querySelector('[data-dl-id="cta-1"]')?.textContent).toBe("");
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("en modo edición avisa de las secciones sin registrar", () => {
    renderLanding({ interactive: true, locale: "es" });
    expect(screen.getAllByRole("note").map((note) => note.textContent)).toEqual(
      expect.arrayContaining(["Sección no disponible: landing.cta", "Sección no disponible: landing.footer"]),
    );
  });

  it("selecciona con clic, Enter y Espacio; marca la selección con aria-current", () => {
    const onSelect = vi.fn();
    const { rerender } = renderLanding({ interactive: true, onSelect, locale: "en" });
    const hero = screen.getByRole("group", { name: "Hero" });
    expect(hero.getAttribute("tabindex")).toBe("0");
    expect(hero.getAttribute("aria-roledescription")).toBe("editable section");

    fireEvent.click(screen.getByRole("heading", { level: 1 }));
    expect(onSelect).toHaveBeenLastCalledWith("hero-1");
    fireEvent.keyDown(screen.getByRole("group", { name: "Navbar" }), { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("navbar-1");
    fireEvent.keyDown(hero, { key: " " });
    expect(onSelect).toHaveBeenLastCalledWith("hero-1");
    onSelect.mockClear();
    fireEvent.keyDown(screen.getByRole("button", { name: /./ }), { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();

    rerender(
      <PageRenderer doc={acmeDoc()} kind="landing" page={landingPage()} registry={testRegistry} interactive onSelect={onSelect} selectedId="hero-1" />,
    );
    const selected = screen.getByRole("group", { name: "Hero" });
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.hasAttribute("data-dl-selected")).toBe(true);
    expect(screen.getByRole("group", { name: "Navbar" }).hasAttribute("aria-current")).toBe(false);
  });

  it("en modo edición los enlaces no navegan; en estático no hay foco ni roles extra", () => {
    const { unmount } = renderLanding({ interactive: true });
    const link = screen.getByRole("link", { name: "Acme Cloud" });
    expect(fireEvent.click(link)).toBe(false);
    unmount();
    renderLanding();
    expect(screen.queryByRole("group")).toBeNull();
    expect(document.querySelector('[data-dl-id="hero-1"]')?.hasAttribute("tabindex")).toBe(false);
  });

  it("en modo edición el contenido de cada sección es inert (una parada de tabulación por sección)", () => {
    const { container, unmount } = renderLanding({ interactive: true, locale: "en" });
    const hero = screen.getByRole("group", { name: "Hero" });
    expect(hero.closest("[inert]")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).closest("[inert]")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Acme Cloud" }).closest("[inert]")).toBeTruthy();
    expect(container.querySelector(".dl-page")?.getAttribute("lang")).toBe("en");
    unmount();
    const { container: staticPage } = renderLanding();
    expect(staticPage.querySelector("[inert]")).toBeNull();
  });

  it("las secciones contenedoras reciben sus hijos y se selecciona el más interno", () => {
    const onSelect = vi.fn();
    const doc = acmeDoc();
    const page = buildDefaultPage("app", acmeContent(doc), undefined, { registry: testRegistry });
    render(<PageRenderer doc={doc} kind="app" page={page} registry={testRegistry} interactive onSelect={onSelect} />);
    const main = screen.getByRole("main");
    const kpis = within(main).getByRole("list", { name: "kpis" });
    expect(kpis.querySelectorAll("li")).toHaveLength(4);
    fireEvent.click(kpis);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("kpi-row-1");
    const shell = screen.getByRole("group", { name: /shell|marco/i });
    expect(shell.closest("[inert]")).toBeNull();
    expect(kpis.closest('[data-dl-id="kpi-row-1"]')?.closest("[inert]")).toBeNull();
  });

  it("sin page usa doc.pages[kind] o construye la página por defecto", () => {
    const { container } = render(<PageRenderer doc={acmeDoc()} kind="brand" registry={testRegistry} />);
    expect([...container.querySelectorAll("[data-dl-type]")].map((el) => el.getAttribute("data-dl-type"))).toContain("brand.palette");
  });
});
