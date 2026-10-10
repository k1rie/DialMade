import jsonpatch, { type Operation } from "fast-json-patch";
import { z } from "zod";
import { cloneJson } from "./json";
import { DesignDocSchema, type DesignDoc } from "./schema";

const Pointer = z.string().regex(/^(?:\/(?:[^~/]|~[01])*)*$/, "Expected a JSON Pointer (RFC 6901)");

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

export type PatchFailureReason = "invalid-operation" | "operation-failed" | "test-failed" | "invalid-document";

export interface PatchFailure {
  reason: PatchFailureReason;
  message: string;
  /** Index of the failing operation (operation errors only). */
  index?: number;
  /** Zod issues (`invalid-operation` and `invalid-document`). */
  issues?: z.core.$ZodIssue[];
}

export type PatchResult = { ok: true; doc: DesignDoc } | { ok: false; error: PatchFailure };

/**
 * Applies an RFC 6902 patch and validates the result against DesignDoc v1. Never mutates `doc`.
 * A failing patch (malformed op, unresolvable path, failed `test`, or a result the schema rejects —
 * including `pages[k].kind !== k`) returns `{ ok: false }` so the caller can discard it.
 */
export function applyPatch(doc: DesignDoc, ops: unknown): PatchResult {
  const parsedOps = PatchSchema.safeParse(ops);
  if (!parsedOps.success) {
    return { ok: false, error: { reason: "invalid-operation", message: "Malformed JSON Patch", issues: parsedOps.error.issues } };
  }
  for (const [index, op] of parsedOps.data.entries()) {
    if ((op.op === "add" || op.op === "replace" || op.op === "test") && !("value" in op && op.value !== undefined)) {
      return { ok: false, error: { reason: "invalid-operation", message: `Operation ${index} needs a value`, index } };
    }
  }

  let next: unknown = cloneJson(doc);
  for (const [index, op] of parsedOps.data.entries()) {
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
  }

  const result = DesignDocSchema.safeParse(next);
  if (!result.success) {
    return { ok: false, error: { reason: "invalid-document", message: "The patched document is invalid", issues: result.error.issues } };
  }
  return { ok: true, doc: result.data };
}

/** The RFC 6902 patch that turns `from` into `to` (for undo/redo or sync). */
export function diffDesignDocs(from: DesignDoc, to: DesignDoc): PatchOperation[] {
  return jsonpatch.compare(from, to) as PatchOperation[];
}
