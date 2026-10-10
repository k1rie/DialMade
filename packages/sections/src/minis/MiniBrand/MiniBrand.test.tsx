import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import { acmeDoc } from "../../testing/fixtures";
import { MiniBrand } from "./MiniBrand";

describe("MiniBrand", () => {
  it("logo sobre claro, oscuro y marca, cinco muestras, «Aa» y dos botones", () => {
    const { container } = render(<MiniBrand ctx={contentContextFromDoc(acmeDoc(), { locale: "es" })} />);
    expect(screen.getByRole("img", { name: "Vista previa de Guía de estilo: Acme Cloud" })).toBeTruthy();
    expect([...container.querySelectorAll(".dl-mini-brand__tile")].map((el) => el.getAttribute("data-surface"))).toEqual([
      "light",
      "dark",
      "brand",
    ]);
    expect(container.querySelectorAll(".dl-mini-brand__swatch")).toHaveLength(5);
    expect(container.querySelector(".dl-mini-brand__aa")?.textContent).toBe("Aa");
    expect(container.querySelectorAll(".dl-mini-brand__button")).toHaveLength(2);
    expect(container.querySelector(".dl-brand-mark__word")?.textContent).toBe("Acme Cloud");
  });

  it("con logo lo pinta en las tres superficies", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { logoUrl: "blob:logo" });
    const { container } = render(<MiniBrand ctx={ctx} />);
    expect(container.querySelectorAll('.dl-mini-brand__tile img[src="blob:logo"]')).toHaveLength(3);
  });
});
