// StyleFingerprint (importar-guia-spec.md §5): the vision AI's answer. One Zod schema validates the
// hosted answer, the BYOK answer and the JSON pasted back from «mi Claude»; the JSON Schema sent as
// structured output is generated from it. The AI never returns hex: it points at swatch indexes.
import { landingLayouts, styleRecipes, typographyPairings } from "@dialmade/catalog";
import type { Fingerprint } from "@dialmade/doc";
import { z } from "zod";
import { VISION_MAX_SWATCHES } from "./constants";

type Values<K extends keyof Fingerprint> = readonly NonNullable<Fingerprint[K]>[];
type ColorRole = NonNullable<Fingerprint["colorRoles"]>[number]["role"];

export const VISION_MODES = ["light", "dark", "mixed"] as const satisfies Values<"mode">;
export const VISION_DENSITIES = ["airy", "balanced", "compact"] as const satisfies Values<"density">;
export const VISION_RADII = ["none", "sm", "md", "lg", "full"] as const satisfies Values<"radius">;
export const VISION_ELEVATIONS = ["none", "soft", "crisp", "deep", "glow"] as const satisfies Values<"elevation">;
export const VISION_SURFACES = ["flat", "layered", "glass", "outlined"] as const satisfies Values<"surface">;
export const VISION_HEADING_CLASSES = ["geometric", "grotesque", "humanist", "serif", "slab", "mono", "display"] as const satisfies Values<"headingClass">;
export const VISION_BODY_CLASSES = ["geometric", "grotesque", "humanist", "serif", "slab", "mono"] as const satisfies Values<"bodyClass">;
export const VISION_COLOR_ROLES = ["background", "foreground", "primary", "secondary", "cta", "muted", "border", "other"] as const satisfies readonly ColorRole[];
export const VISION_CONFIDENCES = ["high", "medium", "low"] as const satisfies Values<"confidence">;

export const NO_PAIRING = "none";
export const APP_SHELL_LAYOUT = "app-shell";
export const UNKNOWN_LAYOUT = "unknown";

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id) as [string, ...string[]];

export const VISION_RECIPE_IDS = ids(styleRecipes);
export const VISION_PAIRING_IDS = [...ids(typographyPairings), NO_PAIRING] as [string, ...string[]];
export const VISION_LAYOUT_IDS = [...ids(landingLayouts), APP_SHELL_LAYOUT, UNKNOWN_LAYOUT] as [string, ...string[]];

/** Fixed enums (no min/max, which structured outputs reject) so the compiled grammar is reused. */
const SWATCH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const REF_INDEXES = [0, 1, 2, 3] as const;

export const VisionColorRoleSchema = z.object({
  swatchIndex: z.literal(SWATCH_INDEXES).describe("Index into this screenshot's <swatches>"),
  role: z.enum(VISION_COLOR_ROLES),
});

export const VisionRefSchema = z.object({
  refIndex: z.literal(REF_INDEXES).describe("Index of the screenshot this entry describes"),
  mode: z.enum(VISION_MODES),
  density: z.enum(VISION_DENSITIES),
  radius: z.enum(VISION_RADII),
  elevation: z.enum(VISION_ELEVATIONS),
  surface: z.enum(VISION_SURFACES),
  headingClass: z.enum(VISION_HEADING_CLASSES),
  bodyClass: z.enum(VISION_BODY_CLASSES),
  recipeId: z.enum(VISION_RECIPE_IDS),
  pairingId: z.enum(VISION_PAIRING_IDS),
  layoutId: z.enum(VISION_LAYOUT_IDS),
  colorRoles: z.array(VisionColorRoleSchema),
  confidence: z.enum(VISION_CONFIDENCES),
});

export const StyleFingerprintSchema = z.object({ refs: z.array(VisionRefSchema) });

export type VisionColorRole = z.output<typeof VisionColorRoleSchema>;
export type VisionRef = z.output<typeof VisionRefSchema>;
export type StyleFingerprintAnswer = z.output<typeof StyleFingerprintSchema>;

