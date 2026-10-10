import { styleRecipes } from "@dialmade/catalog";
import { FingerprintSchema } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import {
  STYLE_FINGERPRINT_JSON_SCHEMA,
  VISION_BODY_CLASSES,
  VISION_COLOR_ROLES,
  VISION_DENSITIES,
  VISION_ELEVATIONS,
  VISION_HEADING_CLASSES,
  VISION_LAYOUT_IDS,
  VISION_MODES,
  VISION_PAIRING_IDS,
  VISION_RADII,
  VISION_RECIPE_IDS,
  VISION_SURFACES,
  normalizeFingerprintAnswer,
  toVisionFingerprint,
  type VisionRef,
} from "./schema";
import { SWATCHES, sampleRef } from "./testing";

type JsonNode = Record<string, unknown>;

function walk(node: unknown, visit: (node: JsonNode, path: string) => void, path = "$"): void {
  if (!node || typeof node !== "object") return;
  visit(node as JsonNode, path);
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, visit, `${path}.${key}[${i}]`));
    else walk(value, visit, `${path}.${key}`);
  }
}

describe("STYLE_FINGERPRINT_JSON_SCHEMA (structured output)", () => {
  it("marks every property required and closes every object", () => {
    let objects = 0;
    walk(STYLE_FINGERPRINT_JSON_SCHEMA, (node, path) => {
      if (node.type !== "object") return;
      objects++;
      expect(node.additionalProperties, path).toBe(false);
      expect([...(node.required as string[])].sort(), path).toEqual(Object.keys(node.properties as JsonNode).sort());
    });
    expect(objects).toBe(3);
  });

  it("uses no constraint structured outputs rejects, and no $schema dialect", () => {
    const forbidden = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems", "pattern", "$schema"];
    walk(STYLE_FINGERPRINT_JSON_SCHEMA, (node, path) => {
      for (const key of forbidden) expect(key in node, `${path}.${key}`).toBe(false);
      if ("minItems" in node) expect([0, 1], path).toContain(node.minItems);
    });
  });

  it("keeps the enums in the grammar: fixed swatch and ref indexes, the 12 recipes", () => {
    const ref = ((STYLE_FINGERPRINT_JSON_SCHEMA.properties as JsonNode).refs as JsonNode).items as JsonNode;
    const props = ref.properties as Record<string, JsonNode>;
    expect(props.refIndex!.enum).toEqual([0, 1, 2, 3]);
    expect(((props.colorRoles!.items as JsonNode).properties as Record<string, JsonNode>).swatchIndex!.enum).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(props.recipeId!.enum).toEqual(styleRecipes.map((recipe) => recipe.id));
    expect(props.recipeId!.enum).toHaveLength(12);
    expect(props.pairingId!.enum).toContain("none");
    expect(props.layoutId!.enum).toEqual(expect.arrayContaining(["app-shell", "unknown"]));
    expect(Object.keys(props)).toEqual([
      "refIndex",
      "mode",
      "density",
      "radius",
      "elevation",
      "surface",
      "headingClass",
      "bodyClass",
      "recipeId",
      "pairingId",
      "layoutId",
      "colorRoles",
      "confidence",
    ]);
  });

  it("has no field that can carry a color value", () => {
    const text = JSON.stringify(STYLE_FINGERPRINT_JSON_SCHEMA);
    expect(text).not.toMatch(/"hex"|"color"|"value"/);
  });
});

