import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("muestra el texto con variante y apariencia", () => {
    render(
      <Badge variant="success" appearance="solid" dot>
        Activo
      </Badge>,
    );
    const badge = screen.getByText("Activo");
    expect(badge.dataset.variant).toBe("success");
    expect(badge.dataset.appearance).toBe("solid");
    expect(badge.querySelector(".dl-badge__dot")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("por defecto es suave", () => {
    render(<Badge>Nuevo</Badge>);
    const badge = screen.getByText("Nuevo");
    expect(badge.dataset.variant).toBe("default");
    expect(badge.dataset.appearance).toBe("soft");
  });
});
