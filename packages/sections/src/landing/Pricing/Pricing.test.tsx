import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderSection } from "../../testing/renderSection";
import { pricingSection } from "./definition";
import { priceDisplay, yearlyMonthly } from "./price";

const values = (root: ParentNode) => [...root.querySelectorAll(".dl-landing-plan__value")].map((node) => node.textContent);

describe("landing.pricing", () => {
  it("tres planes con el destacado marcado y su etiqueta", () => {
    const { container } = renderSection(pricingSection, { locale: "es" });
    const plans = container.querySelectorAll(".dl-landing-plan");
    expect(plans).toHaveLength(3);
    expect(plans[1]?.hasAttribute("data-highlighted")).toBe(true);
    expect(within(plans[1] as HTMLElement).getByText("Más popular")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("el selector mensual/anual cambia los precios", () => {
    const { container } = renderSection(pricingSection, { locale: "en" });
    const group = screen.getByRole("group", { name: "Billing period" });
    const [monthly, yearly] = within(group).getAllByRole("button");
    expect(monthly?.getAttribute("aria-pressed")).toBe("true");
    const before = values(container);
    expect(before[0]).toBe("Free");
    fireEvent.click(yearly as HTMLElement);
    expect(yearly?.getAttribute("aria-pressed")).toBe("true");
    const after = values(container);
    expect(after[0]).toBe("Free");
    expect(after[1]).not.toBe(before[1]);
    expect(container.textContent).toContain("billed yearly");
  });

  it("precios de pago único: «desde» y sin selector", () => {
    const { container, props } = renderSection(pricingSection, { productType: "e-commerce", locale: "es" });
    expect(props.recurring).toBe(false);
    expect(screen.queryByRole("group")).toBeNull();
    expect(container.querySelector(".dl-landing-plan__prefix")?.textContent).toBe("desde");
  });

  it("variante lista con resumen: filas en vez de columnas", () => {
    const { container } = renderSection(pricingSection, { variant: "split", props: { billing: "yearly" } });
    expect(container.querySelectorAll('.dl-landing-plan[data-layout="row"]')).toHaveLength(3);
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toMatch(/^Anual/);
  });

  it("priceDisplay redondea el mensual del plan anual", () => {
    expect(yearlyMonthly(12, 20)).toBe(10);
    expect(priceDisplay(29, { recurring: true, billing: "yearly", yearlyDiscount: 20, locale: "en" })).toEqual({
      prefix: "",
      amount: "$23",
      period: "/mo",
      caption: "billed yearly",
    });
    expect(priceDisplay(0, { recurring: true, billing: "monthly", yearlyDiscount: 20, locale: "es" }).amount).toBe("Gratis");
  });
});
