import type { RenderBrandInput, RenderScreenInput } from "@dialmade/ai-render";
import { describe, expect, it } from "vitest";
import { estimateBlockAction, estimateRender } from "./estimate";
import { screenOnly as toScreenOnly } from "./testing";

const brand: RenderBrandInput = {
  name: "Brisa",
  productType: "saas-general: SaaS",
  description: "Reservas y cobros para barberías de barrio, sin llamadas ni libretas.",
  palette: { hue: 186, chroma: "muted", preferredMode: "light" },
  recipe: { id: "soft-ui", surface: "layered", shape: "rounded", density: "roomy", mood: "Soft UI: friendly, rounded and calm" },
};

const types = ["navbar", "hero", "features", "pricing", "testimonials", "footer"];
const screen = (id: string): RenderScreenInput => ({
  id,
  name: `Pantalla ${id}`,
  kind: "landing",
  route: `/${id}`,
  locale: "es",
  screens: [{ id: "s-other", name: "Otra" }],
  blocks: types.map((type, i) => ({
    id: `${id}-b${i}`,
    type,
    label: type,
    cols: 12,
    heightPx: 480,
    draft: ["Reserva tu corte en dos toques", "Agenda, clientes y cobros de tu barbería en un solo sitio.", "Empieza gratis", "Ver demo", "price: 12"],
  })),
});
const three = [screen("s1"), screen("s2"), screen("s3")];

describe("estimateRender (spec §5.5)", () => {
  it("free tier with Haiku 5.5: ≈ $0,013 and ≈ 30 s for 3 screens, 1 use", () => {
    const estimate = estimateRender({ path: "free", model: "claude-haiku-5-5", brand, screens: three, newDirection: true, recipeId: "soft-ui" });
    expect(estimate.uses).toBe(1);
    expect(estimate.minUsd).toBeGreaterThan(0.009);
    expect(estimate.minUsd).toBeLessThan(0.017);
    expect(estimate.maxUsd).toBe(estimate.minUsd);
    expect(estimate.seconds).toBeGreaterThanOrEqual(25);
    expect(estimate.seconds).toBeLessThanOrEqual(35);
    expect(estimate.measured).toBe(true);
    expect(estimate.cheaper).toBeUndefined();
  });

  it("BYOK with Opus 5.5: a range around $0,55–0,75 and «Más barato: Sonnet 5.5» around $0,28–0,37", () => {
    const estimate = estimateRender({ path: "byok", model: "claude-opus-5-5", brand, screens: three, newDirection: true, recipeId: "soft-ui" });
    expect(estimate.uses).toBe(0);
    expect(estimate.minUsd).toBeGreaterThan(0.45);
    expect(estimate.maxUsd).toBeLessThan(0.95);
    expect(estimate.cheaper?.model).toBe("claude-sonnet-5-5");
    expect(estimate.cheaper!.minUsd).toBeGreaterThan(0.2);
    expect(estimate.cheaper!.maxUsd).toBeLessThan(0.48);
    expect(estimate.measured).toBe(false);
  });

  it("6 screens = 2 uses; «mi Claude» costs $0", () => {
    const six = [...three, screen("s4"), screen("s5"), screen("s6")];
    expect(estimateRender({ path: "free", model: "claude-haiku-5-5", brand, screens: six, newDirection: false, recipeId: "soft-ui" }).uses).toBe(2);
    const manual = estimateRender({ path: "manual", model: "claude.ai", brand, screens: six, newDirection: true, recipeId: "soft-ui" });
    expect(manual).toMatchObject({ minUsd: 0, maxUsd: 0, uses: 0, seconds: 0 });
  });

  it("a block action with Haiku 5.5 is ≈ $0,001", () => {
    const s = three[0]!;
    const screenOnly = toScreenOnly(s);
    const direction = { axes: { composition: "editorial", typeVoice: "quiet", decoration: "none", imagery: "icon-led", colorStrategy: "brand-forward", rhythm: "airy" }, moves: ["a"], rationale: "r" } as const;
    const action = estimateBlockAction({ path: "free", model: "claude-haiku-5-5", brand, direction: { ...direction, moves: [...direction.moves] }, action: { screen: screenOnly, block: s.blocks[1]!, html: "<section>…</section>".repeat(40), action: { kind: "reroll", seed: 3 } } });
    expect(action.minUsd).toBeGreaterThan(0.0004);
    expect(action.minUsd).toBeLessThan(0.002);
  });
});

describe("reference screenshots in the estimate", () => {
  const base = { path: "byok", model: "claude-sonnet-5-5", brand, screens: three, recipeId: "soft-ui" } as const;

  it("each screenshot adds its image tokens to the direction call, and nothing else", () => {
    const without = estimateRender({ ...base, newDirection: true });
    const one = estimateRender({ ...base, newDirection: true, references: 1 });
    const three3 = estimateRender({ ...base, newDirection: true, references: 3 });
    expect(one.minUsd).toBeGreaterThan(without.minUsd);
    expect(three3.minUsd).toBeGreaterThan(one.minUsd);
    // 1.6k input tokens at Sonnet's input price: cents, never dollars.
    expect(three3.minUsd - without.minUsd).toBeLessThan(0.05);
  });

  it("without a new direction the screenshots cost nothing (they are not sent)", () => {
    const reuse = estimateRender({ ...base, newDirection: false });
    expect(estimateRender({ ...base, newDirection: false, references: 3 }).minUsd).toBe(reuse.minUsd);
  });
});
