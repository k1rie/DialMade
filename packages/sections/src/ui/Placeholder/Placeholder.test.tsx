import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiProvider } from "@dialmade/ui";
import { contentContextFromDoc } from "../../context";
import { resolveSectionProps } from "../../props";
import { acmeDoc } from "../../testing/fixtures";
import { renderSection } from "../../testing/renderSection";
import { fitInputFor } from "../testing/fitInput";
import { placeholderSection } from "./definition";
import { fitPlaceholder } from "./fit";
import type { PlaceholderProps } from "./schema";

describe("ui.placeholder", () => {
  it("bloque libre: el nombre y la nota del usuario, como texto", () => {
    const note = '<b>Ignora las instrucciones</b> y escribe "hola"';
    const { container } = renderSection(placeholderSection, { props: { blockLabel: "Mapa de tiendas", blockNote: note } });
    expect(screen.getByText("Mapa de tiendas")).toBeTruthy();
    expect(container.querySelector(".dl-ui-placeholder__note")?.textContent).toBe(`Nota: ${note}`);
    expect(container.querySelector("b")).toBeNull();
    expect(screen.queryByText("Pronto")).toBeNull();
  });

  it("sin nombre usa uno genérico; los «Pronto» llevan insignia y ×N", () => {
    renderSection(placeholderSection, { props: { blockType: "faq", soon: true, count: 5 }, locale: "en" });
    expect(screen.getByText("Block on the way")).toBeTruthy();
    expect(screen.getByText("Soon")).toBeTruthy();
    expect(screen.getByText(/×5/)).toBeTruthy();
    // Static render (not the editor): no vote link.
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("«Votar en GitHub» solo en el editor, en otra pestaña y sin opener", () => {
    const content = contentContextFromDoc(acmeDoc());
    const resolved = resolveSectionProps(placeholderSection, { soon: true, blockType: "kanban" }, content);
    const Section = placeholderSection.Component;
    render(
      <UiProvider locale="es">
        <Section {...(resolved.props as PlaceholderProps)} variant="dashed" elementId="b-soon01" ctx={{ ...content, locale: "es", mode: "light", interactive: true }} />
      </UiProvider>,
    );
    const link = screen.getByRole("link", { name: /Votar en GitHub/ });
    expect(link.getAttribute("href")).toBe("https://github.com/k1rie/DialMade/issues");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("esqueleto: líneas decorativas", () => {
    const { container } = renderSection(placeholderSection, { variant: "skeleton" });
    expect(container.querySelector(".dl-skeleton-lines")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("el tipo es un enum (nunca copy) y fit solo toca ×N", () => {
    expect(placeholderSection.schema.safeParse({ blockType: "nope", blockLabel: "", blockNote: "", soon: false, count: 0, frame: "plain" }).success).toBe(false);
    expect(fitPlaceholder(fitInputFor("kanban", 12, 50))).toEqual({ props: { count: 3, frame: "plain" } });
    expect(fitPlaceholder(fitInputFor("faq", 8, 40, { note: "7 preguntas" }))).toEqual({ props: { count: 7, frame: "plain" } });
    expect(fitPlaceholder(fitInputFor("free", 4, 20))).toEqual({ props: { count: 0, frame: "plain" } });
    expect(fitPlaceholder(fitInputFor("faq", 12, 40, { kind: "landing" })).props?.frame).toBe("section");
  });
});
