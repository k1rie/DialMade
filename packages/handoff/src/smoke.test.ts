import { describe, expect, it } from "vitest";
import { FigmaPlanSchema, buildDesignTree, toFigmaPlan } from "./index";
import { legacyDoc, screensDoc } from "./testing/fixtures";

describe("smoke", () => {
  it("builds a tree and a valid plan", () => {
    const doc = screensDoc();
    const errors: string[] = [];
    const tree = buildDesignTree(doc, { onSectionError: (id, type, error) => errors.push(`${id} ${type} ${String(error)}`) });
    expect(errors).toEqual([]);
    expect(tree.pages.map((p) => p.name)).toEqual(["Inicio", "Precios", "Entrar", "Dashboard", "Ajustes", "Guía de estilo"]);
    const plan = toFigmaPlan(doc);
    FigmaPlanSchema.parse(plan);
    const legacy = toFigmaPlan(legacyDoc());
    FigmaPlanSchema.parse(legacy);
    expect(legacy.pages.map((p) => p.name)).toEqual(["Landing page", "Dashboard", "Guía de estilo"]);
  });
});
