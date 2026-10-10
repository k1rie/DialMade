import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GALLERY_SECTIONS } from "@dialmade/ui";
import { renderSection } from "../../testing/renderSection";
import { componentGallerySection } from "./definition";
import { ESSENTIAL_SECTIONS, gallerySectionAnchor } from "./sections";

describe("app.componentGallery", () => {
  it("todas las secciones del kit, con índice que apunta a sus títulos", () => {
    const { container } = renderSection(componentGallerySection);
    expect(screen.getByRole("heading", { level: 2, name: "Componentes" })).toBeTruthy();
    expect(screen.getByText("Acme Cloud · UI kit")).toBeTruthy();
    const index = screen.getByRole("navigation", { name: "Índice de componentes" });
    const links = within(index).getAllByRole("link");
    expect(links).toHaveLength(GALLERY_SECTIONS.length);
    for (const link of links) {
      const target = link.getAttribute("href")!.slice(1);
      expect(container.querySelector(`#${target}`)?.tagName).toBe("H3");
    }
    expect(links[0]?.textContent).toBe("Botones");
  });

  it("lo esencial y sin índice", () => {
    const { container } = renderSection(componentGallerySection, { variant: "stacked", props: { scope: "essentials" }, locale: "en" });
    expect(screen.queryByRole("navigation", { name: "Component index" })).toBeNull();
    expect(container.querySelectorAll(".dl-gallery-section")).toHaveLength(ESSENTIAL_SECTIONS.length);
    expect(container.querySelector(`#${gallerySectionAnchor("charts")}`)).toBeNull();
  });
});
