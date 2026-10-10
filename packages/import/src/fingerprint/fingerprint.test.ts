import { createDesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { applyImport, defaultSelection } from "../apply";
import { importBatch } from "../batch";
import { fakeParser, pngHeader } from "../testing/fakes";
import { attachFingerprint, detachFingerprint } from "./fingerprint";

const shotParser = fakeParser("screenshot", "screenshot", {
  screenshot: { width: 1280, height: 800, mode: "light", neutralTint: { h: 250, c: 0.01 }, vibrancy: { c: 0.15, l: 0.6 }, swatches: ["#ffffff", "#111827", "#3a5bd9", "#f97316"] },
});

async function withShot() {
  const brand = await importBatch([{ name: "app.png", bytes: pngHeader(1280, 800) }], { ownership: "own", parsers: [shotParser] });
  return { brand, sourceId: brand.sources[0]!.id };
}

describe("attachFingerprint", () => {
  it("turns AI color roles into unlocked chips with the pixel hex and lowest precedence", async () => {
    const { brand, sourceId } = await withShot();
    const next = attachFingerprint(
      brand,
      sourceId,
      {
        mode: "light",
        density: "compact",
        radius: "lg",
        elevation: "soft",
        surface: "layered",
        recipeId: "soft-ui",
        colorRoles: [
          { swatchIndex: 2, role: "primary" },
          { swatchIndex: 3, role: "cta" },
          { swatchIndex: 0, role: "other" },
        ],
        confidence: "medium",
      },
      "claude-haiku-5-5",
    );
    expect(next.colors).toEqual([
      expect.objectContaining({ hex: "#3a5bd9", role: "primary", method: "ai", confidence: "medium", mode: "light", locator: "app.png · ai #2" }),
      expect.objectContaining({ hex: "#f97316", role: "cta", method: "ai" }),
    ]);
    expect(next.screenshots![0]!.fingerprint).toMatchObject({ method: "ai", model: "claude-haiku-5-5", colors: brand.screenshots![0]!.swatches });
    expect(next.recipe?.basis).toEqual(expect.arrayContaining(["shadow", "surface"]));
    expect(defaultSelection(next).accept).toEqual([]);

    const again = attachFingerprint(next, sourceId, { colorRoles: [{ swatchIndex: 1, role: "foreground" }], confidence: "high" });
    expect(again.colors.map((c) => c.role)).toEqual(["foreground"]);
  });

  it("detaches the AI suggestions when the switch goes off", async () => {
    const { brand, sourceId } = await withShot();
    const next = attachFingerprint(brand, sourceId, { colorRoles: [{ swatchIndex: 2, role: "primary" }], surface: "layered", confidence: "high" });
    const back = detachFingerprint(next, sourceId, brand);
    expect(back.colors).toEqual(brand.colors);
    expect(back.screenshots![0]!.fingerprint).toEqual(brand.screenshots![0]!.fingerprint);
    expect(detachFingerprint(brand, sourceId, brand)).toBe(brand);
  });

  it("refuses swatch indexes past the screenshot's swatches and unknown sources", async () => {
    const { brand, sourceId } = await withShot();
    expect(attachFingerprint(brand, sourceId, { colorRoles: [{ swatchIndex: 9, role: "primary" }] }).warnings).toContainEqual(
      expect.objectContaining({ code: "invalid-fingerprint" }),
    );
    expect(attachFingerprint(brand, "nope", {}).warnings).toContainEqual({ sourceId: "nope", code: "fingerprint-unknown-source" });
  });

  it("applies AI attributes only when opted in, unlocked", async () => {
    const { brand, sourceId } = await withShot();
    const next = attachFingerprint(brand, sourceId, { density: "airy", recipeId: "organic", confidence: "high" });
    const doc = createDesignDoc({ brand: { name: "Nimbo", seeds: { primary: "#3a5bd9" } }, provenance: { createdAt: "2026-10-10T09:00:00.000Z" } });
    const without = applyImport(doc, next, defaultSelection(next), { ownership: "own" });
    expect(without.ok && without.doc.brief.dials.density).toBe(5);
    const result = applyImport(doc, next, { ...defaultSelection(next), aiAttributes: [sourceId] }, { ownership: "own" });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.doc.brief.dials.density).toBe(3);
    expect(result.doc.brief.recipeId).toBe("organic");
    expect(result.doc.brief.locks).toEqual([]);
    expect(result.doc.provenance.imports![0]!.fields).toContainEqual({ path: "/brief/dials/density", locator: "app.png · ai", confidence: "high", method: "ai" });
  });
});
