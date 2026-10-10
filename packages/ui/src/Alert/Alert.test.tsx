import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("los avisos urgentes son alert y el resto status", () => {
    render(
      <>
        <Alert variant="destructive" title="Error">
          No se pudo pagar
        </Alert>
        <Alert variant="info" title="Info">
          Hay novedades
        </Alert>
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("No se pudo pagar");
    expect(screen.getByRole("status").textContent).toContain("Hay novedades");
  });

  it("acepta acción, rol propio y sin icono", () => {
    const { container } = render(
      <Alert role="note" icon={false} action={<button type="button">Ver</button>} onDismiss={() => undefined}>
        Nota
      </Alert>,
    );
    expect(screen.getByRole("note")).toBeTruthy();
    expect(container.querySelector(".dl-alert__icon")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });
});
