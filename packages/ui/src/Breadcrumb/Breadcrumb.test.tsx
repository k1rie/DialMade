import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "../UiProvider";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("es un nav con lista y marca la página actual", () => {
    render(
      <UiProvider locale="es">
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Proyectos", href: "/p" }, { label: "Atlas" }]} />
      </UiProvider>,
    );
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Inicio", "Proyectos"]);
    expect(within(nav).getByText("Atlas").getAttribute("aria-current")).toBe("page");
  });
});
