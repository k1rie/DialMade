import { applyPatch } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { setAiBlockActiveOps } from "@/lib/ai/render/edit";
import { designedDoc, unwrap } from "@/lib/ai/render/editFixtures";
import { affordable, redoPlan } from "./redoPlan";

describe("redo plan of a screen", () => {
  it("nothing to redo on a fresh design", () => {
    const { doc, hero, features } = designedDoc();
    expect(redoPlan(doc, "s-home", [hero, features])).toEqual({ styleChanged: [], stale: [], all: [] });
  });

  it("a recipe change lists the active blocks in reading order; base blocks are left alone", () => {
    const { doc, hero, features } = designedDoc();
    const restyled = unwrap(applyPatch(doc, [{ op: "replace", path: "/brief/recipeId", value: "editorial" }]));
    expect(redoPlan(restyled, "s-home", [features, hero]).all).toEqual([features, hero]);
    const inBase = unwrap(applyPatch(restyled, setAiBlockActiveOps(restyled, "s-home", features, false)));
    expect(redoPlan(inBase, "s-home", [features, hero])).toEqual({ styleChanged: [hero], stale: [], all: [hero] });
  });

  it("the session pays for the first ones only", () => {
    expect(affordable(["a", "b", "c"], 2)).toEqual(["a", "b"]);
    expect(affordable(["a"], 0)).toEqual([]);
    expect(affordable(["a", "b"], null)).toEqual(["a", "b"]);
  });
});
