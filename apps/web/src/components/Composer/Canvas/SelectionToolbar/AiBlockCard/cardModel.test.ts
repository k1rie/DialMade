import { describe, expect, it } from "vitest";
import { composer } from "@/i18n/composer";
import { designedDoc } from "@/lib/ai/render/editFixtures";
import { aiBlockOf } from "@/lib/ai/render/edit";
import { QUICK_CHIPS, modelName, provenanceLine, recipeLabel, sessionLine, warningLines } from "./cardModel";

const es = composer.es.aiBlock;
const en = composer.en.aiBlock;

describe("«Bloque de IA» card model", () => {
  it("names models and recipes for people", () => {
    expect(modelName("claude-haiku-5-5")).toBe("Haiku 5.5");
    expect(modelName("claude-opus-5-5")).toBe("Opus 5.5");
    expect(modelName("claude.ai")).toBe("Claude");
    expect(modelName(undefined)).toBeNull();
    expect(recipeLabel("soft-ui", "es")).not.toBe("soft-ui");
    expect(recipeLabel("nope", "en")).toBe("nope");
  });

  it("words every gate warning in both languages", () => {
    const warnings = [
      { code: "contrast", detail: "3.1:1 · Ver demo (light)" },
      { code: "contrast-fixed", detail: "1" },
      { code: "classes-dropped", detail: "4" },
      { code: "new-contact", detail: "evil.example" },
      { code: "unknown-icon", detail: "rocket" },
      { code: "off-direction" },
      { code: "overflow", detail: "mobile" },
    ] as const;
    expect(warningLines(warnings, es, 10)).toEqual([
      "Contraste bajo: 3.1:1 · Ver demo (light)",
      "Contraste corregido en 1 sitio",
      "4 clases fuera de tus tokens, quitadas",
      "Texto con enlace o contacto que no escribiste: evil.example",
      "Icono desconocido «rocket», sustituido por un punto",
      "Se aleja de la dirección de arte",
      "Se sale de su caja en mobile",
    ]);
    expect(warningLines(warnings, en)).toHaveLength(6);
  });

  it("says where the block came from", () => {
    const { doc, hero } = designedDoc();
    const block = { ...aiBlockOf(doc, "s-home", hero)!, provenance: { ...aiBlockOf(doc, "s-home", hero)!.provenance, kind: "change" as const, costUsd: 0.00095 } };
    const line = provenanceLine(block, es, "es");
    expect(line).toMatch(/^Cambio pedido · Haiku 5\.5 · IA gratis · .+ · /);
    expect(provenanceLine(block, en, "en")).toMatch(/^Requested change · Haiku 5\.5 · Free AI · /);
  });

  it("the cost line follows the session", () => {
    expect(sessionLine(null)).toEqual({ state: "none" });
    const counters = { directionsUsed: 1, directionsMax: 2, screensUsed: 3, screensMax: 3, actionsUsed: 10, actionsMax: 10, expiresAt: "2999-01-01T00:00:00.000Z" };
    expect(sessionLine({ sessionId: "s", counters })).toEqual({ state: "exhausted" });
    expect(sessionLine({ sessionId: "s", counters: { ...counters, actionsUsed: 3 } })).toEqual({ state: "ok", left: 7, max: 10 });
  });

  it("has the five quick chips of the spec, each a fixed request", () => {
    expect(QUICK_CHIPS.map((chip) => es.chips[chip].label)).toEqual(["Más aire", "Más compacto", "Alinear a la izquierda", "Fondo de marca", "Más sobrio"]);
    for (const chip of QUICK_CHIPS) expect(en.chips[chip].request.length).toBeLessThanOrEqual(500);
  });
});
