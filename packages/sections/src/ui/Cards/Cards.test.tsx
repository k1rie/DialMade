import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { cardsSection } from "./definition";
import { fitCards } from "./fit";

describe("ui.cards", () => {
  it("guarda 12 tarjetas y muestra `count`, con icono decorativo y título H3", () => {
    const { container, props } = renderSection(cardsSection, { productType: "e-commerce" });
    expect(props.items).toHaveLength(12);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(container.querySelector(".dl-ui-card__icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".dl-ui-cards")?.getAttribute("data-columns")).toBe("auto");
  });

  it("cifra: el título va antes que la cifra en el DOM; compactas sin descripción", () => {
    const { container } = renderSection(cardsSection, { variant: "stat", props: { count: 2 } });
    const card = container.querySelector(".dl-ui-card")!;
    expect([...card.children].map((el) => el.className)).toEqual(["dl-ui-card__body", "dl-ui-card__figure"]);
    const compact = renderSection(cardsSection, { variant: "compact", elementId: "b-compact" });
    expect(compact.container.querySelector(".dl-ui-card__text")).toBeNull();
  });

  it("enlace por tarjeta descrito por su título; el carrusel se puede desplazar con teclado", () => {
    const { container } = renderSection(cardsSection, { props: { action: "Ver más", mobile: "carousel", count: 4 }, locale: "es" });
    const links = screen.getAllByRole("link", { name: /Ver más/ });
    expect(links).toHaveLength(4);
    expect(document.getElementById(links[0]!.getAttribute("aria-describedby")!)?.tagName).toBe("H3");
    const scroller = container.querySelector(".dl-ui-cards__scroller")!;
    expect(scroller.getAttribute("tabindex")).toBe("0");
    expect(scroller.getAttribute("aria-label")).toBe("Tarjetas");
  });

  it("fit: ×N del chip, una columna cada 240 px (como mucho las tarjetas) y compactas si no caben", () => {
    expect(fitCards(fitInputFor("cards", 12, 30))).toEqual({
      variant: "feature",
      props: { count: 3, columns: "3", mobile: "one-column", frame: "plain" },
    });
    expect(fitCards(fitInputFor("cards", 12, 30, { note: "×8 en carrusel" })).props).toMatchObject({ count: 8, columns: "6", mobile: "carousel" });
    expect(fitCards(fitInputFor("cards", 3, 30, { count: 4 }))).toMatchObject({ variant: "compact", props: { count: 4, columns: "1" } });
    expect(fitCards(fitInputFor("cards", 12, 30, { kind: "landing" })).props?.frame).toBe("section");
  });
});
