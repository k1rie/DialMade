import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import { acmeDoc } from "../../testing/fixtures";
import { SketchApp } from "../SketchApp";
import { SketchBrand } from "../SketchBrand";
import { SketchLanding } from "../SketchLanding";

describe("sketches", () => {
  it.each([
    ["es", SketchBrand, "Esquema de Guía de estilo con los colores de Acme Cloud (no es el diseño final)"],
    ["es", SketchLanding, "Esquema de Landing page con los colores de Acme Cloud (no es el diseño final)"],
    ["es", SketchApp, "Esquema de Dashboard y componentes con los colores de Acme Cloud (no es el diseño final)"],
    ["en", SketchBrand, "Style guide sketch in Acme Cloud's colors (not the final design)"],
    ["en", SketchLanding, "Landing page sketch in Acme Cloud's colors (not the final design)"],
    ["en", SketchApp, "Dashboard & components sketch in Acme Cloud's colors (not the final design)"],
  ] as const)("%s: %o dice que es un esquema", (locale, Sketch, name) => {
    render(<Sketch ctx={contentContextFromDoc(acmeDoc(), { locale })} />);
    expect(screen.getByRole("img", { name })).toBeTruthy();
  });

  it.each([SketchBrand, SketchLanding, SketchApp])("%o lleva la etiqueta «Esquema» y nombra las partes, sin copy real", (Sketch) => {
    const { container } = render(<Sketch ctx={contentContextFromDoc(acmeDoc(), { locale: "es" })} />);
    expect(container.querySelector(".dl-sketch__tag")?.textContent).toBe("Esquema");
    expect(container.querySelector(".dl-sketch__fill")).not.toBeNull();
  });

  it("el logo va en una placa clara para que se lea también en oscuro", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { logoUrl: "blob:logo" });
    const { container } = render(<SketchLanding ctx={ctx} />);
    const image = container.querySelector('img[src="blob:logo"]');
    expect(image?.getAttribute("alt")).toBe("");
    expect(image?.closest(".dl-sketch__logo-plate")?.hasAttribute("data-logo")).toBe(true);
  });

  it("sin logo, el monograma", () => {
    const { container } = render(<SketchApp ctx={contentContextFromDoc(acmeDoc())} />);
    expect(container.querySelector(".dl-sketch__logo-plate")?.textContent).toBe("AC");
  });

  it("SketchBrand pinta el logo en claro, oscuro y sobre la marca", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { logoUrl: "blob:logo" });
    const { container } = render(<SketchBrand ctx={ctx} />);
    expect(container.querySelectorAll('img[src="blob:logo"]')).toHaveLength(3);
  });

  it("SketchLanding nombra titular, acción principal y tres ventajas", () => {
    const { container } = render(<SketchLanding ctx={contentContextFromDoc(acmeDoc(), { locale: "en" })} />);
    expect(container.querySelector(".dl-sketch-landing__headline")?.textContent).toBe("Headline");
    expect(container.querySelector(".dl-sketch__fill")?.textContent).toBe("Main action");
    expect(container.querySelectorAll(".dl-sketch-landing__benefit")).toHaveLength(3);
  });
});
