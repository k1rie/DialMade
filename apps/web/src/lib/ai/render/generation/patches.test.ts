import { applyPatch, createDesignDoc, type AiDirection, type DesignDoc, type Lock } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { directionOps, themeOps } from "./patches";

function docWith(brief: { recipeId: string; themeId?: string }, locks: Lock[] = []): DesignDoc {
  const base = createDesignDoc({
    brand: { name: "Brisa", seeds: { primary: "#0f766e" } },
    brief: { productType: "saas-general", locale: "es", ...brief, locks },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
  return base;
}

function direction(themeId?: string): AiDirection {
  return {
    id: "d-1",
    version: 1,
    seed: 1,
    chip: "auto",
    axes: { composition: "split", typeVoice: "quiet", decoration: "none", imagery: "icon-led", colorStrategy: "brand-forward", rhythm: "airy" },
    moves: ["Cards with a border and no shadow"],
    rationale: "Calma",
    ...(themeId && { themeId }),
    provenance: { kind: "direction", path: "free", createdAt: "2026-10-10T12:00:00.000Z", promptVersion: "ai-render/3", seed: 1 },
  };
}

/** The doc after a direction was applied (so «the previous direction» is in `aiRender`). */
function afterDirection(doc: DesignDoc, picked: AiDirection): DesignDoc {
  const result = applyPatch(doc, directionOps(doc, picked));
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

describe("themeOps (the variant a direction picks)", () => {
  it("adds the picked variant of the document's recipe", () => {
    const doc = docWith({ recipeId: "playful" });
    expect(themeOps(doc, direction("daisyui-cupcake"))).toEqual([{ op: "add", path: "/brief/themeId", value: "daisyui-cupcake" }]);
  });

  it("directionOps writes the direction and the variant in one patch that applies", () => {
    const doc = docWith({ recipeId: "playful" });
    const ops = directionOps(doc, direction("daisyui-cupcake"));
    expect(ops.map((op) => op.path)).toEqual(["/aiRender", "/brief/themeId"]);
    const result = applyPatch(doc, ops);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.brief.themeId).toBe("daisyui-cupcake");
      expect(result.doc.aiRender?.direction?.themeId).toBe("daisyui-cupcake");
    }
  });

  it("without a picked variant writes nothing to the brief", () => {
    const doc = docWith({ recipeId: "playful" });
    expect(themeOps(doc, direction())).toEqual([]);
    expect(directionOps(doc, direction()).map((op) => op.path)).toEqual(["/aiRender"]);
  });

  it("ignores a variant of another recipe (the recipe changed while the model was answering)", () => {
    const doc = docWith({ recipeId: "editorial" });
    expect(themeOps(doc, direction("daisyui-cupcake"))).toEqual([]);
  });

  it("keeps a variant the developer set by hand, and replaces one the previous direction put there", () => {
    const manual = docWith({ recipeId: "playful", themeId: "daisyui-pastel" });
    expect(themeOps(manual, direction("daisyui-cupcake"))).toEqual([]);

    const first = afterDirection(docWith({ recipeId: "playful" }), direction("daisyui-cupcake"));
    expect(first.brief.themeId).toBe("daisyui-cupcake");
    expect(themeOps(first, direction("daisyui-pastel"))).toEqual([{ op: "replace", path: "/brief/themeId", value: "daisyui-pastel" }]);
  });

  it("«none» removes the variant of the previous direction, never one the developer chose", () => {
    const first = afterDirection(docWith({ recipeId: "playful" }), direction("daisyui-cupcake"));
    expect(themeOps(first, direction())).toEqual([{ op: "remove", path: "/brief/themeId" }]);

    const manual = docWith({ recipeId: "playful", themeId: "daisyui-pastel" });
    const stored = afterDirection(manual, direction("daisyui-cupcake"));
    expect(stored.brief.themeId).toBe("daisyui-pastel");
    expect(themeOps(stored, direction())).toEqual([]);
  });

  it("does nothing when the same variant is already there", () => {
    const doc = afterDirection(docWith({ recipeId: "playful" }), direction("daisyui-cupcake"));
    expect(themeOps(doc, direction("daisyui-cupcake"))).toEqual([]);
  });

  it("a lock on the recipe or the variant («tu guía manda») keeps the brief as it is", () => {
    expect(themeOps(docWith({ recipeId: "playful" }, ["/brief/themeId"]), direction("daisyui-cupcake"))).toEqual([]);
    expect(themeOps(docWith({ recipeId: "playful" }, ["/brief/recipeId"]), direction("daisyui-cupcake"))).toEqual([]);
  });
});
