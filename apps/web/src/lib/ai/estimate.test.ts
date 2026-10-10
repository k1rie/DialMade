import { applyPatch, screenPointer } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { AI_ESTIMATE, estimateCopyCost, estimateScreensCopyCost } from "./estimate";
import { priceFor } from "./pricing";
import { sampleDoc, sampleScreensDoc } from "./testing";

const MODEL = "claude-opus-5-5";

describe("estimateScreensCopyCost", () => {
  const doc = sampleScreensDoc();
  const home = estimateScreensCopyCost(doc, [{ id: "s-home" }], MODEL);
  const detail = estimateScreensCopyCost(doc, [{ id: "s-detail" }], MODEL);
  const both = estimateScreensCopyCost(doc, [{ id: "s-home" }, { id: "s-detail" }], MODEL);

  it("counts the prompt overhead once for the whole request", () => {
    expect(home).toBeGreaterThan(0);
    expect(detail).toBeGreaterThan(0);
    const overhead = (AI_ESTIMATE.promptOverheadTokens * priceFor(MODEL).input) / 1_000_000;
    expect(both).toBeCloseTo(home + detail - overhead, 9);
  });

  it("covers only the requested sections, and nothing for unknown screens", () => {
    const hero = estimateScreensCopyCost(doc, [{ id: "s-home", sectionIds: ["b-000001"] }], MODEL);
    expect(hero).toBeGreaterThan(0);
    expect(hero).toBeLessThan(home);
    expect(estimateScreensCopyCost(doc, [{ id: "s-nope" }], MODEL)).toBe(0);
  });

  it("counts the block notes and labels that travel in <layout_notes>", () => {
    const noted = applyPatch(doc, [{ op: "add", path: screenPointer("s-home", "layout", "blocks", "b-000001", "note"), value: "n".repeat(180) }]);
    expect(noted.ok).toBe(true);
    if (!noted.ok) return;
    expect(estimateScreensCopyCost(noted.doc, [{ id: "s-home" }], MODEL)).toBeGreaterThan(home);
  });

  it("leaves the single-page estimate as it was", () => {
    const legacy = sampleDoc(["landing"]);
    expect(estimateCopyCost(legacy, "landing", undefined, MODEL)).toBeGreaterThan(0);
    expect(estimateCopyCost(legacy, "app", undefined, MODEL)).toBe(0);
  });
});
