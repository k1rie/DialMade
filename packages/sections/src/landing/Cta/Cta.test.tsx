import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { ctaSection } from "./definition";

describe("landing.cta", () => {
  it("panel con título h2 que nombra la sección y dos botones", () => {
    const { container, props } = renderSection(ctaSection, { locale: "en" });
    expect(screen.getByRole("region", { name: String(props.title) })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(props.title);
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(container.querySelector(".dl-landing-cta")?.getAttribute("data-emphasis")).toBe("bold");
  });

  it("con formulario: campo de correo etiquetado y envío bloqueado", () => {
    renderSection(ctaSection, { variant: "split", locale: "es", props: { showForm: true } });
    const input = screen.getByRole("textbox", { name: "Correo electrónico" });
    expect(input.getAttribute("type")).toBe("email");
    const form = input.closest("form") as HTMLFormElement;
    const submit = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, submit);
    expect(submit.defaultPrevented).toBe(true);
  });

  it("las tiendas usan el formulario por defecto", () => {
    const { props } = renderSection(ctaSection, { productType: "e-commerce" });
    expect(props.showForm).toBe(true);
  });

  it("el botón usa cta solo con énfasis «bold» (sobre el panel primario) y primary en el resto", () => {
    const variantOf = (container: HTMLElement) => container.querySelector('[data-dl-prop="button"]')?.closest("a")?.getAttribute("data-variant");
    expect(variantOf(renderSection(ctaSection, { locale: "es" }).container)).toBe("cta");
    expect(variantOf(renderSection(ctaSection, { locale: "es", props: { emphasis: "default" } }).container)).toBe("primary");
  });
});
