import { IMPORT_LIMITS, type ImportLimits } from "../../limits";
import type { BatchFile, ParserContext } from "../../registry";
import { cleanText, decodeText, parseJsonSafe, type JsonIssue } from "../../sanitize";
import type { TokenDoc } from "./tree";

export type LoadedDoc = { ok: true; doc: TokenDoc; issues: JsonIssue[] } | { ok: false; code: string; detail?: string };

/** The context's limits, or the defaults when a host passes none. */
export function limitsOf(ctx: Pick<ParserContext, "limits">): ImportLimits {
  const limits = ctx.limits as Partial<ImportLimits> | undefined;
  return limits?.tokens && limits.maxJsonNodes ? (limits as ImportLimits) : IMPORT_LIMITS;
}

/** JSON → token doc with the depth (64) and node caps; never throws. */
export function loadTokenDoc(name: string, text: string, limits: ImportLimits): LoadedDoc {
  if (text.trim().length === 0) return { ok: false, code: "empty-file" };
  const parsed = parseJsonSafe(text, { maxDepth: limits.tokens.maxDepth, maxNodes: limits.maxJsonNodes });
  if (!parsed.ok) return { ok: false, code: parsed.code, ...(parsed.detail && { detail: parsed.detail }) };
  return { ok: true, doc: { name, root: parsed.value, legacy: !text.includes('"$value"') }, issues: parsed.issues };
}

const cache = new WeakMap<readonly BatchFile[], Map<string, LoadedDoc>>();

/** A token file of the batch, parsed once per batch (the batch array is shared by every parse call). */
export function batchDoc(ctx: ParserContext, file: BatchFile): LoadedDoc {
  let docs = cache.get(ctx.batch);
  if (!docs) {
    docs = new Map();
    cache.set(ctx.batch, docs);
  }
  const cached = docs.get(file.sourceId);
  if (cached) return cached;
  const loaded = file.text === undefined ? ({ ok: false, code: "unsupported-format" } as const) : loadTokenDoc(file.name, file.text, limitsOf(ctx));
  docs.set(file.sourceId, loaded);
  return loaded;
}

/** Text of the file being parsed (decoded by the core; bytes as a fallback). */
export const inputText = (input: { text?: string; bytes: Uint8Array }): string => input.text ?? decodeText(input.bytes)?.text ?? "";

const REMOTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** `./themes/Dark.json#/color` → `{ file: "dark.json", fragment: "#/color" }`; remote refs are flagged. */
export function splitRef(ref: string): { file?: string; fragment?: string; remote?: boolean } {
  const text = ref.trim();
  if (REMOTE.test(text)) return { remote: true };
  const hash = text.indexOf("#");
  const path = hash >= 0 ? text.slice(0, hash) : text;
  const fragment = hash >= 0 ? text.slice(hash) : undefined;
  const clean = path.split("?")[0]!;
  const base = clean.slice(Math.max(clean.lastIndexOf("/"), clean.lastIndexOf("\\")) + 1);
  let file = base;
  try {
    file = decodeURIComponent(base);
  } catch {
    file = base;
  }
  return { ...(file && { file: cleanText(file, 128).toLowerCase() }), ...(fragment !== undefined && { fragment }) };
}

const stripJson = (name: string) => name.toLowerCase().replace(/\.(?:tokens\.json|tokens|json)$/, "");

/** A token file of the batch by name: exact, then without `.json`/`.tokens.json` (relative paths match by file name). */
export function findBatchFile(ctx: ParserContext, fileName: string): BatchFile | undefined {
  const wanted = fileName.toLowerCase();
  const tokenFiles = ctx.batch.filter((f) => f.parserId === "tokens");
  return tokenFiles.find((f) => f.name.toLowerCase() === wanted) ?? tokenFiles.find((f) => stripJson(f.name) === stripJson(wanted));
}
