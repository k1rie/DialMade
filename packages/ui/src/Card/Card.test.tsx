import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";

describe("Card", () => {
  it("compone cabecera, cuerpo y pie", () => {
    render(
      <Card as="article" aria-label="Plan">
        <CardHeader title="Plan Pro" description="Para equipos" action={<button type="button">Más</button>} />
        <CardBody>Contenido</CardBody>
        <CardFooter align="end" divider>
          Pie
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole("article", { name: "Plan" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Plan Pro" })).toBeTruthy();
    expect(screen.getByText("Para equipos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Más" })).toBeTruthy();
    const footer = screen.getByText("Pie");
    expect(footer.dataset.align).toBe("end");
    expect(footer.hasAttribute("data-divider")).toBe(true);
  });

  it("permite elegir el nivel del título y marcar la card como interactiva", () => {
    const { container } = render(
      <Card interactive>
        <CardHeader title="Plantilla" titleAs="h2" />
      </Card>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Plantilla" })).toBeTruthy();
    expect(container.querySelector(".dl-card")?.hasAttribute("data-interactive")).toBe(true);
  });
});
