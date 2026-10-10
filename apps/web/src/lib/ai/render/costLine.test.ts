import { describe, expect, it } from "vitest";
import { ai } from "@/i18n/ai";
import { formatRange, modelName, renderCostLines } from "./costLine";
import type { RenderEstimate } from "./estimate";

const free: RenderEstimate = { path: "free", model: "claude-haiku-5-5", screens: 3, uses: 1, seconds: 30, measured: true, minUsd: 0.0128, maxUsd: 0.0128 };
const byok: RenderEstimate = { path: "byok", model: "claude-opus-5-5", screens: 3, uses: 0, seconds: 100, measured: false, minUsd: 0.55, maxUsd: 0.75, cheaper: { model: "claude-sonnet-5-5", minUsd: 0.28, maxUsd: 0.37 } };

describe("cost line (spec §10.1): seen before calling", () => {
  it("free tier: cost, uses, what is left, screens and time", () => {
    expect(renderCostLines(free, ai.es.aiAccess, "es", { freeUsesTotal: 5, freeUsesRemaining: 5 }).line).toBe("≈ $0.013 · 1 uso de 5 (te quedan 4) · 3 pantallas · ≈ 30 s");
    expect(renderCostLines(free, ai.en.aiAccess, "en", { freeUsesTotal: 5, freeUsesRemaining: 5 }).line).toBe("≈ $0.013 · 1 use of 5 (4 left) · 3 screens · ≈ 30 s");
    const six = renderCostLines({ ...free, screens: 6, uses: 2 }, ai.es.aiAccess, "es", { freeUsesTotal: 5, freeUsesRemaining: 5 });
    expect(six.sessions).toBe("6 pantallas = 2 usos");
  });

  it("BYOK: a range with the model, and «Más barato: Sonnet 5.5»", () => {
    const lines = renderCostLines(byok, ai.es.aiAccess, "es", null);
    expect(lines.line).toBe("≈ $0.55–0.75 con tu key (Opus 5.5)");
    expect(lines.cheaper).toBe("Más barato: Sonnet 5.5 (≈ $0.28–0.37)");
    expect(lines.unmeasured).toBeDefined();
  });

  it("«mi Claude» is $0", () => {
    expect(renderCostLines({ ...free, path: "manual", model: "claude.ai", minUsd: 0, maxUsd: 0 }, ai.es.aiAccess, "es", null).line).toBe("$0 · 3 pantallas con tu cuenta de Claude");
  });

  it("helpers", () => {
    expect(modelName("claude-sonnet-5-5")).toBe("Sonnet 5.5");
    expect(formatRange({ minUsd: 0.0041, maxUsd: 0.0041 }, "en")).toBe("$0.004");
  });
});
