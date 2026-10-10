import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { COMPANY_NAMES } from "../../content";
import { renderSection } from "../../testing/renderSection";
import { socialProofSection } from "./definition";
import { FictionalLogo } from "./FictionalLogo";

describe("landing.socialProof", () => {
  it("muro de logotipos ficticios con el título como nombre de la sección", () => {
    const { props } = renderSection(socialProofSection, { locale: "es" });
    const region = screen.getByRole("region", { name: String(props.title) });
    const list = within(region).getByRole("list", { name: "Logotipos" });
    const names = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(names).toHaveLength(6);
    for (const name of names) expect(COMPANY_NAMES).toContain(name);
    expect(region.querySelector("dl")).toBeNull();
  });

  it("las cifras aparecen con showStats y siempre en la variante de métricas", () => {
    const withStats = renderSection(socialProofSection, { props: { showStats: true } });
    expect(withStats.container.querySelectorAll(".dl-landing-proof__stat")).toHaveLength(3);
    withStats.unmount();
    const { container } = renderSection(socialProofSection, { variant: "metrics", locale: "en" });
    const values = [...container.querySelectorAll("dd")].map((dd) => dd.textContent);
    expect(values).toEqual(["12,000+", "99.95%", "4.8/5"]);
    expect(container.querySelector("dl")?.compareDocumentPosition(container.querySelector("ul") as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("los productos de consumo citan publicaciones ficticias", () => {
    const { container } = renderSection(socialProofSection, { productType: "e-commerce", locale: "es" });
    expect(container.textContent).toMatch(/Revista|Diario|Gaceta|Cuaderno|Hoja|Faro/);
  });

  it("FictionalLogo es determinista: mismo nombre, misma marca", () => {
    const a = render(<FictionalLogo name="Nimbo" />).container.innerHTML;
    const b = render(<FictionalLogo name="Nimbo" />).container.innerHTML;
    expect(a).toBe(b);
    expect(a).toContain("Nimbo");
    expect(a).toContain('aria-hidden="true"');
  });
});
