import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { textSection } from "./definition";
import { fitText } from "./fit";

describe("ui.text", () => {
  it("encabezado: antetítulo, H2, párrafo y la acción como enlace", () => {
    const { container } = renderSection(textSection, { locale: "es" });
    const heading = screen.getByRole("heading", { level: 2 });
    expect(container.querySelector("section")?.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(container.querySelector(".dl-ui-text__eyebrow")?.textContent).toBeTruthy();
    expect(container.querySelectorAll(".dl-ui-text__paragraph")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("#");
  });

  it("nivel, cuerpo y acción salen de sus props; los párrafos se separan con una línea en blanco", () => {
    const { container } = renderSection(textSection, {
      variant: "prose",
      props: { level: "h1", body: "Uno.\n\nDos.\n\n\nTres.", showAction: false },
    });
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect([...container.querySelectorAll(".dl-ui-text__paragraph")].map((p) => p.textContent)).toEqual(["Uno.", "Dos.", "Tres."]);
    expect(screen.queryByRole("link")).toBeNull();
    renderSection(textSection, { props: { showBody: false, title: "Solo título" }, elementId: "b-two" });
    expect(screen.getAllByRole("heading", { name: "Solo título" })).toHaveLength(1);
  });

  it("destacado: icono decorativo y sin antetítulo", () => {
    const { container } = renderSection(textSection, { variant: "callout", locale: "en" });
    expect(container.querySelector(".dl-ui-text__icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".dl-ui-text__eyebrow")).toBeNull();
  });

  it("fit: una línea solo cabe el título; a todo el ancho en landing, marco de sección centrado", () => {
    expect(fitText(fitInputFor("text", 6, 8)).props).toMatchObject({ showBody: false, showAction: false, frame: "plain" });
    expect(fitText(fitInputFor("text", 12, 30, { kind: "landing" }))).toMatchObject({
      variant: "heading",
      props: { showBody: true, showAction: true, frame: "section", align: "center", level: "h2" },
    });
    expect(fitText(fitInputFor("text", 6, 50)).variant).toBe("prose");
    expect(fitText(fitInputFor("text", 12, 30, { kind: "app" })).props?.frame).toBe("plain");
  });
});
