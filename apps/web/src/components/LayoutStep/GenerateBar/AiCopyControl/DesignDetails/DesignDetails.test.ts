import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import type { AiRenderPlan } from "../../useAiRenderPlan";
import { DesignDetails } from "./DesignDetails";

const plan = (over: Partial<AiRenderPlan> = {}): AiRenderPlan => ({
  mode: "design",
  setMode: () => {},
  designAvailable: true,
  chip: "auto",
  setChip: () => {},
  screens: [{ id: "s-home", name: "Inicio", blocks: 5, designed: false }],
  selected: ["s-home"],
  toggleScreen: () => {},
  blocked: null,
  estimate: null,
  cost: null,
  ready: true,
  start: () => {},
  startWith: () => {},
  ...over,
});

const render = (p: AiRenderPlan) => renderToStaticMarkup(createElement(I18nProvider, null, createElement(DesignDetails, { plan: p, onUseKey: () => {}, onUseClaude: () => {} })));

describe("DesignDetails («Diseño con IA»)", () => {
  it("offers the two other ways to Claude: the user's key and «Copiar prompt para mi Claude» (spec §10.3)", () => {
    const html = render(plan());
    expect(html).toContain("Usar mi key");
    expect(html).toContain("Copiar prompt para mi Claude");
  });

  it("with the free tier closed they are the way out (the key is the primary action), never a dead end", () => {
    const html = render(plan({ blocked: "free-tier-exhausted", ready: false }));
    expect(html).toContain("sin usos gratis este mes");
    expect(html).toMatch(/<button[^>]*class="[^"]*bg-accent-cta[^"]*"[^>]*>(<span[^>]*>)?Usar mi key/);
    expect(html.match(/<button[^>]*disabled=""[^>]*>(<span[^>]*>)?Copiar prompt/)).toBeNull();
  });

  it("without screens there is nothing to prepare a prompt for", () => {
    const html = render(plan({ selected: [] }));
    expect(html.match(/<button[^>]*disabled=""[^>]*>(<span[^>]*>)?Copiar prompt/)).not.toBeNull();
    expect(html).toContain("Elige al menos una pantalla para preparar el prompt.");
  });
});
