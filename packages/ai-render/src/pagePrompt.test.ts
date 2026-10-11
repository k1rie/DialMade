import { describe, expect, it } from "vitest";
import { blockParams, screenParams } from "./anthropic";
import { AI_PAGE_SYSTEM_PROMPT, pageAgentPrompt, pageManualPrompt, pageScreenMessage, pageStyleText } from "./pagePrompt";
import type { DirectionForPrompt, RenderBrandInput, RenderScreenInput } from "./prompt";
import { pageSectionData } from "./input";
import { TIER_MODEL, pageScreenMaxTokens } from "./tier";

const brand: RenderBrandInput = {
  name: "Brisa",
  productType: "saas-general",
  palette: { hue: 186, chroma: "muted", preferredMode: "light" },
  recipe: { id: "soft-ui", surface: "soft", shape: "rounded", density: "balanced", mood: "calm" },
};
const direction: DirectionForPrompt = { axes: {} as DirectionForPrompt["axes"], moves: ["One bold numeral"], rationale: "Calm and direct." };
const screen: RenderScreenInput = {
  id: "s-home",
  name: "Inicio",
  kind: "landing",
  route: "/",
  locale: "es",
  screens: [{ id: "s-pricing", name: "Precios" }],
  mode: "page",
  blocks: [
    { id: "b-hero", type: "hero", label: "Hero", cols: 12, heightPx: 512, h1: true, draft: [] },
    { id: "b-pricing", type: "pricing", label: "Precios", count: 2, cols: 12, heightPx: 448, draft: [], data: { plans: [{ name: "Básico", price: 0, highlighted: false }, { name: "Equipo", price: 12, highlighted: true }] } },
  ],
};
const text = (params: ReturnType<typeof screenParams>) => (params.messages[0]!.content as { type: string; text?: string }[]).map((part) => part.text ?? "").join("\n");
const system = (params: ReturnType<typeof screenParams>) => (params.system as { text: string }[])[0]!.text;

describe("page mode prompts", () => {
  it("send the outline and the fixed plans, never template copy, and ask for the page stylesheet first", () => {
    const message = pageScreenMessage(brand, direction, screen).map((part) => part.text).join("\n");
    expect(message).toContain('"sections"');
    expect(message).not.toContain('"draft"');
    expect(message).toContain('"name": "Equipo"');
    expect(message).toContain("first the <style data-dl-page>, then exactly 2 roots, in this order: b-hero, b-pricing");
  });

  it("the plans of a pricing block are its only fixed data (shown ones, names and prices)", () => {
    const props = { title: "Precios simples", plans: [{ name: "A", price: 0, highlighted: false, features: ["x"] }, { name: "B", price: 9, highlighted: true }, { name: "C", price: 19, highlighted: false }], count: 2, recurring: true };
    expect(pageSectionData(props)).toEqual({ plans: [{ name: "A", price: 0, highlighted: false }, { name: "B", price: 9, highlighted: true }], recurring: true });
    expect(pageSectionData({ title: "Hero" })).toBeUndefined();
  });

  it("«Maqueta» reads Anthropic's frontend-design guidance after the contract; «Presentable» does not", () => {
    const mockup = screenParams({ model: TIER_MODEL.mockup!, effort: "low" }, brand, direction, screen);
    expect(system(mockup).startsWith(AI_PAGE_SYSTEM_PROMPT)).toBe(true);
    expect(system(mockup)).toContain("frontend-design skill, Apache-2.0");
    expect(mockup.max_tokens).toBe(48_000);
    expect(mockup.output_config?.effort).toBe("medium");
    const presentable = screenParams({ model: TIER_MODEL.presentable!, effort: "medium", tier: "presentable" }, brand, direction, screen);
    expect(system(presentable)).toBe(AI_PAGE_SYSTEM_PROMPT);
    expect(presentable.max_tokens).toBe(pageScreenMaxTokens("presentable"));
    expect(text(presentable)).toContain("Quality: presentable");
  });

  it("a section's «Otra versión» carries the page stylesheet so its classes stay usable", () => {
    const params = blockParams({ model: TIER_MODEL.mockup!, effort: "low" }, brand, direction, {
      screen: { id: "s-home", name: "Inicio", kind: "landing", route: "/", locale: "es", screens: [], mode: "page" },
      block: screen.blocks[0]!,
      html: '<section data-block-id="b-hero"><h1>x</h1></section>',
      pageCss: ":where([data-dl-ai-block]) .btn{gap:1px}",
      action: { kind: "reroll", seed: 7 },
    });
    expect(text(params)).toContain('"pageCss": ":where([data-dl-ai-block]) .btn{gap:1px}"');
    expect(text(params)).toContain('data-block-id="b-hero"');
  });

  it("the finishes map to Haiku, Sonnet and an agent", () => {
    expect(TIER_MODEL).toEqual({ mockup: "claude-haiku-5-5", presentable: "claude-sonnet-5-5", final: null });
  });

  it("«Producto final» is a job for the developer's agent with the design skills, answered in the same contract", () => {
    const prompt = pageAgentPrompt(brand, direction, [screen]);
    expect(prompt).toContain("pbakaus/impeccable");
    expect(prompt).toContain("Leonxlnx/taste-skill");
    expect(prompt).toContain("1280 and 390 px");
    expect(prompt).toContain(pageManualPrompt(brand, direction, [screen], "final"));
  });

  it("reads the page stylesheet root of a stream", () => {
    expect(pageStyleText("<style data-dl-page>.a{gap:1px}</style>")).toBe(".a{gap:1px}");
    expect(pageStyleText('<section data-block-id="b"><style>.a{}</style></section>')).toBeNull();
  });
});
