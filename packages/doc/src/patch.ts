import jsonpatch, { type Operation } from "fast-json-patch";
import { z } from "zod";
import { cloneJson, jsonEqual } from "./json";
import { hardLocks, lockPointer } from "./locks";
import { JSON_POINTER, coversPointer, missingAncestors, parentPointer, pointersOverlap, valueAtPointer } from "./pointer";
import { DesignDocSchema, documentSizeIssues, type DesignDoc, type Lock, type LockPointer } from "./schema";

const Pointer = z.string().regex(JSON_POINTER, "Expected a JSON Pointer (RFC 6901)");

export const PatchOperationSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("add"), path: Pointer, value: z.unknown() }),
  z.strictObject({ op: z.literal("remove"), path: Pointer }),
  z.strictObject({ op: z.literal("replace"), path: Pointer, value: z.unknown() }),
  z.strictObject({ op: z.literal("move"), from: Pointer, path: Pointer }),
  z.strictObject({ op: z.literal("copy"), from: Pointer, path: Pointer }),
  z.strictObject({ op: z.literal("test"), path: Pointer, value: z.unknown() }),
]);

export const PatchSchema = z.array(PatchOperationSchema).max(500);

/** One RFC 6902 operation. */
export type PatchOperation = z.output<typeof PatchOperationSchema>;

export type PatchFailureReason = "invalid-operation" | "operation-failed" | "test-failed" | "invalid-document" | "locked";

export interface PatchFailure {
  reason: PatchFailureReason;
  message: string;
  /** Index of the failing operation (operation and lock errors). */
  index?: number;
  /** Zod issues (`invalid-operation` and `invalid-document`). */
  issues?: z.core.$ZodIssue[];
  /** The lock that rejected the patch (`locked` only). */
  lock?: string;
}

export type PatchResult = { ok: true; doc: DesignDoc } | { ok: false; error: PatchFailure };

export interface ApplyPatchOptions {
  /**
   * Lets the patch change locked values and remove locks. Only for explicit user actions
   * («Desbloquear», editing a locked chip); never for shuffles, palette styles or the AI.
   */
  allowLocked?: boolean;
}

export const LOCKS_POINTER = "/brief/locks";

/**
 * Pointers an operation may change. Inserting into or removing from an array shifts the items after
 * it, so then the whole array counts as touched (a lock on `/references/1` sees an insert at 0).
 */
function touchedBy(op: PatchOperation, before: unknown): string[] {
  if (op.op === "test") return [];
  const targets = op.op === "move" ? [op.path, op.from] : [op.path];
  if (op.op === "replace") return targets;
  return targets.map((path) => (path !== "" && Array.isArray(valueAtPointer(before, parentPointer(path))) ? parentPointer(path) : path));
}

/**
 * Documents `applyPatch` returned. They are JSON-clean (built from a JSON clone or from other clean documents
 * and cloned operation values, then parsed) and, like every DesignDoc, never mutated: a patch on one of them
 * copies only the objects along the operations' paths (`ownAncestors`) instead of the whole document.
 */
const PATCHED = new WeakSet<object>();

const isContainer = (value: unknown): value is object => typeof value === "object" && value !== null;

/**
 * Copy-on-write before jsonpatch mutates `root` in place at `pointer`: every object or array from the root to
 * the parent of the target that the patch does not own yet (`owned`) is replaced by a shallow copy, so the
 * input document never changes and untouched subtrees keep their identity. The walk follows jsonpatch's own
 * key rules (unescaping, `-` and integer keys of arrays) and stops where jsonpatch would fail or leave the
 * own properties (it then throws before mutating anything). Returns the (possibly new) root.
 */
function ownAncestors(root: unknown, pointer: string, owned: WeakSet<object>): unknown {
  if (!isContainer(root)) return root;
  const own = (value: object): object => {
    if (owned.has(value)) return value;
    const copy = Array.isArray(value) ? value.slice() : { ...value };
    owned.add(copy);
    return copy;
  };
  const top = own(root);
  const keys = pointer.split("/");
  let parent: object = top;
  for (let t = 1; t < keys.length - 1; t++) {
    const raw = keys[t]!.replace(/~1/g, "/").replace(/~0/g, "~");
    // jsonpatch refuses these (it throws before changing anything); `constructor` alone is a normal key.
    if (raw === "__proto__" || (raw === "prototype" && keys[t - 1] === "constructor")) return top;
    let key: string | number = raw;
    if (Array.isArray(parent)) {
      if (!/^\d*$/.test(raw)) return top;
      key = ~~raw;
    }
    if (!Object.hasOwn(parent, key)) return top;
    const child = (parent as Record<string | number, unknown>)[key];
    if (!isContainer(child)) return top;
    const copy = own(child);
    if (copy !== child) (parent as Record<string | number, unknown>)[key] = copy;
    parent = copy;
  }
  return top;
}

