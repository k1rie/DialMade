import { applyPatch, valueAtPointer, type DesignDoc, type PageElement, type PatchOperation } from "@dialmade/doc";
import { contentContextFromDoc, resolveSectionProps, sectionRegistry, type SectionRegistry } from "@dialmade/sections";
import type { CopyField } from "./fields";
import type { CopyEdits } from "./prompt";

export type CopyPatchResult = {
  /** RFC 6902 ops, each one valid on its own and all of them together. */
  patches: PatchOperation[];
  /** Edits dropped: unknown or repeated id, empty, too long, unchanged or rejected by the schemas. */
  rejected: number;
  /** Ids of the dropped edits (`f12`…), once each, in answer order: the client maps them to its sections. */
  rejectedIds: string[];
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

/** The element a field points into: a screen's page element (Modo Layout) or one of the legacy pages'. */
function fieldElement(doc: DesignDoc, field: CopyField): PageElement | undefined {
  const elementId = field.elementId!;
  if (field.screenId !== undefined) {
    const screen = Object.hasOwn(doc.screens, field.screenId) ? doc.screens[field.screenId] : undefined;
    return screen && Object.hasOwn(screen.page.elements, elementId) ? screen.page.elements[elementId] : undefined;
  }
  return Object.values(doc.pages).find((page) => page?.elements[elementId])?.elements[elementId];
}

function sectionAccepts(doc: DesignDoc, field: CopyField, registry: SectionRegistry): boolean {
  if (field.elementId === null || field.sectionType === null) return true;
  const def = registry.get(field.sectionType);
  const element = fieldElement(doc, field);
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
  const patchIds: string[] = [];
  const rejectedIds: string[] = [];
  let rejected = 0;
  const reject = (id: string) => {
    rejected++;
    if (!rejectedIds.includes(id)) rejectedIds.push(id);
  };

  for (const edit of edits) {
    const field = byId.get(edit.id);
    const text = cleanCopy(edit.text);
    if (!field || seen.has(edit.id) || text === "" || text.length > field.maxLength || text === field.current.trim()) {
      reject(edit.id);
      continue;
    }
    seen.add(edit.id);
    const op: PatchOperation = { op: field.op, path: field.pointer, value: text };
    const single = applyPatch(doc, [op]);
    if (!single.ok || !sectionAccepts(single.doc, field, registry)) {
      reject(edit.id);
      continue;
    }
    patches.push(op);
    patchIds.push(edit.id);
  }

  if (patches.length > 0 && !applyPatch(doc, patches).ok) {
    patchIds.forEach((id) => {
      if (!rejectedIds.includes(id)) rejectedIds.push(id);
    });
    return { patches: [], rejected: rejected + patches.length, rejectedIds };
  }
  return { patches, rejected, rejectedIds };
}

export type FreshOpsResult = {
  /** Ops still valid on `now`, all of them together (one undo step). */
  patches: PatchOperation[];
  /** Ops dropped: their value changed since the request (a user edit, a deleted block) or they no longer apply. */
  stale: PatchOperation[];
};

const sameJson = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * The AI answer is built against the document of the request (`before`); the user may have kept editing while
 * it ran. Keeps only the ops whose current value still equals the value at request time, so an answer never
 * overwrites a newer edit, and drops the rest instead of failing the whole answer (`applyPatch` is
 * all-or-nothing). The kept ops apply together on `now`; when they do not (a lock, a section schema that
 * changed), they are kept greedily in order while they still apply.
 */
export function dropStaleOps(before: DesignDoc, now: DesignDoc | null, ops: readonly PatchOperation[]): FreshOpsResult {
  if (!now) return { patches: [], stale: [...ops] };
  const stale: PatchOperation[] = [];
  const fresh: PatchOperation[] = [];
  for (const op of ops) {
    if (op.op === "add" || op.op === "replace") {
      if (sameJson(valueAtPointer(before, op.path), valueAtPointer(now, op.path))) fresh.push(op);
      else stale.push(op);
    } else {
      stale.push(op);
    }
  }
  if (fresh.length === 0 || applyPatch(now, fresh).ok) return { patches: fresh, stale };

  const kept: PatchOperation[] = [];
  let working = now;
  for (const op of fresh) {
    const next = applyPatch(working, [op]);
    if (next.ok) {
      kept.push(op);
      working = next.doc;
    } else {
      stale.push(op);
    }
  }
  return { patches: kept, stale };
}
