import { modeFromName } from "../../roles";
import { isJsonObject, jsonPointerLocator, own, type JsonObject, type JsonValue } from "../../sanitize";
import type { Mode } from "../../types";
import { aliasPath, pointerSegments } from "./alias";

/** A parsed token file of the batch. */
export interface TokenDoc {
  /** File name (cleaned), for locators and `$ref`. */
  name: string;
  root: JsonValue;
  /** No `$value` anywhere: tokens are `value`/`type` (Style Dictionary, Tokens Studio, DTCG drafts). */
  legacy: boolean;
}

export interface TokenNode {
  /** Unique per parse (memo key of the alias resolver). */
  id: number;
  /** Segments from the tree root (`["color", "brand", "500"]`; a `$root` token keeps `$root`). */
  path: string[];
  key: string;
  /** `$value` (or legacy `value`) as written. */
  value: JsonValue;
  /** Declared or inherited `$type`, as written. */
  type?: string;
  deprecated: boolean;
  extensions?: JsonObject;
  doc: TokenDoc;
  /** JSON Pointer in its file: `#/color/brand/500`. */
  pointer: string;
  /** Overrides `<file> <pointer>` (DESIGN.md: `DESIGN.md:4 colors.primary`). */
  locator?: string;
}

export interface FlatTree {
  tokens: TokenNode[];
  /** `$extends`: group path → referenced group path. */
  extends: { group: string[]; target: string[] }[];
  /** More than `maxTokens`: the rest was not read. */
  truncated: boolean;
}

export interface FlattenOptions {
  maxTokens: number;
  /** Pointer of `root` inside the file (a Tokens Studio set, a `$ref` fragment). */
  base?: readonly string[];
  /** `$type` inherited from above `root`. */
  type?: string;
}

let nextId = 0;
export const newNodeId = (): number => ++nextId;

const typeString = (v: JsonValue | undefined): string | undefined => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : undefined);
const deprecatedOf = (v: JsonValue | undefined): boolean | undefined => (v === undefined ? undefined : v !== false);

/** A token object: `$value`, or (legacy files) `value` that is not a group of further tokens. */
export function isTokenObject(node: JsonObject, legacy: boolean): boolean {
  if (own(node, "$value") !== undefined) return true;
  if (!legacy) return false;
  const value = own(node, "value");
  if (value === undefined) return false;
  if (!isJsonObject(value)) return true;
  return !Object.values(value).some((v) => isJsonObject(v) && (own(v, "value") !== undefined || own(v, "$value") !== undefined));
}

/** `{a.b}` or `#/a/b` → `["a", "b"]`. */
export function groupReference(ref: string, base: readonly string[] = []): string[] | null {
  const alias = aliasPath(ref);
  if (alias !== null) return alias.split(".").filter(Boolean);
  const segments = pointerSegments(ref);
  if (!segments) return null;
  return base.every((s, i) => segments[i] === s) ? segments.slice(base.length) : segments;
}

/**
 * Every token under `root`, in document order, iteratively (no recursion): `$type` and `$deprecated`
 * inherited from groups, `$root` tokens kept, `$extends` collected for `applyExtends`. Stops after
 * `maxTokens`.
 */
export function flatten(doc: TokenDoc, root: JsonValue, options: FlattenOptions): FlatTree {
  const out: FlatTree = { tokens: [], extends: [], truncated: false };
  interface Frame {
    node: JsonValue;
    path: string[];
    type: string | undefined;
    deprecated: boolean;
  }
  const base = [...(options.base ?? [])];
  const stack: Frame[] = [{ node: root, path: [], type: options.type, deprecated: false }];
  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (!isJsonObject(frame.node)) continue;
    const node = frame.node;
    const isToken = frame.path.length > 0 && isTokenObject(node, doc.legacy);
    const ownType = typeString(own(node, "$type")) ?? (doc.legacy ? typeString(own(node, "type")) : undefined);
    const type = ownType ?? frame.type;
    const deprecated = deprecatedOf(own(node, "$deprecated")) ?? frame.deprecated;
    if (isToken) {
      if (out.tokens.length >= options.maxTokens) {
        out.truncated = true;
        break;
      }
      const value = own(node, "$value") ?? own(node, "value")!;
      const extensions = own(node, "$extensions");
      out.tokens.push({
        id: newNodeId(),
        path: frame.path,
        key: frame.path.join("."),
        value,
        ...(type && { type }),
        deprecated,
        ...(isJsonObject(extensions) && { extensions }),
        doc,
        pointer: jsonPointerLocator([...base, ...frame.path]),
      });
      continue;
    }
    const ext = own(node, "$extends");
    if (typeof ext === "string") {
      const target = groupReference(ext, base);
      if (target && target.length > 0) out.extends.push({ group: frame.path, target });
    }
    const keys = Object.keys(node);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i]!;
      if (key.startsWith("$") && key !== "$root") continue;
      const child = node[key]!;
      if (isJsonObject(child)) stack.push({ node: child, path: [...frame.path, key], type, deprecated });
    }
  }
  return out;
}