/**
 * Structural sharing after the parse. `next` is the patched input of the parse and `prev` the document the patch
 * started from (one `applyPatch` returned, so a parse output itself). Where `next` still holds `prev`'s very
 * object (the copy on write never touched it), the parse output there equals that object (parsing is
 * idempotent on its own output: the schema has no transforms, defaults are already filled), so `prev`'s object
 * is used instead. Unchanged screens, elements and blocks keep their identity across edits: the undo history
 * stores only what changed and the preview can skip what did not. Only the copies made on write (`owned`) can
 * still hold `prev`'s objects, so only they are walked (a value an operation wrote is new all the way down).
 * `out` is only written where it holds a container the parse just built (never inside `z.unknown()` values,
 * which the parse passes by reference: there `out` is `next` itself and nothing changes).
 */
function reuseUntouched(out: unknown, next: unknown, prev: unknown, owned: WeakSet<object>): unknown {
  if (next === prev) return prev;
  return isContainer(next) && owned.has(next) ? reuseInside(out, next, prev, owned) : out;
}

/** `reuseUntouched` below `out` itself, which stays (the document root is always a new object, as before). */
function reuseInside(out: unknown, next: unknown, prev: unknown, owned: WeakSet<object>): unknown {
  if (!isContainer(out) || !isContainer(next) || !isContainer(prev)) return out;
  if (Array.isArray(out) !== Array.isArray(next) || Array.isArray(next) !== Array.isArray(prev)) return out;
  const target = out as Record<string, unknown>;
  const from = next as Record<string, unknown>;
  const base = prev as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    if (!Object.hasOwn(from, key) || !Object.hasOwn(base, key)) continue;
    const value = reuseUntouched(target[key], from[key], base[key], owned);
    if (value !== target[key]) target[key] = value;
  }
  return out;
}

/** The hard lock an operation breaks: a locked value that changed, or a lock that disappeared. */
function brokenLock(touched: readonly string[], original: DesignDoc, next: unknown, locks: readonly string[]): string | undefined {
  if (touched.length === 0) return undefined;
  for (const lock of locks) {
    if (!touched.some((path) => pointersOverlap(lock, path))) continue;
    if (!jsonEqual(valueAtPointer(original, lock), valueAtPointer(next, lock))) return lock;
  }
  if (touched.some((path) => pointersOverlap(LOCKS_POINTER, path))) {
    const current = valueAtPointer(next, LOCKS_POINTER);
    const kept = new Set(Array.isArray(current) ? current : []);
    return locks.find((lock) => !kept.has(lock));
  }
  return undefined;
}

/**
 * Applies an RFC 6902 patch and validates the result against the current DesignDoc (v2, no migration:
 * `replace /version 1` is invalid). Never mutates `doc`.
 * A failing patch (malformed op, unresolvable path, failed `test`, or a result the schema rejects —
 * including `pages[k].kind !== k`) returns `{ ok: false }` so the caller can discard it.
 *
 * Hard locks (JSON Pointers in `brief.locks`): an operation that changes a locked value (at the
 * pointer or below it, also through an ancestor) or removes a lock fails with `reason: "locked"`,
 * unless `options.allowLocked`. Rewriting an ancestor that leaves the locked value equal is allowed.
 * Legacy lock keys are soft and never block. Replaying `diffDesignDocs` across an unlock needs `allowLocked`.
 */
