import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { featureList, heroCopy } from "../../content";
import { contentContextFromDoc } from "../../context";
import { acmeDoc } from "../../testing/fixtures";
import { MiniLanding } from "./MiniLanding";

describe("MiniLanding", () => {
  it("nav, titular del producto, CTA y tres tarjetas, todo dentro de una sola imagen accesible", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { locale: "es" });
    const { container } = render(<MiniLanding ctx={ctx} />);
    const image = screen.getByRole("img", { name: "Vista previa de Landing page: Acme Cloud" });
    expect(image.querySelector(".dl-mini-landing__title")?.textContent).toBe(heroCopy(ctx).title);
    expect(image.querySelector(".dl-mini-landing__cta")?.textContent).toBe(heroCopy(ctx).primaryCta);
    expect([...container.querySelectorAll(".dl-mini-landing__card-title")].map((node) => node.textContent)).toEqual(
      featureList(ctx, 3).map((feature) => feature.title),
    );
    // Same monogram as the style guide and the dashboard shell.
    expect(container.querySelector(".dl-mini-landing__mark")?.textContent).toBe("AC");
  });

  it("usa el logo cuando lo hay", () => {
    const ctx = contentContextFromDoc(acmeDoc(), { logoUrl: "blob:logo" });
    const { container } = render(<MiniLanding ctx={ctx} />);
    expect(container.querySelector('img[src="blob:logo"]')?.getAttribute("alt")).toBe("");
    expect(container.querySelector(".dl-mini-landing__mark")).toBeNull();
  });
});
