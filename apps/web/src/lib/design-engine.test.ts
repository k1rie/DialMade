import { applyPatch, createDesignDoc, type DesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { syncPalette, withRecipe } from "./design-engine";

function importedDoc(locks: string[]): DesignDoc {
  const base = createDesignDoc({
    brand: { name: "Nimbo", seeds: { primary: "#3a5bd9", secondary: "#f97316" } },
    brief: { paletteStyleId: "vibrant", pairingId: "inter-neo-grotesque", locale: "es" },
    provenance: { createdAt: "2026-10-10T09:00:00.000Z" },
  });
  const result = applyPatch(base, locks.map((lock) => ({ op: "add", path: "/brief/locks/-", value: lock })));
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

describe("design engine and import locks", () => {
  it("a recipe's cascade skips a pairing the import locked instead of failing", () => {
    const doc = importedDoc(["/brief/pairingId"]);
    const result = withRecipe(doc, "soft-ui", { cascade: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.brief.recipeId).toBe("soft-ui");
      expect(result.doc.brief.pairingId).toBe("inter-neo-grotesque");
    }
  });

  it("the Lab's palette style applies even when a seed is locked; the locked seed stays", () => {
    const doc = importedDoc(["/brand/seeds/primary"]);
    const result = syncPalette(doc, { primary: "#e11d48", secondary: "#0f766e", styleId: "pastel" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.brand.seeds).toEqual({ primary: "#3a5bd9", secondary: "#0f766e" });
      expect(result.doc.brief.paletteStyleId).toBe("pastel");
    }
  });
});
