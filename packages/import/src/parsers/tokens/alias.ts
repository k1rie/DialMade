import { isJsonObject, nullRecord, own, type JsonObject, type JsonValue } from "../../sanitize";

// One resolver for references in token values, shared by the tokens and DESIGN.md parsers:
// `{group.token}` (whole value or inside text), `{ "$ref": "#/a/b/$value/0" }` (JSON Pointer, also to
// sub-values), hop limit and cycle detection. Resolved targets are memoized, so shared references
// (alias "bombs") cost one resolution each.

/** A referenced value. `key` identifies it for the memo and cycle detection. */
export interface AliasTarget<S> {
  value: JsonValue;
  key: string;
  /** Where nested references of `value` are looked up. */
  scope: S;
}

export interface AliasHost<S> {
  /** `{a.b.c}` → the token at `a.b.c`, seen from `scope`. */
  lookup(path: string, scope: S): AliasTarget<S> | undefined;
  /** `$ref` → its target, or why not. Without it, `$ref` objects are plain values. */
  ref?(ref: string, scope: S): AliasTarget<S> | { error: string };
  /** A resolved value as text, for references inside strings. Default: strings and numbers. */
  toText?(value: JsonValue): string | null;
}

export interface AliasOptions {
  /** Longest chain of references (32). */
  maxHops: number;
  /** Total resolution steps before giving up (bounds hostile files). */
  maxSteps?: number;
}

export type Resolved = { ok: true; value: JsonValue } | { ok: false; reason: string };

/** `depth`: references followed below the value; `keep`: a failure that does not depend on the path (memoized). */
type Walked = ({ ok: true; value: JsonValue } | { ok: false; reason: string; keep: boolean }) & { depth: number };

const WHOLE = /^\{([^{}]{1,512})\}$/;
const INNER = /\{([^{}]{1,512})\}/g;
const MAX_REF_TEXT = 4096;

/** `{color.brand.500}` → `color.brand.500`; anything else → null. */
export function aliasPath(value: JsonValue): string | null {
  if (typeof value !== "string" || value.length > 520) return null;
  const match = WHOLE.exec(value.trim());
  return match ? match[1]!.trim() : null;
}

export const hasReference = (value: string): boolean => value.length <= MAX_REF_TEXT && value.includes("{") && /\{[^{}]{1,512}\}/.test(value);

/** RFC 6901: `#/a~1b/0` → `["a/b", "0"]`; `null` when it is not a local pointer. */
export function pointerSegments(pointer: string): string[] | null {
  const hash = pointer.indexOf("#");
  const fragment = hash >= 0 ? pointer.slice(hash + 1) : pointer;
  if (fragment === "" || fragment === "/") return fragment === "" ? [] : [""];
  if (!fragment.startsWith("/")) return null;
  return fragment
    .slice(1)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

/** The value at a pointer inside parsed JSON (own keys only). */
export function atPointer(root: JsonValue, segments: readonly string[]): JsonValue | undefined {
  let node: JsonValue | undefined = root;
  for (const segment of segments) {
    if (Array.isArray(node)) {
      if (!/^(?:0|[1-9]\d{0,8})$/.test(segment)) return undefined;
      node = node[Number(segment)];
    } else if (isJsonObject(node)) node = own(node, segment);
    else return undefined;
    if (node === undefined) return undefined;
  }
  return node;
}

export interface AliasResolver<S> {
  resolve(value: JsonValue, scope: S): Resolved;
  /** Steps used so far. */
  readonly steps: number;
}

export function createAliasResolver<S>(host: AliasHost<S>, options: AliasOptions): AliasResolver<S> {
  const maxSteps = options.maxSteps ?? 500_000;
  /** Resolved targets with the length of the reference chain below them. */
  const memo = new Map<string, Walked>();
  const active = new Set<string>();
  let steps = 0;
  const toText = host.toText ?? ((v: JsonValue) => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : null));
  const tooLong = (): Walked => ({ ok: false, reason: `alias chain longer than ${options.maxHops}`, depth: 0, keep: false });

  /** `hops`: references followed to reach `t`, this one included. */
  const target = (t: AliasTarget<S>, hops: number, label: string): Walked => {
    const cached = memo.get(t.key);
    if (cached) return cached.ok && hops + cached.depth > options.maxHops ? tooLong() : cached;
    if (hops > options.maxHops) return tooLong();
    if (active.has(t.key)) return { ok: false, reason: `alias cycle at ${label}`, depth: 0, keep: true };
    active.add(t.key);
    const result = walk(t.value, t.scope, hops);
    active.delete(t.key);
    if (result.ok || result.keep) memo.set(t.key, result);
    return result;
  };

  const follow = (path: string, scope: S, hops: number): Walked => {
    const found = host.lookup(path, scope);
    if (!found) return { ok: false, reason: `missing token {${path}}`, depth: 0, keep: true };
    const r = target(found, hops + 1, `{${path}}`);
    return r.ok ? { ...r, depth: r.depth + 1 } : r;
  };

  function walk(value: JsonValue, scope: S, hops: number): Walked {
    if (++steps > maxSteps) return { ok: false, reason: "too many references", depth: 0, keep: false };
    if (typeof value === "string") {
      const whole = aliasPath(value);
      if (whole !== null) return follow(whole, scope, hops);
      if (!hasReference(value)) return { ok: true, value, depth: 0 };
      const state: { failure?: Walked; depth: number } = { depth: 0 };
      const text = value.replace(INNER, (_m, path: string) => {
        if (state.failure) return "";
        const r = follow(path.trim(), scope, hops);
        const t = r.ok ? toText(r.value) : null;
        if (t === null) state.failure = r.ok ? { ok: false, reason: `{${path.trim()}} is not text`, depth: 0, keep: true } : r;
        else state.depth = Math.max(state.depth, r.depth);
        return t ?? "";
      });
      return state.failure ?? { ok: true, value: text, depth: state.depth };
    }
    if (Array.isArray(value)) {
      const out: JsonValue[] = [];
      let depth = 0;
      for (const item of value) {
        const r = walk(item, scope, hops);
        if (!r.ok) return r;
        out.push(r.value);
        depth = Math.max(depth, r.depth);
      }
      return { ok: true, value: out, depth };
    }
    if (isJsonObject(value)) {
      const ref = own(value, "$ref");
      if (typeof ref === "string" && host.ref) {
        const found = host.ref(ref, scope);
        if ("error" in found) return { ok: false, reason: found.error, depth: 0, keep: true };
        const r = target(found, hops + 1, ref);
        return r.ok ? { ...r, depth: r.depth + 1 } : r;
      }
      const out = nullRecord<JsonValue>() as JsonObject;
      let depth = 0;
      for (const key of Object.keys(value)) {
        const r = walk(value[key]!, scope, hops);
        if (!r.ok) return r;
        out[key] = r.value;
        depth = Math.max(depth, r.depth);
      }
      return { ok: true, value: out, depth };
    }
    return { ok: true, value, depth: 0 };
  }

  const strip = (r: Walked): Resolved => (r.ok ? { ok: true, value: r.value } : { ok: false, reason: r.reason });
  return {
    resolve: (value, scope) => strip(walk(value, scope, 0)),
    get steps() {
      return steps;
    },
  };
}
