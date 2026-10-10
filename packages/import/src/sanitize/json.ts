import { IMPORT_LIMITS } from "../limits";
import { cleanText } from "./text";

/** Keys that could reach `Object.prototype` if a consumer ever spreads or assigns the data. */
const DANGEROUS_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

export const isDangerousKey = (key: string): boolean => DANGEROUS_KEYS.has(key);

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
/** Objects built here have a null prototype. */
export type JsonObject = { [key: string]: JsonValue };

/** An object without prototype: `__proto__` is a plain key there and nothing is inherited. */
export const nullRecord = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

/** Own enumerable entry lookup that never reaches a prototype. */
export const own = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface JsonIssue {
  code: "dangerous-key" | "invalid-value";
  /** JSON Pointer of the dropped member. */
  path: string;
}

export type SafeJsonResult =
  | { ok: true; value: JsonValue; issues: JsonIssue[]; nodes: number }
  | { ok: false; code: "too-deep" | "too-many-nodes" | "invalid-json"; detail?: string };

export interface SafeJsonOptions {
  maxDepth?: number;
  maxNodes?: number;
}

/**
 * Deepest nesting of `[`/`{` in JSON text, stopping as soon as it passes `limit`. A linear scan that
 * skips strings, so 10,000 nested arrays are rejected before `JSON.parse` sees them.
 */
export function jsonDepth(text: string, limit = Infinity): number {
  let depth = 0;
  let deepest = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (inString) {
      if (code === 0x5c) i++;
      else if (code === 0x22) inString = false;
      continue;
    }
    if (code === 0x22) inString = true;
    else if (code === 0x5b || code === 0x7b) {
      depth++;
      if (depth > deepest) {
        deepest = depth;
        if (deepest > limit) return deepest;
      }
    } else if (code === 0x5d || code === 0x7d) depth--;
  }
  return deepest;
}

const escapeSegment = (segment: string | number) => String(segment).replace(/~/g, "~0").replace(/\//g, "~1");

interface Frame {
  source: unknown;
  assign: (value: JsonValue) => void;
  depth: number;
  path: string;
}

/**
 * Copies parsed data (JSON.parse, YAML) into plain JSON with null-prototype objects, iteratively:
 * dangerous keys and non-JSON values are dropped and reported, shared references (YAML aliases) are
 * copied but count toward `maxNodes`, and anything deeper than `maxDepth` fails.
 */
export function toSafeJson(input: unknown, options: SafeJsonOptions = {}): SafeJsonResult {
  const maxDepth = options.maxDepth ?? IMPORT_LIMITS.tokens.maxDepth;
  const maxNodes = options.maxNodes ?? IMPORT_LIMITS.maxJsonNodes;
  const issues: JsonIssue[] = [];
  let root: JsonValue = null;
  let nodes = 0;
  const stack: Frame[] = [{ source: input, assign: (v) => (root = v), depth: 0, path: "" }];
  while (stack.length > 0) {
    const { source, assign, depth, path } = stack.pop()!;
    if (++nodes > maxNodes) return { ok: false, code: "too-many-nodes", detail: `more than ${maxNodes} values` };
    if (source === null || typeof source === "string" || typeof source === "boolean") {
      assign(source);
    } else if (typeof source === "number") {
      if (Number.isFinite(source)) assign(source);
      else {
        issues.push({ code: "invalid-value", path });
        assign(null);
      }
    } else if (source instanceof Date) {
      assign(Number.isNaN(source.getTime()) ? null : source.toISOString());
    } else if (typeof source === "object") {
      if (depth >= maxDepth) return { ok: false, code: "too-deep", detail: `nesting deeper than ${maxDepth}` };
      if (Array.isArray(source)) {
        const out: JsonValue[] = new Array<JsonValue>(source.length).fill(null);
        assign(out);
        for (let i = source.length - 1; i >= 0; i--) {
          stack.push({ source: source[i], assign: (v) => (out[i] = v), depth: depth + 1, path: `${path}/${i}` });
        }
      } else {
        const out = nullRecord<JsonValue>() as JsonObject;
        assign(out);
        const keys = Object.keys(source);
        for (let i = keys.length - 1; i >= 0; i--) {
          const key = keys[i]!;
          const childPath = `${path}/${escapeSegment(key)}`;
          if (isDangerousKey(key)) {
            issues.push({ code: "dangerous-key", path: childPath });
            continue;
          }
          const value = (source as Record<string, unknown>)[key];
          if (value === undefined) continue;
          stack.push({ source: value, assign: (v) => (out[key] = v), depth: depth + 1, path: childPath });
        }
      }
    } else {
      issues.push({ code: "invalid-value", path });
      assign(null);
    }
  }
  issues.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { ok: true, value: root, issues, nodes };
}

/**
 * `JSON.parse` behind a depth pre-scan, then `toSafeJson`. Never throws: invalid JSON, nesting past
 * `maxDepth` (64) and more than `maxNodes` values come back as `{ ok: false }`.
 */
export function parseJsonSafe(text: string, options: SafeJsonOptions = {}): SafeJsonResult {
  const maxDepth = options.maxDepth ?? IMPORT_LIMITS.tokens.maxDepth;
  if (jsonDepth(text, maxDepth) > maxDepth) return { ok: false, code: "too-deep", detail: `nesting deeper than ${maxDepth}` };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, code: "invalid-json", detail: cleanText(error instanceof Error ? error.message : String(error), 160) };
  }
  return toSafeJson(parsed, options);
}

export type JsonPath = readonly (string | number)[];

/**
 * Depth-first walk without recursion. `visit` returns `false` to skip a node's children. Children are
 * visited in document order.
 */
export function walkJson(root: JsonValue, visit: (node: JsonValue, path: JsonPath, depth: number) => boolean | void): void {
  const stack: { node: JsonValue; path: JsonPath }[] = [{ node: root, path: [] }];
  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (visit(node, path, path.length) === false) continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push({ node: node[i]!, path: [...path, i] });
    } else if (isJsonObject(node)) {
      const keys = Object.keys(node);
      for (let i = keys.length - 1; i >= 0; i--) stack.push({ node: node[keys[i]!]!, path: [...path, keys[i]!] });
    }
  }
}

/** `["color", "brand", 500]` → `#/color/brand/500` (the locator style of token files). */
export const jsonPointerLocator = (path: JsonPath): string => `#${path.map((s) => `/${escapeSegment(s)}`).join("")}`;
