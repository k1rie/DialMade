import { FingerprintSchema, type Fingerprint } from "@dialmade/doc";
import type { RoleKey } from "@dialmade/palette";
import { normalizeColor } from "../color";
import { isFrameworkDefault } from "../defaults";
import { mergeColors } from "../merge";
import { featuresFromBrand, nearestRecipe } from "../recipe";
import { cleanText } from "../sanitize";
import type { Confidence, ImportedBrand, ImportedColor, Mode } from "../types";

/** The style fingerprint the vision AI returns for one screenshot: attributes and swatch indexes, never hex. */
export type AiFingerprint = Omit<Fingerprint, "colors" | "method">;

const AI_ROLES: Readonly<Record<string, RoleKey | undefined>> = {
  background: "background",
  foreground: "foreground",
  primary: "primary",
  secondary: "secondary",
  cta: "cta",
  muted: "muted",
  border: "border",
};

/** density → `brief.dials.density` (spec §5). */
export const DENSITY_DIAL: Readonly<Record<string, number>> = { airy: 3, balanced: 5, compact: 7 };

/**
 * Adds the vision AI's fingerprint to a screenshot of the batch: it is validated with the DesignDoc's
 * Zod schema (swatch indexes must point into the screenshot's own swatches), its color roles become
 * unlocked `method: "ai"` chips whose hex comes from the pixels, and colors and the nearest recipe
 * are recomputed (AI has the lowest precedence). A previous fingerprint of the same screenshot is
 * replaced. Invalid input leaves the brand as it was, with a warning.
 */
export function attachFingerprint(brand: ImportedBrand, sourceId: string, fingerprint: AiFingerprint, model?: string): ImportedBrand {
  const shot = brand.screenshots?.find((s) => s.sourceId === sourceId);
  const source = brand.sources.find((s) => s.id === sourceId);
  const fail = (code: string, detail?: string): ImportedBrand => ({
    ...brand,
    warnings: [...brand.warnings, { sourceId, code, ...(detail && { detail: cleanText(detail, 200) }) }],
  });
  if (!shot || !source) return fail("fingerprint-unknown-source");
  const parsed = FingerprintSchema.safeParse({ ...fingerprint, colors: shot.swatches, method: "ai", ...(model && { model }) });
  if (!parsed.success) return fail("invalid-fingerprint", parsed.error.issues[0]?.message);
  const fp = parsed.data;
  const mode: Mode | undefined = fp.mode === "light" || fp.mode === "dark" ? fp.mode : shot.mode !== "ambiguous" ? shot.mode : undefined;
  const confidence: Confidence = fp.confidence ?? "low";

  const aiColors: ImportedColor[] = (fp.colorRoles ?? []).flatMap((entry, i) => {
    const role = AI_ROLES[entry.role];
    const swatch = shot.swatches[entry.swatchIndex];
    const color = swatch ? normalizeColor(swatch) : null;
    if (!role || !color?.ok) return [];
    const c: ImportedColor = {
      id: `${sourceId}:ai${i}`,
      sourceId,
      locator: cleanText(`${source.fileName} · ai #${entry.swatchIndex}`, 200),
      confidence,
      method: "ai",
      ...color.color,
      role,
      ...(mode && { mode }),
    };
    return [isFrameworkDefault(c) ? { ...c, isFrameworkDefault: true } : c];
  });

  const kept = brand.colors
    .filter((c) => !(c.sourceId === sourceId && c.method === "ai"))
    .map(({ overriddenBy: _overriddenBy, ...c }) => c);
  const colors = mergeColors([...kept, ...aiColors], brand.sources);
  const screenshots = (brand.screenshots ?? []).map((s) => (s.sourceId === sourceId ? { ...s, fingerprint: fp } : s));
  const recipe = nearestRecipe(featuresFromBrand({ ...brand, colors, screenshots }));
  const { recipe: _previous, ...rest } = brand;
  return { ...rest, colors, screenshots, ...(recipe && { recipe }) };
}

/**
 * Takes a screenshot's AI suggestions back out (the «Analizar estilo con IA» switch turned off): its
 * `method: "ai"` colors and AI fingerprint go; the fingerprint `base` (the batch before the AI) had
 * for it comes back. Colors and the nearest recipe are recomputed.
 */
export function detachFingerprint(brand: ImportedBrand, sourceId: string, base?: Pick<ImportedBrand, "screenshots">): ImportedBrand {
  const shot = brand.screenshots?.find((s) => s.sourceId === sourceId);
  const hasAi = brand.colors.some((c) => c.sourceId === sourceId && c.method === "ai");
  if (!shot || (!hasAi && shot.fingerprint?.method !== "ai")) return brand;
  const kept = brand.colors
    .filter((c) => !(c.sourceId === sourceId && c.method === "ai"))
    .map(({ overriddenBy: _overriddenBy, ...c }) => c);
  const colors = mergeColors(kept, brand.sources);
  const original = base?.screenshots?.find((s) => s.sourceId === sourceId)?.fingerprint;
  const screenshots = (brand.screenshots ?? []).map((s) => {
    if (s.sourceId !== sourceId) return s;
    const { fingerprint: _ai, ...rest } = s;
    return original && original.method !== "ai" ? { ...rest, fingerprint: original } : rest;
  });
  const recipe = nearestRecipe(featuresFromBrand({ ...brand, colors, screenshots }));
  const { recipe: _previous, ...rest } = brand;
  return { ...rest, colors, screenshots, ...(recipe && { recipe }) };
}
