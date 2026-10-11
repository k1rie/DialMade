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
  style: "",
  setStyle: () => {},
  references: [],
  setReferences: () => {},
  context: {},
  setContext: () => {},
  concept: undefined,
  tier: "mockup",
  setTier: () => {},
  tierNeedsKey: false,
  fullAccess: null,
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

const render = (p: AiRenderPlan, defaultOptionsOpen = false) =>
  renderToStaticMarkup(createElement(I18nProvider, null, createElement(DesignDetails, { plan: p, onUseKey: () => {}, onUseClaude: () => {}, defaultOptionsOpen })));

describe("DesignDetails («Diseño con IA»)", () => {
  it("offers the two other ways to Claude: the user's key and «Usar mi Claude» (spec §10.3)", () => {
    const html = render(plan());
    expect(html).toContain("Usar mi key");
    expect(html).toContain("Usar mi Claude");
  });

  it("keeps the panel short: no cost line, no session or art direction paragraphs", () => {
    const html = render(plan({ cost: { cost: "$0.013", left: 5, total: 5, screens: 1, seconds: 30, byok: false } }));
    expect(html).not.toContain("$0.013");
    expect(html).not.toContain("10 cambios");
    expect(html).not.toContain("semilla");
  });

  it("with the free tier closed they are the way out (the key is the primary action), never a dead end", () => {
    const html = render(plan({ blocked: "free-tier-exhausted", ready: false }));
    expect(html).toContain("sin usos gratis este mes");
    expect(html).toMatch(/<button[^>]*class="[^"]*bg-accent-cta[^"]*"[^>]*>(<span[^>]*>)?Usar mi key/);
    expect(html.match(/<button[^>]*disabled=""[^>]*>(<span[^>]*>)?Usar mi Claude/)).toBeNull();
  });

  it("keeps every optional question in one closed «Personalizar» that says what is set", () => {
    const html = render(plan());
    expect(html).toContain("Personalizar");
    expect(html).toContain("Maqueta · Automática");
    for (const label of ["¿Para quién es?", "Dirección de arte", "Adjuntar capturas", "Presentable"]) expect(html).not.toContain(label);
    expect(html.indexOf("Pantallas")).toBeLessThan(html.indexOf("Personalizar"));
    const set = render(plan({ tier: "presentable", chip: "warm", context: { audience: "Barberos", facts: "12 €/mes" }, style: "Mucho aire" }));
    expect(set).toContain("Presentable · Cálida · contexto 2/5 · estilo");
  });

  it("offers «Maqueta · Presentable · Producto final»; a tier the free plan does not make points to the key", () => {
    const html = render(plan(), true);
    for (const label of ["Nivel de acabado", "Maqueta", "Presentable", "Producto final"]) expect(html).toContain(label);
    expect(html).not.toContain("Este nivel necesita");
    const needsKey = render(plan({ tier: "final", tierNeedsKey: true }));
    expect(needsKey).toContain("Este nivel necesita tu key o tu Claude.");
    expect(needsKey).toMatch(/<button[^>]*class="[^"]*bg-accent-cta[^"]*"[^>]*>(<span[^>]*>)?Usar mi key/);
  });

  it("without screens there is nothing to prepare a prompt for", () => {
    const html = render(plan({ selected: [] }));
    expect(html.match(/<button[^>]*disabled=""[^>]*>(<span[^>]*>)?Usar mi Claude/)).not.toBeNull();
    expect(html).toContain("Elige al menos una pantalla.");
  });

  it("asks for the context before the direction and the style, with every field", () => {
    const html = render(plan(), true);
    for (const label of ["Contexto", "¿Para quién es?", "¿Qué debe provocar?", "Tono", "Datos reales", "¿Qué NO debe parecer?"]) expect(html).toContain(label);
    expect(html).toContain("Cuanto más sepa Claude de tu producto, menos genérico sale.");
    expect(html).toContain("0 de 5");
    expect(html.indexOf("Contexto")).toBeLessThan(html.indexOf("Dirección de arte"));
    expect(html.indexOf("Dirección de arte")).toBeLessThan(html.indexOf("Estilo"));
  });

  it("shows what was filled, the field caps and what Claude understood", () => {
    const html = render(plan({ context: { audience: "Dueños de barberías", facts: "Desde 19 USD al mes" }, concept: "Una agenda que se siente como una libreta." }), true);
    expect(html).toContain("2 de 5");
    expect(html).toContain('value="Dueños de barberías"');
    expect(html).toContain("Desde 19 USD al mes");
    expect(html).toMatch(/maxLength="160"/i);
    expect(html).toMatch(/maxLength="300"/i);
    expect(html).toContain("Lo que entendió Claude");
    expect(html).toContain("Una agenda que se siente como una libreta.");
  });

  it("does not claim an understanding before there is one", () => {
    expect(render(plan(), true)).not.toContain("Lo que entendió Claude");
  });
});
