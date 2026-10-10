import { applyPatch, type DesignDoc, type PatchOperation } from "@dialmade/doc";
import { contentContextFromDoc, resolveSectionProps, sectionRegistry, type SectionRegistry } from "@dialmade/sections";
import type { CopyField } from "./fields";
import type { CopyEdits } from "./prompt";

export type CopyPatchResult = {
  /** RFC 6902 ops, each one valid on its own and all of them together. */
  patches: PatchOperation[];
  /** Edits dropped: unknown or repeated id, empty, too long, unchanged or rejected by the schemas. */
  rejected: number;
};

const CONTROL = /[\u0000-\u001f\u007f\u2028\u2029]/g;

/** One line, no control characters, no surrounding quotes the model sometimes adds. */
export function cleanCopy(text: string): string {
  return text
    .replace(CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["“”«»]+(.*?)["“”«»]+$/u, "$1")
    .trim();
}

function sectionAccepts(doc: DesignDoc, field: CopyField, registry: SectionRegistry): boolean {
  if (field.elementId === null || field.sectionType === null) return true;
  const def = registry.get(field.sectionType);
  const element = Object.values(doc.pages).find((page) => page?.elements[field.elementId!])?.elements[field.elementId];
  if (!def || !element) return false;
  const ctx = contentContextFromDoc(doc, { locale: doc.brief.locale });
  return !resolveSectionProps(def, element.props, ctx).invalidKeys.includes(field.path[0]!);
}

/**
 * Turns the model's `{ id, text }` edits into a patch over the fields that were offered. Every op is
 * checked against the DesignDoc schema (`applyPatch`) and the section's own schema; invalid ones are
 * dropped instead of failing the whole answer.
 */
export function editsToPatches(
  doc: DesignDoc,
  fields: readonly CopyField[],
  edits: CopyEdits["edits"],
  registry: SectionRegistry = sectionRegistry,
): CopyPatchResult {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const seen = new Set<string>();
  const patches: PatchOperation[] = [];
  let rejected = 0;

  for (const edit of edits) {
    const field = byId.get(edit.id);
    const text = cleanCopy(edit.text);
    if (!field || seen.has(edit.id) || text === "" || text.length > field.maxLength || text === field.current.trim()) {
      rejected++;
      continue;
    }
    seen.add(edit.id);
    const op: PatchOperation = { op: field.op, path: field.pointer, value: text };
    const single = applyPatch(doc, [op]);
    if (!single.ok || !sectionAccepts(single.doc, field, registry)) {
      rejected++;
      continue;
    }
    patches.push(op);
  }

  if (patches.length > 0 && !applyPatch(doc, patches).ok) return { patches: [], rejected: rejected + patches.length };
  return { patches, rejected };
}
