import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { AiRenderCost, type AiRenderCostProps } from "./AiRenderCost";

const render = (props: AiRenderCostProps) => renderToStaticMarkup(createElement(I18nProvider, null, createElement(AiRenderCost, props)));
const text = (markup: string) => markup.replace(/<[^>]+>/g, "\n").split("\n").filter(Boolean);

describe("AiRenderCost", () => {
  it("says nothing while «Generar con IA» can run (the cost is the CTA's tooltip)", () => {
    expect(render({ blocked: null })).toBe("");
  });

  it("when the free tier cannot answer, why; without screens, that one is missing", () => {
    expect(text(render({ blocked: "free-tier-exhausted" }))).toEqual(["sin usos gratis este mes"]);
    expect(text(render({ blocked: null, empty: true }))).toEqual(["Elige al menos una pantalla."]);
  });
});