describe("toVisionFingerprint", () => {
  const accepted = (ref: VisionRef) =>
    FingerprintSchema.safeParse({ ...toVisionFingerprint(ref), colors: SWATCHES, method: "ai", model: "claude-haiku-5-5" }).success;

  it("produces what the DesignDoc's FingerprintSchema accepts, for every enum value", () => {
    const cases: Partial<VisionRef>[] = [
      ...VISION_MODES.map((mode) => ({ mode })),
      ...VISION_DENSITIES.map((density) => ({ density })),
      ...VISION_RADII.map((radius) => ({ radius })),
      ...VISION_ELEVATIONS.map((elevation) => ({ elevation })),
      ...VISION_SURFACES.map((surface) => ({ surface })),
      ...VISION_HEADING_CLASSES.map((headingClass) => ({ headingClass })),
      ...VISION_BODY_CLASSES.map((bodyClass) => ({ bodyClass })),
      ...VISION_RECIPE_IDS.map((recipeId) => ({ recipeId })),
      ...VISION_PAIRING_IDS.map((pairingId) => ({ pairingId })),
      ...VISION_LAYOUT_IDS.map((layoutId) => ({ layoutId })),
      ...VISION_COLOR_ROLES.map((role) => ({ colorRoles: [{ swatchIndex: 11 as const, role }] })),
    ];
    for (const overrides of cases) expect(accepted(sampleRef(overrides)), JSON.stringify(overrides)).toBe(true);
  });

  it("leaves out «none» and «unknown» instead of storing them", () => {
    const fp = toVisionFingerprint(sampleRef({ pairingId: "none", layoutId: "unknown" }));
    expect(fp).not.toHaveProperty("pairingId");
    expect(fp).not.toHaveProperty("layoutId");
    expect(toVisionFingerprint(sampleRef())).toMatchObject({ pairingId: "inter-neo-grotesque", layoutId: "app-shell", recipeId: "soft-ui" });
  });
});

describe("normalizeFingerprintAnswer", () => {
  it("returns one fingerprint per screenshot, sorted, null where the answer had none", () => {
    const result = normalizeFingerprintAnswer({ refs: [sampleRef({ refIndex: 2 }), sampleRef({ refIndex: 0, mode: "dark" })] }, [12, 12, 12]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answer.refs.map((ref) => ref.refIndex)).toEqual([0, 2]);
    expect(result.fingerprints[0]).toMatchObject({ mode: "dark" });
    expect(result.fingerprints[1]).toBeNull();
    expect(result.fingerprints[2]).toMatchObject({ mode: "light" });
    expect(result.dropped).toBe(0);
  });

  it("drops refs for unknown or repeated screenshots and roles past the swatches, without failing", () => {
    const result = normalizeFingerprintAnswer(
      {
        refs: [
          sampleRef({
            colorRoles: [
              { swatchIndex: 0, role: "background" },
              { swatchIndex: 0, role: "background" },
              { swatchIndex: 3, role: "primary" },
              { swatchIndex: 1, role: "foreground" },
            ],
          }),
          sampleRef({ refIndex: 0, mode: "dark" }),
          sampleRef({ refIndex: 3 }),
        ],
      },
      [3, 5],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dropped).toBe(4);
    expect(result.fingerprints[0]?.mode).toBe("light");
    expect(result.fingerprints[0]?.colorRoles).toEqual([
      { swatchIndex: 0, role: "background" },
      { swatchIndex: 1, role: "foreground" },
    ]);
    expect(result.fingerprints[1]).toBeNull();
  });

  it("fails with no-refs when nothing fits the request", () => {
    expect(normalizeFingerprintAnswer({ refs: [] }, [12])).toEqual({ ok: false, problem: "no-refs" });
    expect(normalizeFingerprintAnswer({ refs: [sampleRef({ refIndex: 1 })] }, [12])).toEqual({ ok: false, problem: "no-refs" });
  });

  it("rejects values outside the vocabulary, hex in place of an index, and non-objects", () => {
    const hex = normalizeFingerprintAnswer({ refs: [{ ...sampleRef(), colorRoles: [{ swatchIndex: "#564cd3", role: "primary" }] }] }, [12]);
    expect(hex).toMatchObject({ ok: false, problem: "invalid-schema" });
    if (!hex.ok) expect(hex.detail).toContain("refs.0.colorRoles.0.swatchIndex");
    expect(normalizeFingerprintAnswer({ refs: [sampleRef({ recipeId: "brutalism" })] }, [12])).toMatchObject({ ok: false, problem: "invalid-schema" });
    expect(normalizeFingerprintAnswer({ refs: [{ ...sampleRef(), swatchIndex: 12 }] }, [12]).ok).toBe(true);
    expect(normalizeFingerprintAnswer({ refs: [sampleRef({ colorRoles: [{ swatchIndex: 12 as 0, role: "primary" }] })] }, [12]).ok).toBe(false);
    expect(normalizeFingerprintAnswer(null, [12])).toMatchObject({ ok: false, problem: "invalid-schema" });
    expect(normalizeFingerprintAnswer("{}", [12])).toMatchObject({ ok: false, problem: "invalid-schema" });
  });
});
