import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { listSection } from "./definition";
import { fitList } from "./fit";

describe("ui.list", () => {
  it("filas de persona, detalle y hora; «Ver todo» en la cabecera", () => {
    const { container, props } = renderSection(listSection, { locale: "es" });
    expect(props.items).toHaveLength(12);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]?.querySelector(".dl-ui-list__meta")?.textContent).toBe("hace 4 min");
    expect(container.querySelectorAll(".dl-ui-list__avatar[aria-hidden='true'] .dl-avatar")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Ver todo/ }).getAttribute("href")).toBe("#");
  });

  it("simple sin avatares: punto de color; «con personas» siempre los muestra", () => {
    const simple = renderSection(listSection, { props: { showAvatars: false, count: 3, action: "" } });
    expect(simple.container.querySelectorAll(".dl-ui-list__dot")).toHaveLength(3);
    expect(screen.queryByRole("link")).toBeNull();
    const people = renderSection(listSection, { variant: "avatars", props: { showAvatars: false }, elementId: "b-people" });
    expect(people.container.querySelectorAll(".dl-ui-list__avatar")).toHaveLength(5);
  });

  it("fit: filas del chip (una cada 56 px, 3–8); landing a todo el ancho con marco de sección", () => {
    expect(fitList(fitInputFor("list", 4, 40))).toEqual({ props: { count: 4, frame: "card" } });
    expect(fitList(fitInputFor("list", 4, 80)).props?.count).toBe(8);
    expect(fitList(fitInputFor("list", 4, 10)).props?.count).toBe(3);
    expect(fitList(fitInputFor("list", 12, 40, { kind: "landing" })).props?.frame).toBe("section");
  });
});
