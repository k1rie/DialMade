import { inferStructure, validateLayout } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { layout as layoutText } from "@/i18n/layout";
import { normalizeProposals } from "@/lib/ai/layout/normalize";
import { searchBlocks } from "../searchBlocks";
import { detectKind, fallbackAnswer, resolveNeed, splitNeeds } from "./fallback";

const dicts = [layoutText.es.blocks, layoutText.en.blocks] as const;
const search = (query: string) => searchBlocks(query, dicts);
const text = layoutText.es.describe.fallback;
const run = (description: string, kind: "any" | "landing" | "app" = "any", variants: 2 | 3 = 3) =>
  normalizeProposals(fallbackAnswer(description, { kind, variants, search, text }));

describe("«Describe» without AI", () => {
  it("splits the needs after the colon, on commas and on «y»/«and»", () => {
    expect(splitNeeds("app de reservas para barberías: agenda semanal, lista de clientes y pagos.")).toEqual(["agenda semanal", "lista de clientes", "pagos"]);
    expect(splitNeeds("dashboard with stats and invoices")).toEqual(["dashboard", "stats", "invoices"]);
    expect(splitNeeds("a, a, b")).toEqual([]);
  });

  it("reads app or website from the words, unless the user chose", () => {
    expect(detectKind("app de reservas para barberías", "any")).toBe("app");
    expect(detectKind("landing para mi cafetería con precios", "any")).toBe("landing");
    expect(detectKind("algo", "any")).toBe("app");
    expect(detectKind("app de reservas", "landing")).toBe("landing");
  });

  it("picks library blocks with the es/en synonyms and a few domain words", () => {
    expect(resolveNeed("agenda semanal", "app", search)).toBe("calendar");
    expect(resolveNeed("lista de clientes", "app", search)).toBe("table");
    expect(resolveNeed("pagos", "app", search)).toBe("table");
    expect(resolveNeed("weekly schedule", "app", search)).toBe("calendar");
    expect(resolveNeed("estadísticas", "app", search)).toBe("kpis");
    expect(resolveNeed("testimonios", "landing", search)).toBe("testimonials");
    // A landing-only block never lands on an app screen; nothing that fits → a free block to decide later.
    expect(resolveNeed("testimonios", "app", search)).not.toBe("testimonials");
    expect(resolveNeed("zzzz qqqq", "app", search)).toBe("free");
  });

  it("gives 2 or 3 valid variants that cost nothing, with every need on a screen", () => {
    const proposals = run("app de reservas para barberías: agenda semanal, lista de clientes, pagos");
    expect(proposals.map((p) => p.name)).toEqual([text.perNeed.name, text.onePanel.name, text.withWeb.name]);
    const [perNeed, onePanel, withWeb] = proposals;
    expect(perNeed!.screens.map((s) => s.name)).toEqual(["Inicio", "Agenda semanal", "Lista de clientes", "Pagos"]);
    expect(onePanel!.screens).toHaveLength(1);
    expect(withWeb!.screens.map((s) => s.kind)).toEqual(["landing", "app"]);
    for (const proposal of proposals) {
      expect(proposal.recipeId).toBeNull();
      expect(proposal.warnings).toEqual([]);
      for (const proposed of proposal.screens) {
        expect(validateLayout(proposed.layout)).toEqual([]);
        expect(inferStructure(proposed.layout).warnings).toEqual([]);
      }
    }
    expect(Object.values(onePanel!.screens[0]!.layout.blocks).map((b) => b.type)).toEqual(["kpis", "calendar", "table", "table"]);
    expect(run("landing para mi cafetería: menú, galería, contacto", "any", 2)).toHaveLength(2);
  });

  it("is deterministic", () => {
    const description = "web para un estudio de yoga: horarios, profesores, precios";
    expect(run(description)).toEqual(run(description));
  });
});
