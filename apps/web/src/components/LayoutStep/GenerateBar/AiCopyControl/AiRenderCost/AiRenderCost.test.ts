import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { AiRenderCost, type AiRenderCostProps } from "./AiRenderCost";

const render = (props: AiRenderCostProps) => renderToStaticMarkup(createElement(I18nProvider, null, createElement(AiRenderCost, props)));
const text = (markup: string) => markup.replace(/<[^>]+>/g, "\n").split("\n").filter(Boolean);

describe("AiRenderCost", () => {
  it("says the cost, the use, the screens and the time before any call", () => {
    const lines = text(render({ cost: { cost: "$0.013", left: 5, total: 5, screens: 3, seconds: 30 }, blocked: null }));
    expect(lines[0]).toBe("≈ $0.013 · 1 uso de 5 · 3 pantallas · ≈ 30 s");
    expect(lines[1]).toContain("10 cambios");
  });

  it("when the free tier cannot answer, why (and nothing about a session)", () => {
    expect(text(render({ cost: null, blocked: "free-tier-exhausted" }))).toEqual(["sin usos gratis este mes"]);
    expect(text(render({ cost: null, blocked: null, empty: true }))).toEqual(["Elige al menos una pantalla."]);
  });
});
