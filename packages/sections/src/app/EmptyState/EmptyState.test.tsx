import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { emptyStateSection } from "./definition";

describe("app.emptyState", () => {
  it("copy del perfil: qué falta y la acción que lo llena", () => {
    renderSection(emptyStateSection, { productType: "e-commerce" });
    expect(screen.getByRole("heading", { level: 2, name: "Aún no hay pedidos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Añadir producto/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compartir tienda" })).toBeTruthy();
  });

  it("ilustrado: la ilustración es decorativa", () => {
    const { container } = renderSection(emptyStateSection, { variant: "illustrated", locale: "en", props: { secondaryAction: "" } });
    expect(container.querySelector(".dl-app-empty__art")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
