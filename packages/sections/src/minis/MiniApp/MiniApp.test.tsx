import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { contentContextFromDoc } from "../../context";
import { acmeDoc } from "../../testing/fixtures";
import { MiniApp } from "./MiniApp";
import { MINI_BARS } from "./miniData";

describe("MiniApp", () => {
  it("sidebar, 3 KPIs, barras chart-1..3 y 2 filas con badges de éxito y aviso", () => {
    const { container } = render(<MiniApp ctx={contentContextFromDoc(acmeDoc())} />);
    expect(screen.getByRole("img", { name: "Dashboard & components preview: Acme Cloud" })).toBeTruthy();
    expect(container.querySelectorAll(".dl-mini-app__nav-item[data-active]")).toHaveLength(1);
    expect(container.querySelectorAll(".dl-mini-app__kpi")).toHaveLength(3);
    const series = [...container.querySelectorAll(".dl-mini-app__bar")].map((bar) => bar.getAttribute("data-series"));
    expect(series).toHaveLength(MINI_BARS.length);
    expect(new Set(series)).toEqual(new Set(["1", "2", "3"]));
    const badges = [...container.querySelectorAll(".dl-mini-app__badge")];
    expect(badges.map((badge) => badge.getAttribute("data-tone"))).toEqual(["success", "warning"]);
    expect(badges.map((badge) => badge.textContent)).toEqual(["Active", "Past due"]);
  });

  it("usa el logo y cae a etiquetas genéricas si el perfil no tiene aviso", () => {
    const ctx = contentContextFromDoc(acmeDoc({ productType: "developer-tool-ide", locale: "es" }), { logoUrl: "blob:logo" });
    const { container } = render(<MiniApp ctx={ctx} />);
    expect(container.querySelector('img[src="blob:logo"]')?.getAttribute("alt")).toBe("");
    expect([...container.querySelectorAll(".dl-mini-app__badge")].map((badge) => badge.textContent)).toEqual(["Listo", "Pendiente"]);
  });
});
