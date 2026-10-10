import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { mediaSection } from "./definition";
import { fitMedia } from "./fit";

describe("ui.media", () => {
  it("arte solo CSS con nombre accesible y la proporción como variable", () => {
    const { container } = renderSection(mediaSection, { props: { ratio: "4:3" } });
    const art = screen.getByRole("img");
    expect(art.getAttribute("aria-label")).toBe("Vista del producto de Acme Cloud");
    expect((art as HTMLElement).style.getPropertyValue("--_ui-ratio")).toBe("4 / 3");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("sin texto alternativo es decorativo; el pie de imagen va en figcaption", () => {
    const { container } = renderSection(mediaSection, { variant: "device", props: { alt: " ", caption: "Panel de pedidos" } });
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector(".dl-ui-media__art")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("figure > figcaption")?.textContent).toBe("Panel de pedidos");
    expect(container.querySelector(".dl-ui-media__device")).toBeTruthy();
  });

  it("navegador: ventana con barra", () => {
    const { container } = renderSection(mediaSection, { variant: "browser", locale: "en" });
    expect(container.querySelectorAll(".dl-ui-media__dot")).toHaveLength(3);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Acme Cloud product preview");
  });

  it("fit: la proporción del chip; vertical → teléfono, horizontal → navegador, cuadrada → degradado", () => {
    expect(fitMedia(fitInputFor("media", 12, 40))).toEqual({ variant: "browser", props: { ratio: "21:9", frame: "plain" } });
    expect(fitMedia(fitInputFor("media", 3, 60))).toMatchObject({ variant: "device", props: { ratio: "3:4" } });
    expect(fitMedia(fitInputFor("media", 6, 90))).toMatchObject({ variant: "gradient", props: { ratio: "1:1" } });
    expect(fitMedia(fitInputFor("media", 12, 60, { kind: "landing" })).props?.frame).toBe("section");
  });
});
