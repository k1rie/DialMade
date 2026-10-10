// One block from raw model HTML to what the document stores: sanitize (gate 2–3), headings (6), contrast with
// token-level fixes (4), new contact text (7). Gate 1 (structure) runs before, on the stream; gate 5 (responsive)
// after, in the iframe; gate 8 (coherence) across blocks. A block that fails falls back to the base design.
import type { AiBlock, AiGateWarning } from "@dialmade/doc";
import { fixContrast, type ThemeColors } from "./contrast";
import { hash32 } from "./direction";
import { extraGateWarnings, fixHeadings, newContacts, snippet, warning } from "./gates";
import type { RenderBlockInput } from "./prompt";
import { droppedClassRatio, sanitizeBlock, sanitizeSurfaceClasses, type SanitizeFailure, type SanitizeReport } from "./sanitize";
import { attr, serialize } from "./tree";

/** Gate 2: above this share of dropped class tokens the block is not trusted. */
export const MAX_DROPPED_CLASS_RATIO = 0.15;

export type BlockContext = {
  block: RenderBlockInput;
  screenIds: readonly string[];
  theme: ThemeColors;
};

export type ProcessedBlock =
  | { ok: true; html: string; surfaceClasses?: string[]; gates: AiBlock["gates"]; report: SanitizeReport }
  | { ok: false; failure: SanitizeFailure | "hostile" | "too-many-dropped"; report: SanitizeReport | null };

const droppedCount = (report: SanitizeReport) =>
  Object.values(report.droppedTags).reduce((a, b) => a + b, 0) +
  Object.values(report.droppedAttrs).reduce((a, b) => a + b, 0) +
  (report.classesTotal - report.classesKept);

export function processBlock(raw: string, context: BlockContext): ProcessedBlock {
  const { block } = context;
  const sanitized = sanitizeBlock(raw, { blockId: block.id, screenIds: context.screenIds });
  if (!sanitized.ok) return { ok: false, failure: sanitized.failure, report: sanitized.report };
  const { report, tree } = sanitized;
  if (report.hostile > 0) return { ok: false, failure: "hostile", report };
  if (droppedClassRatio(report) > MAX_DROPPED_CLASS_RATIO) return { ok: false, failure: "too-many-dropped", report };

  const warnings: AiGateWarning[] = [];
  const dropped = droppedCount(report);
  if (report.classesTotal - report.classesKept > 0) warnings.push(warning("classes-dropped", String(report.classesTotal - report.classesKept)));
  for (const icon of report.unknownIcons.slice(0, 3)) warnings.push(warning("unknown-icon", icon));

  if (block.container) {
    // Containers keep only the surface of their root (spec §1 [C15]): its children are other blocks.
    const surfaceClasses = sanitizeSurfaceClasses((attr(tree, "class") ?? "").split(/\s+/).filter(Boolean));
    return { ok: true, html: "", surfaceClasses, gates: { contrast: "ok", responsive: "ok", dropped, warnings }, report };
  }

  const headings = fixHeadings(tree, block.h1 === true);
  if (headings > 0) warnings.push(warning("heading-fixed", String(headings)));

  const contrast = fixContrast(tree, context.theme);
  if (contrast.fixed > 0) warnings.push(warning("contrast-fixed", String(contrast.fixed)));
  const seen = new Set<string>();
  for (const issue of contrast.remaining) {
    const detail = `${issue.ratio.toFixed(1)}:1 · ${snippet(issue.element.children) || issue.element.tag} (${issue.kind === "text" ? "" : `${issue.kind}, `}${issue.mode})`;
    if (seen.has(detail) || seen.size >= 4) continue;
    seen.add(detail);
    warnings.push(warning(issue.kind === "focus" ? "focus-ring" : "contrast", detail));
  }

  const contacts = newContacts(tree, [...block.draft, block.label, block.note ?? ""]);
  for (const contact of contacts.slice(0, 3)) warnings.push(warning("new-contact", contact));
  warnings.push(...extraGateWarnings(tree, [...block.draft, block.label, block.note ?? ""]));

  return {
    ok: true,
    html: serialize([tree]),
    gates: { contrast: contrast.status, responsive: "ok", dropped, warnings: warnings.slice(0, 16) },
    report,
  };
}

/**
 * What an AI block was made from (spec §8.4): type, label, note, count, size, copy, language and direction. When the
 * layout or the base copy changes, the stored block is «Desactualizado».
 */
export function blockBasis(block: RenderBlockInput, locale: string, directionId: string): string {
  const { id: _id, linksTo: _links, h1: _h1, ...rest } = block;
  return hash32(JSON.stringify({ ...rest, locale, directionId })).toString(36);
}