export function applyPatch(doc: DesignDoc, ops: unknown, options: ApplyPatchOptions = {}): PatchResult {
  const parsedOps = PatchSchema.safeParse(ops);
  if (!parsedOps.success) {
    return { ok: false, error: { reason: "invalid-operation", message: "Malformed JSON Patch", issues: parsedOps.error.issues } };
  }
  for (const [index, op] of parsedOps.data.entries()) {
    if ((op.op === "add" || op.op === "replace" || op.op === "test") && !("value" in op && op.value !== undefined)) {
      return { ok: false, error: { reason: "invalid-operation", message: `Operation ${index} needs a value`, index } };
    }
  }

  const locks = options.allowLocked ? [] : hardLocks(doc);
  // jsonpatch mutates the document it walks. A document this function returned is copied on write, path by
  // path (`ownAncestors`); any other is cloned whole first (it may hold `undefined` members or other non-JSON
  // values the clone drops, as before).
  let ownedWhole = !PATCHED.has(doc);
  let next: unknown = ownedWhole ? cloneJson(doc) : doc;
  const owned = new WeakSet<object>();
  // jsonpatch inserts `op.value` by reference: a later op (`add …/-`) would mutate the caller's ops.
  const operations = cloneJson(parsedOps.data);
  for (const [index, op] of operations.entries()) {
    const touched = locks.length > 0 ? touchedBy(op, next) : [];
    if (!ownedWhole && op.op !== "test" && op.path !== "") {
      if (op.op === "move") {
        // A move removes and then adds on the shifted document: own all of it (rare; same cost as before).
        next = cloneJson(next);
        ownedWhole = true;
      } else {
        next = ownAncestors(next, op.path, owned);
      }
    }
    try {
      next = jsonpatch.applyOperation(next, op as Operation, true, true, true, index).newDocument;
    } catch (error) {
      const failure = error instanceof jsonpatch.JsonPatchError ? error : undefined;
      return {
        ok: false,
        error: {
          reason: failure?.name === "TEST_OPERATION_FAILED" ? "test-failed" : "operation-failed",
          message: failure ? `${failure.name}: ${failure.message.split("\n")[0]}` : String(error),
          index,
        },
      };
    }
    const lock = locks.length > 0 ? brokenLock(touched, doc, next, locks) : undefined;
    if (lock) {
      return { ok: false, error: { reason: "locked", message: `"${lock}" is locked; unlock it first`, index, lock } };
    }
  }

  const oversized = documentSizeIssues(next);
  if (oversized.length > 0) {
    return { ok: false, error: { reason: "invalid-document", message: "The patched document is invalid", issues: oversized } };
  }
  const result = DesignDocSchema.safeParse(next);
  if (!result.success) {
    return { ok: false, error: { reason: "invalid-document", message: "The patched document is invalid", issues: result.error.issues } };
  }
  const patched = (ownedWhole ? result.data : reuseInside(result.data, next, doc, owned)) as DesignDoc;
  PATCHED.add(patched);
  return { ok: true, doc: patched };
}

/** The RFC 6902 patch that turns `from` into `to` (for undo/redo or sync). */
export function diffDesignDocs(from: DesignDoc, to: DesignDoc): PatchOperation[] {
  return jsonpatch.compare(from, to) as PatchOperation[];
}

/**
 * Operations that write `value` at `pointer`: `{}` for each missing ancestor (skipping the ones in
 * `created`, which it updates), then `replace` or `add`.
 */
export function setValueOps(doc: unknown, pointer: string, value: unknown, created: Set<string> = new Set()): PatchOperation[] {
  const ops: PatchOperation[] = [];
  for (const ancestor of missingAncestors(doc, pointer)) {
    if (created.has(ancestor)) continue;
    created.add(ancestor);
    ops.push({ op: "add", path: ancestor, value: {} });
  }
  const exists = created.has(pointer) || valueAtPointer(doc, pointer) !== undefined;
  created.add(pointer);
  ops.push({ op: exists ? "replace" : "add", path: pointer, value });
  return ops;
}

export interface LockOptions extends ApplyPatchOptions {
  /** Writes this value at the pointer in the same step (e.g. freezing a derived value before locking it). */
  value?: unknown;
}

/**
 * Adds a hard lock on `pointer` (and, with `value`, sets it first, creating missing parent objects
 * such as `/tokens/color/scales`). A pointer already covered by a hard lock is left as is. Setting a
 * value under an existing lock needs `allowLocked`.
 */
export function lock(doc: DesignDoc, pointer: LockPointer, options: LockOptions = {}): PatchResult {
  const ops: PatchOperation[] = options.value === undefined ? [] : setValueOps(doc, pointer, options.value);
  if (!hardLocks(doc).some((existing) => coversPointer(existing, pointer))) {
    ops.push({ op: "add", path: `${LOCKS_POINTER}/-`, value: pointer });
  }
  return applyPatch(doc, ops, { allowLocked: options.allowLocked ?? false });
}

export interface UnlockOptions {
  /** Also removes the locks below `pointer` («Desbloquear todo» on a group). */
  subtree?: boolean;
}

/**
 * «Desbloquear»: removes the lock on `pointer` and its legacy alias (`/brief/pairingId` also drops
 * `"pairingId"`). A pointer that stays covered by an ancestor lock is still locked (see `lockedBy`).
 */
export function unlock(doc: DesignDoc, pointer: Lock, options: UnlockOptions = {}): PatchResult {
  const target = lockPointer(pointer);
  const ops: PatchOperation[] = [];
  doc.brief.locks.forEach((lock, index) => {
    const at = lockPointer(lock);
    if (at === target || (options.subtree && coversPointer(target, at))) ops.push({ op: "remove", path: `${LOCKS_POINTER}/${index}` });
  });
  return applyPatch(doc, ops.reverse(), { allowLocked: true });
}