/** Every property required, `additionalProperties: false`, enums kept (the SDK's Zod helper would move them to descriptions). */
function toStructuredOutputSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

export const STYLE_FINGERPRINT_JSON_SCHEMA = toStructuredOutputSchema(StyleFingerprintSchema);

/** `output_config.format` of the vision request (same object on every request). */
export const styleFingerprintFormat = { type: "json_schema" as const, schema: STYLE_FINGERPRINT_JSON_SCHEMA };

/**
 * One screenshot's fingerprint as the DesignDoc stores it (`Fingerprint` minus what the pixels
 * provide). Assignable to `AiFingerprint` of @dialmade/import, so it goes straight into
 * `attachFingerprint(brand, sourceId, fingerprint, model)`.
 */
export type VisionFingerprint = Omit<Fingerprint, "colors" | "method" | "model" | "tags" | "notes">;

export type FingerprintAnswerProblem = "invalid-schema" | "no-refs";

export type NormalizedFingerprint = {
  /** Kept refs, sorted by `refIndex`, with roles that point at existing swatches only. */
  answer: StyleFingerprintAnswer;
  /** By screenshot index; `null` when the answer had no usable entry for it. */
  fingerprints: (VisionFingerprint | null)[];
  /** Refs and color roles dropped (unknown screenshot, repeated, swatch out of range). */
  dropped: number;
};

export function toVisionFingerprint(ref: VisionRef): VisionFingerprint {
  return {
    mode: ref.mode,
    density: ref.density,
    radius: ref.radius,
    elevation: ref.elevation,
    surface: ref.surface,
    headingClass: ref.headingClass,
    bodyClass: ref.bodyClass,
    recipeId: ref.recipeId,
    ...(ref.pairingId !== NO_PAIRING && { pairingId: ref.pairingId }),
    ...(ref.layoutId !== UNKNOWN_LAYOUT && { layoutId: ref.layoutId }),
    colorRoles: ref.colorRoles.map(({ swatchIndex, role }) => ({ swatchIndex, role })),
    confidence: ref.confidence,
  };
}

/**
 * Validates an answer (hosted, BYOK or pasted) with the Zod schema, then against the request:
 * `swatchCounts[i]` is how many swatches screenshot `i` had. Entries for unknown or repeated
 * screenshots and roles pointing past the swatches are dropped, not fatal.
 */
export function normalizeFingerprintAnswer(
  raw: unknown,
  swatchCounts: readonly number[],
): ({ ok: true } & NormalizedFingerprint) | { ok: false; problem: FingerprintAnswerProblem; detail?: string } {
  const parsed = StyleFingerprintSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, problem: "invalid-schema", ...(issue && { detail: `${issue.path.join(".") || "(root)"}: ${issue.message}` }) };
  }

  let dropped = 0;
  const byIndex = new Map<number, VisionRef>();
  for (const ref of parsed.data.refs) {
    if (ref.refIndex >= swatchCounts.length || byIndex.has(ref.refIndex)) {
      dropped++;
      continue;
    }
    const limit = Math.min(swatchCounts[ref.refIndex] ?? 0, VISION_MAX_SWATCHES);
    const seen = new Set<string>();
    const colorRoles = ref.colorRoles.filter((entry) => {
      const key = `${entry.swatchIndex}:${entry.role}`;
      if (entry.swatchIndex >= limit || seen.has(key)) {
        dropped++;
        return false;
      }
      seen.add(key);
      return true;
    });
    byIndex.set(ref.refIndex, { ...ref, colorRoles: colorRoles.slice(0, VISION_MAX_SWATCHES) });
  }
  if (byIndex.size === 0) return { ok: false, problem: "no-refs" };

  const refs = [...byIndex.values()].sort((a, b) => a.refIndex - b.refIndex);
  return {
    ok: true,
    answer: { refs },
    fingerprints: swatchCounts.map((_, i) => {
      const ref = byIndex.get(i);
      return ref ? toVisionFingerprint(ref) : null;
    }),
    dropped,
  };
}
