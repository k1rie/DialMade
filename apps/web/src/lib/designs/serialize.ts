// Server only (also used by tests). What a saved design is: a validated DesignDoc v2, its JSON size and a
// small preview for the cards. The client's document is never trusted as is: it is parsed (and migrated)
// with @dialmade/doc before it is stored, and again when it is read back.
import { DESIGN_DOC_VERSION, safeParseDesignDoc, themeInputFor, type DesignDoc } from "@dialmade/doc";
import { generateTheme } from "@dialmade/palette";
import type { DesignPreview } from "@/lib/db/schema";

/** A DesignDoc with several screens weighs ~100–300 KB; this leaves room and stops abuse. */
export const MAX_DOC_BYTES = 1_500_000;
export const MAX_NAME_LENGTH = 120;
export const MAX_DESIGNS_PER_USER = 200;
/** «Guardar sin cuenta»: a smaller shelf, until the device signs in. */
export const MAX_DESIGNS_ANONYMOUS = 20;

export type PreparedDesign = { doc: DesignDoc; json: string; sizeBytes: number; preview: DesignPreview; version: number };
export type PrepareFailure = { ok: false; reason: "invalid-document" | "too-large"; message: string };

/** Trims, collapses whitespace and drops control characters. `null` when nothing is left. */
export function cleanDesignName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim();
  return name.length > 0 ? name : null;
}

/** Colors for the card's gradient: the seeds, then the theme's CTA and dark-mode brand (falls back to the seeds). */
export function summarizeDesign(doc: DesignDoc): DesignPreview {
  const { primary, secondary } = doc.brand.seeds;
  let swatches: string[] = [primary, ...(secondary ? [secondary] : [])];
  try {
    const theme = generateTheme(themeInputFor(doc));
    swatches = [...new Set([...swatches, theme.light.cta, theme.dark.brand].map((color) => color.toLowerCase()))];
  } catch {}
  return {
    primary,
    ...(secondary && { secondary }),
    swatches: swatches.slice(0, 4),
    paletteStyleId: doc.brief.paletteStyleId,
    screens: doc.screenOrder.length,
    pages: Object.keys(doc.pages).length,
  };
}

/** Validates what the client sent and measures it. */
export function prepareDesign(input: unknown): { ok: true; design: PreparedDesign } | PrepareFailure {
  // Cheap guard before the full parse: a huge body is refused without walking it.
  let rawSize: number;
  try {
    rawSize = Buffer.byteLength(JSON.stringify(input) ?? "", "utf8");
  } catch {
    return { ok: false, reason: "invalid-document", message: "The document is not JSON" };
  }
  if (rawSize > MAX_DOC_BYTES) return { ok: false, reason: "too-large", message: `Over ${MAX_DOC_BYTES} bytes` };
  const parsed = safeParseDesignDoc(input);
  if (!parsed.success) return { ok: false, reason: "invalid-document", message: "Not a valid DesignDoc" };
  const json = JSON.stringify(parsed.data);
  const sizeBytes = Buffer.byteLength(json, "utf8");
  if (sizeBytes > MAX_DOC_BYTES) return { ok: false, reason: "too-large", message: `Over ${MAX_DOC_BYTES} bytes` };
  return { ok: true, design: { doc: parsed.data, json, sizeBytes, preview: summarizeDesign(parsed.data), version: DESIGN_DOC_VERSION } };
}

/** A stored document, migrated to the current version. `null` when it no longer validates. */
export function readStoredDoc(stored: unknown): DesignDoc | null {
  const value = typeof stored === "string" ? safeJson(stored) : stored;
  const parsed = safeParseDesignDoc(value);
  return parsed.success ? parsed.data : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
