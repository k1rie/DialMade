import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { confirmDialogSection } from "./definition";

describe("app.confirmDialog", () => {
  it("modal destructivo con el elemento afectado", () => {
    const { container } = renderSection(confirmDialogSection, { productType: "e-commerce" });
    const dialog = screen.getByRole("dialog", { name: "¿Cancelar este pedido?" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(container.querySelector(".dl-app-confirm__subject")?.textContent).toMatch(/^#\d+ · \S+ \S+/);
    expect(screen.getByRole("button", { name: "Volver" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar pedido" }).getAttribute("data-variant")).toBe("destructive");
    expect(container.querySelector(".dl-dialog-preview")).toBeTruthy();
  });

  it("panel sin backdrop y acción no destructiva", () => {
    const { container } = renderSection(confirmDialogSection, { variant: "panel", locale: "en", props: { destructive: false, subject: "" } });
    expect(container.querySelector(".dl-dialog-preview")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(container.querySelector(".dl-app-confirm__subject")).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons.at(-1)?.getAttribute("data-variant")).toBe("primary");
  });
});
