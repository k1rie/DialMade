import { hardLocks } from "./locks";
import { LOCKS_POINTER, applyPatch, setValueOps, type ApplyPatchOptions, type PatchOperation, type PatchResult } from "./patch";
import { coversPointer, pointersOverlap, type DocPointer } from "./pointer";
import { LockPointerSchema, type Confidence, type DesignDoc, type ImportField, type ImportRecordInput } from "./schema";

export type ImportMethod = ImportField["method"];

/** One value the user accepted in «Esto detectamos». */
export interface ImportedValue {
  /** Where it goes: `/tokens/color/dark/border`, `/tokens/typography/heading`, `/brand/seeds/primary`… */
  path: DocPointer;
  value: unknown;
  /** Where it was found: `globals.css:58 --border`, `#/color/brand/500`, `captura 2`. */
  locator: string;
  confidence: Confidence;
  method: ImportMethod;
  /** Lock it («tu guía manda»). Default: own source, exact or high confidence and not `method: "ai"`. */
  lock?: boolean;
}

export interface ApplyImportInput {
  /** The source, without `fields` (they are built from `values`). */
  source: Omit<ImportRecordInput, "fields">;
  values: readonly ImportedValue[];
}

const LOCKING_CONFIDENCE: ReadonlySet<Confidence> = new Set(["exact", "high"]);

export function shouldLockImported(value: ImportedValue, ownership: ImportRecordInput["ownership"]): boolean {
  return value.lock ?? (ownership === "own" && value.method !== "ai" && LOCKING_CONFIDENCE.has(value.confidence));
}

/**
 * The RFC 6902 patch of an import, to apply in one step (one undo): writes each accepted value
 * (creating missing parent objects), adds the locks, and records the source in `provenance.imports`.
 *
 * - The last value for a path wins.
 * - Re-importing a `sourceId` updates its record: fields at the new paths are replaced, the rest kept,
 *   `dismissed` merged. Fields of other sources under a new path are dropped (they no longer hold).
 * - A pointer already covered by a hard lock gets no new lock.
 * - Nothing is written to `/brief/locks` directly (throws `TypeError`).
 *
 * Concatenate more operations (references, seeds) before applying when they belong to the same step.
 */
export function importPatch(doc: DesignDoc, input: ApplyImportInput): PatchOperation[] {
  const byPath = new Map<string, ImportedValue>();
  for (const value of input.values) {
    if (pointersOverlap(LOCKS_POINTER, value.path)) throw new TypeError(`An import cannot write ${value.path}`);
    byPath.delete(value.path);
    byPath.set(value.path, value);
  }
  const values = [...byPath.values()];
  const paths = values.map((value) => value.path);
  const replaced = (path: string) => paths.some((p) => coversPointer(p, path));

  const ops: PatchOperation[] = [];
  const created = new Set<string>();
  for (const value of values) ops.push(...setValueOps(doc, value.path, value.value, created));

  const locks = hardLocks(doc);
  for (const value of values) {
    if (!shouldLockImported(value, input.source.ownership)) continue;
    if (!LockPointerSchema.safeParse(value.path).success) continue;
    if (locks.some((existing) => coversPointer(existing, value.path))) continue;
    locks.push(value.path);
    ops.push({ op: "add", path: `${LOCKS_POINTER}/-`, value: value.path });
  }

  const fields: ImportField[] = values.map(({ path, locator, confidence, method }) => ({ path, locator, confidence, method }));
  const imports = doc.provenance.imports;
  if (!imports) {
    ops.push({ op: "add", path: "/provenance/imports", value: [{ ...input.source, fields }] });
    return ops;
  }
  const index = imports.findIndex((record) => record.sourceId === input.source.sourceId);
  imports.forEach((record, i) => {
    if (i === index) return;
    const kept = record.fields.filter((field) => !replaced(field.path));
    if (kept.length !== record.fields.length) ops.push({ op: "replace", path: `/provenance/imports/${i}/fields`, value: kept });
  });
  if (index < 0) {
    ops.push({ op: "add", path: "/provenance/imports/-", value: { ...input.source, fields } });
  } else {
    const previous = imports[index]!;
    const dismissed = [...new Set([...previous.dismissed, ...(input.source.dismissed ?? [])])];
    ops.push({
      op: "replace",
      path: `/provenance/imports/${index}`,
      value: { ...input.source, fields: [...previous.fields.filter((field) => !replaced(field.path)), ...fields], dismissed },
    });
  }
  return ops;
}

/**
 * Applies an import (`importPatch`) and validates the result. Fails with `reason: "locked"` when a
 * value would change a locked one (show it as a conflict, or pass `allowLocked` after «Desbloquear»),
 * and with `invalid-document` when a value or the record is invalid (e.g. a third-party source
 * writing colors).
 */
export function applyImport(doc: DesignDoc, input: ApplyImportInput, options: ApplyPatchOptions = {}): PatchResult {
  let ops: PatchOperation[];
  try {
    ops = importPatch(doc, input);
  } catch (error) {
    return { ok: false, error: { reason: "invalid-operation", message: error instanceof Error ? error.message : String(error) } };
  }
  return applyPatch(doc, ops, options);
}
