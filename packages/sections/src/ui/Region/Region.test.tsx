import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import { acmeDoc } from "../../testing/fixtures";
import type { RenderContext } from "../../types";
import { fitInputFor } from "../testing/fitInput";
import { regionSection } from "./definition";
import { fitRegion } from "./fit";
import { Region } from "./Region";

const ctx: RenderContext = { ...contentContextFromDoc(acmeDoc()), mode: "light", interactive: false };
const base = { padding: "none", layout: "stack", screenKind: "landing" } as const;

describe("ui.region", () => {
  it("scope: el elemento .dl-layout con el tipo de pantalla, y los hijos dentro", () => {
    const { container } = render(
      <Region {...base} role="scope" screenKind="app" variant="plain" ctx={ctx} elementId="layout">
        <div data-dl-id="b-one" />
      </Region>,
    );
    const scope = container.firstElementChild!;
    expect(scope.className).toBe("dl-layout");
    expect(scope.getAttribute("data-dl-kind")).toBe("app");
    expect(scope.firstElementChild?.getAttribute("data-dl-id")).toBe("b-one");
  });

  it("inferida y contenedor no añaden caja: sus hijos quedan como hijos directos del wrapper", () => {
    for (const role of ["inferred", "group"] as const) {
      const { container, unmount } = render(
        <Region {...base} role={role} variant="card" ctx={ctx} elementId="r-x">
          <div data-dl-id="b-one" />
          <div data-dl-id="b-two" />
        </Region>,
      );
      expect([...container.children].map((el) => el.getAttribute("data-dl-id"))).toEqual(["b-one", "b-two"]);
      unmount();
    }
  });

  it("es contenedor, sin hijos por defecto, y un bloque «Contenedor» siempre es grupo", () => {
    expect(regionSection.container).toBe(true);
    expect(regionSection.defaultChildren).toBeUndefined();
    expect(fitRegion(fitInputFor("container", 12, 40))).toEqual({ props: { role: "group" } });
  });
});