const MAX_EXTENDS = 256;

/**
 * DTCG `$extends`: a group inherits the tokens of another one (its own tokens win). Chains are
 * followed up to `maxHops`; cycles and missing targets are reported.
 */
export function applyExtends(tree: FlatTree, maxHops: number): { tokens: TokenNode[]; unresolved: { path: string; reason: string }[] } {
  const unresolved: { path: string; reason: string }[] = [];
  if (tree.extends.length === 0) return { tokens: tree.tokens, unresolved };
  const byKey = new Map(tree.tokens.map((t) => [t.key, t]));
  const links = new Map(tree.extends.slice(0, MAX_EXTENDS).map((l) => [l.group.join("."), l]));
  if (tree.extends.length > MAX_EXTENDS) unresolved.push({ path: "$extends", reason: `more than ${MAX_EXTENDS} $extends` });
  const done = new Set<string>();
  const visiting = new Set<string>();
  const expand = (groupKey: string, depth: number) => {
    if (done.has(groupKey)) return;
    const link = links.get(groupKey)!;
    const targetKey = link.target.join(".");
    const label = groupKey || "(root)";
    if (visiting.has(groupKey) || depth > maxHops) {
      unresolved.push({ path: label, reason: depth > maxHops ? `$extends chain longer than ${maxHops}` : "$extends cycle" });
      done.add(groupKey);
      return;
    }
    if (targetKey === groupKey || targetKey.startsWith(`${groupKey}.`) || groupKey.startsWith(`${targetKey}.`) || groupKey === "") {
      unresolved.push({ path: label, reason: `$extends {${targetKey}} contains itself` });
      done.add(groupKey);
      return;
    }
    visiting.add(groupKey);
    if (links.has(targetKey)) expand(targetKey, depth + 1);
    const prefix = `${targetKey}.`;
    let found = false;
    for (const token of [...byKey.values()]) {
      if (!token.key.startsWith(prefix)) continue;
      found = true;
      const path = [...link.group, ...token.path.slice(link.target.length)];
      const key = path.join(".");
      if (!byKey.has(key)) byKey.set(key, { ...token, id: newNodeId(), path, key });
    }
    if (!found) unresolved.push({ path: label, reason: `$extends target {${targetKey}} not found` });
    visiting.delete(groupKey);
    done.add(groupKey);
  };
  for (const key of links.keys()) expand(key, 0);
  return { tokens: [...byKey.values()], unresolved };
}

/** Extension keys that hold one value per mode (ours, Figma's, Terrazzo's `mode`). */
const MODE_EXTENSIONS: readonly (readonly string[])[] = [["design.dialmade", "modes"], ["com.figma.modes"], ["com.figma", "modes"], ["mode"], ["modes"]];

/** Per-mode values a token carries in `$extensions` (`{ light, dark }`, `{ "Light": …, "Dark": … }`). */
export function modeValues(node: TokenNode): Partial<Record<Mode, JsonValue>> | null {
  const ext = node.extensions;
  if (!ext) return null;
  for (const path of MODE_EXTENSIONS) {
    let map: JsonValue | undefined = ext;
    for (const segment of path) map = isJsonObject(map) ? own(map, segment) : undefined;
    if (!isJsonObject(map)) continue;
    const out: Partial<Record<Mode, JsonValue>> = {};
    for (const [name, value] of Object.entries(map)) {
      const mode = modeFromName(name);
      if (mode && out[mode] === undefined) out[mode] = value;
    }
    if (out.light !== undefined || out.dark !== undefined) return out;
  }
  return null;
}

/** A mode named by the file: root `$extensions` (`com.figma.modeName`) or its name (`Dark.tokens.json`). */
export function fileMode(doc: TokenDoc): Mode | undefined {
  const ext = isJsonObject(doc.root) ? own(doc.root, "$extensions") : undefined;
  if (isJsonObject(ext)) {
    for (const key of ["com.figma.modeName", "com.figma.mode", "mode"]) {
      const value = own(ext, key);
      const mode = typeof value === "string" ? modeFromName(value) : undefined;
      if (mode) return mode;
    }
    const figma = own(ext, "com.figma");
    const name = isJsonObject(figma) ? own(figma, "modeName") : undefined;
    const mode = typeof name === "string" ? modeFromName(name) : undefined;
    if (mode) return mode;
  }
  return modeFromName(doc.name.replace(/\.(?:tokens\.)?json$/i, ""));
}
