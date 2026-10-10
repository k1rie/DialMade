import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("usa label como nombre accesible y es ghost por defecto", () => {
    render(<IconButton icon="search" label="Buscar" />);
    const button = screen.getByRole("button", { name: "Buscar" });
    expect(button.dataset.variant).toBe("ghost");
    expect(button.className).toContain("dl-icon-button");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("acepta forma redonda y variante", () => {
    render(<IconButton icon="plus" label="Añadir" variant="primary" round />);
    const button = screen.getByRole("button", { name: "Añadir" });
    expect(button.dataset.variant).toBe("primary");
    expect(button.hasAttribute("data-round")).toBe(true);
  });
});
