import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { featuresSection } from "./definition";

describe("landing.features", () => {
  it("rejilla con seis funciones por defecto, cada una con su h3", () => {
    const { props } = renderSection(featuresSection, { locale: "en" });
    const region = screen.getByRole("region", { name: String(props.title) });
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(within(region).getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(region.querySelector(".dl-landing-heading__eyebrow")?.textContent).toBe("Features");
  });

  it("count limita las funciones y bento añade el visual a la primera", () => {
    const { container } = renderSection(featuresSection, { variant: "bento", props: { count: 4 } });
    const list = container.querySelector(".dl-landing-features__list") as HTMLElement;
    expect(list.getAttribute("data-count")).toBe("4");
    expect(list.children).toHaveLength(4);
    expect(list.children[0]?.hasAttribute("data-lead")).toBe(true);
    expect(container.querySelectorAll(".dl-landing-feature-visual__bar")).toHaveLength(8);
    expect(container.querySelector(".dl-landing-feature-visual")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("un count fuera de rango o un icono desconocido vuelven al valor por defecto", () => {
    const { invalidKeys, props } = renderSection(featuresSection, {
      props: { count: 9, items: [{ icon: "rocket", title: "x", description: "y" }] },
    });
    expect(invalidKeys.sort()).toEqual(["count", "items"]);
    expect(props.count).toBe(6);
  });
});
