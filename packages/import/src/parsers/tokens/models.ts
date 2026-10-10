import type { ParserContext } from "../../registry";
import { modeFromName } from "../../roles";
import { cleanText, isJsonObject, own, type JsonObject, type JsonValue } from "../../sanitize";
import type { Mode } from "../../types";
import { atPointer, pointerSegments } from "./alias";
import { batchDoc, findBatchFile, splitRef } from "./document";
import type { TokenDoc } from "./tree";

// How a file turns into token trees: a plain file is one layer; a DTCG resolver and Tokens Studio
// themes are «modifiers» (light/dark, brand…) whose contexts select layers. A scenario picks one
// context per modifier.

/** A token tree to merge: later layers override earlier ones. */
export interface Layer {
  doc: TokenDoc;
  root: JsonValue;
  /** Pointer segments of `root` in its file. */
  base: string[];
  /** Tokens Studio «source» sets are only for references. */
  emit: boolean;
}

export interface Modifier {
  name: string;
  contexts: string[];
  defaultContext: string;
}

export interface Model {
  format: string;
  modifiers: Modifier[];
  layers(choice: ReadonlyMap<string, string>): Layer[];
  unresolved: { path: string; reason: string }[];
  warnings: { code: string; detail?: string }[];
  /** Batch files this model reads (lowercase names): they emit nothing on their own. */
  files: Set<string>;
}

export interface Scenario {
  mode?: Mode;
  alt?: string;
  choice: Map<string, string>;
}

const MAX_SCENARIOS = 8;
const MAX_ITEMS = 64;

export function plainModel(doc: TokenDoc, format: string): Model {
  return { format, modifiers: [], layers: () => [{ doc, root: doc.root, base: [], emit: true }], unresolved: [], warnings: [], files: new Set() };
}

// ── DTCG resolver (2025.10) ─────────────────────────────────────────────────────────────────────

type Source = { layer: Layer } | { error: { path: string; reason: string } };

interface SetDef {
  kind: "set";
  sources: Source[];
}
interface ModifierDef {
  kind: "modifier";
  name: string;
  contexts: Map<string, Source[]>;
  defaultContext: string;
}

/**
 * A `.resolver.json`: `sets`, `modifiers` (`contexts`, `default`) and `resolutionOrder`, inline or by
 * `{ "$ref": "#/sets/x" }`. Sources `$ref` other files by relative path; they are found by file name
 * in the batch, never over the network. Also reads the earlier draft (`values` arrays of paths).
 */
export function resolverModel(doc: TokenDoc, ctx: ParserContext): Model {
  const unresolved: Model["unresolved"] = [];
  const files = new Set<string>();
  const root = isJsonObject(doc.root) ? doc.root : ({} as JsonObject);

  const fileLayer = (ref: string): Source => {
    const { file, fragment, remote } = splitRef(ref);
    if (remote) return { error: { path: `$ref ${ref}`, reason: "remote $ref ignored" } };
    if (!file) {
      const segments = fragment ? pointerSegments(fragment) : null;
      const value = segments ? atPointer(doc.root, segments) : undefined;
      return value === undefined ? { error: { path: `$ref ${ref}`, reason: "missing $ref target" } } : { layer: { doc, root: value, base: segments!, emit: true } };
    }
    const found = findBatchFile(ctx, file);
    if (!found) return { error: { path: `$ref ${ref}`, reason: `missing file ${file}` } };
    const loaded = batchDoc(ctx, found);
    if (!loaded.ok) return { error: { path: `$ref ${ref}`, reason: `${found.name}: ${loaded.code}` } };
    files.add(found.name.toLowerCase());
    const segments = fragment ? pointerSegments(fragment) : [];
    const value = segments ? atPointer(loaded.doc.root, segments) : undefined;
    if (value === undefined || !segments) return { error: { path: `$ref ${ref}`, reason: `missing ${fragment} in ${found.name}` } };
    return { layer: { doc: loaded.doc, root: value, base: segments, emit: true } };
  };

  const sourcesOf = (value: JsonValue | undefined, pointer: string[]): Source[] => {
    const list = Array.isArray(value) ? value.slice(0, MAX_ITEMS) : value === undefined ? [] : [value];
    return list.map((item, i): Source => {
      if (typeof item === "string") return fileLayer(item);
      if (isJsonObject(item)) {
        const ref = own(item, "$ref");
        if (typeof ref === "string") return fileLayer(ref);
        return { layer: { doc, root: item, base: [...pointer, String(i)], emit: true } };
      }
      return { error: { path: pointer.join("/"), reason: "invalid source" } };
    });
  };

  const setOf = (value: JsonObject, pointer: string[]): SetDef => {
    const sources = own(value, "sources") ?? own(value, "values");
    return { kind: "set", sources: sourcesOf(sources, [...pointer, own(value, "sources") !== undefined ? "sources" : "values"]) };
  };

  const modifierOf = (value: JsonObject, fallbackName: string, pointer: string[]): ModifierDef => {
    const name = typeof own(value, "name") === "string" ? cleanText(own(value, "name") as string, 64) : fallbackName;
    const contexts = new Map<string, Source[]>();
    const raw = own(value, "contexts");
    if (isJsonObject(raw)) {
      for (const key of Object.keys(raw).slice(0, MAX_ITEMS)) contexts.set(cleanText(key, 64), sourcesOf(raw[key], [...pointer, "contexts", key]));
    } else {
      const values = own(value, "values");
      if (Array.isArray(values)) {
        values.slice(0, MAX_ITEMS).forEach((v, i) => {
          if (isJsonObject(v) && typeof own(v, "name") === "string") {
            contexts.set(cleanText(own(v, "name") as string, 64), sourcesOf(own(v, "values") ?? own(v, "sources"), [...pointer, "values", String(i)]));
          }
        });
      }
    }
    const declared = own(value, "default");
    const defaultContext = typeof declared === "string" && contexts.has(declared) ? declared : ([...contexts.keys()][0] ?? "");
    return { kind: "modifier", name, contexts, defaultContext };
  };

  const definitionAt = (ref: string): SetDef | ModifierDef | null => {
    const segments = pointerSegments(ref);
    const value = segments ? atPointer(doc.root, segments) : undefined;
    if (!segments || !isJsonObject(value)) return null;
    const isModifier = segments[0] === "modifiers" || own(value, "contexts") !== undefined || own(value, "type") === "modifier";
    return isModifier ? modifierOf(value, segments[segments.length - 1] ?? "modifier", segments) : setOf(value, segments);
  };

  const order: (SetDef | ModifierDef)[] = [];
  const resolutionOrder = own(root, "resolutionOrder");
  if (Array.isArray(resolutionOrder)) {
    resolutionOrder.slice(0, MAX_ITEMS).forEach((item, i) => {
      if (!isJsonObject(item)) return;
      const ref = own(item, "$ref");
      if (typeof ref === "string") {
        const def = ref.startsWith("#") ? definitionAt(ref) : { kind: "set" as const, sources: [fileLayer(ref)] };
        if (def) order.push(def);
        else unresolved.push({ path: `resolutionOrder/${i}`, reason: `missing ${ref}` });
        return;
      }
      const pointer = ["resolutionOrder", String(i)];
      const isModifier = own(item, "type") === "modifier" || own(item, "contexts") !== undefined;
      order.push(isModifier ? modifierOf(item, `modifier-${i}`, pointer) : setOf(item, pointer));
    });
  } else {
    const collect = (group: JsonValue | undefined, kind: "sets" | "modifiers") => {
      const entries: [string, JsonValue][] = Array.isArray(group)
        ? group.map((v, i) => [isJsonObject(v) && typeof own(v, "name") === "string" ? (own(v, "name") as string) : String(i), v])
        : isJsonObject(group)
          ? Object.entries(group)
          : [];
      for (const [name, value] of entries.slice(0, MAX_ITEMS)) {
        if (!isJsonObject(value)) continue;
        order.push(kind === "sets" ? setOf(value, [kind, name]) : modifierOf(value, name, [kind, name]));
      }
    };
    collect(own(root, "sets"), "sets");
    collect(own(root, "modifiers"), "modifiers");
  }

  const seen = new Set<string>();
  const report = (source: Source) => {
    if (!("error" in source)) return;
    const key = `${source.error.path}|${source.error.reason}`;
    if (!seen.has(key)) {
      seen.add(key);
      unresolved.push(source.error);
    }
  };
  for (const def of order) {
    if (def.kind === "set") def.sources.forEach(report);
    else for (const list of def.contexts.values()) list.forEach(report);
  }

  const modifiers: Modifier[] = order
    .filter((d): d is ModifierDef => d.kind === "modifier" && d.contexts.size > 0)
    .map((d) => ({ name: d.name, contexts: [...d.contexts.keys()], defaultContext: d.defaultContext }));
  const layersOf = (sources: Source[]) => sources.flatMap((s) => ("layer" in s ? [s.layer] : []));
  return {
    format: "dtcg-resolver",
    modifiers,
    layers: (choice) =>
      order.flatMap((def) => (def.kind === "set" ? layersOf(def.sources) : layersOf(def.contexts.get(choice.get(def.name) ?? def.defaultContext) ?? []))),
    unresolved,
    warnings: [],
    files,
  };
}

// ── Tokens Studio ───────────────────────────────────────────────────────────────────────────────

type SetState = "enabled" | "source";

interface Theme {
  name: string;
  group: string;
  sets: Map<string, SetState>;
}

function themesOf(value: JsonValue | undefined): Theme[] {
  if (!Array.isArray(value)) return [];
  const out: Theme[] = [];
  for (const item of value.slice(0, MAX_ITEMS)) {
    if (!isJsonObject(item)) continue;
    const name = own(item, "name");
    if (typeof name !== "string" || !name.trim()) continue;
    const group = own(item, "group");
    const selected = own(item, "selectedTokenSets");
    const sets = new Map<string, SetState>();
    const add = (set: string, state: JsonValue | undefined) => {
      if (state === "enabled" || state === "source") sets.set(set, state);
    };
    if (isJsonObject(selected)) for (const [set, state] of Object.entries(selected)) add(set, state);
    else if (Array.isArray(selected)) for (const s of selected) if (isJsonObject(s) && typeof own(s, "id") === "string") add(own(s, "id") as string, own(s, "status"));
    out.push({ name: cleanText(name, 64), group: typeof group === "string" && group.trim() ? cleanText(group, 64) : "theme", sets });
  }
  return out;
}

const orderOf = (metadata: JsonValue | undefined): string[] => {
  const order = isJsonObject(metadata) ? own(metadata, "tokenSetOrder") : undefined;
  return Array.isArray(order) ? order.filter((s): s is string => typeof s === "string").slice(0, 500) : [];
};

/** Without `$themes`: sets named light/dark become a «mode» modifier over the other sets. */
function syntheticThemes(sets: readonly string[]): Theme[] {
  const modeSets = sets.filter((s) => modeFromName(s));
  const base = sets.filter((s) => !modeFromName(s));
  if (modeSets.length === 0) return [{ name: "all", group: "theme", sets: new Map(sets.map((s) => [s, "enabled" as const])) }];
  const modes = [...new Set(modeSets.map((s) => modeFromName(s)!))];
  return modes.map((mode) => ({
    name: mode,
    group: "mode",
    sets: new Map([...base, ...modeSets.filter((s) => modeFromName(s) === mode)].map((s) => [s, "enabled" as const])),
  }));
}

function studioModelFrom(themes: Theme[], setOrder: string[], setLayer: (set: string) => Layer | { error: string }, warnings: Model["warnings"], files: Set<string>): Model {
  const unresolved: Model["unresolved"] = [];
  const groups = new Map<string, Theme[]>();
  for (const theme of themes) groups.set(theme.group, [...(groups.get(theme.group) ?? []), theme]);
  const modifiers: Modifier[] = [...groups].map(([name, list]) => ({ name, contexts: list.map((t) => t.name), defaultContext: list[0]!.name }));
  const rank = new Map(setOrder.map((s, i) => [s, i]));
  const layerCache = new Map<string, Layer | null>();
  const layerFor = (set: string) => {
    if (!layerCache.has(set)) {
      const result = setLayer(set);
      if ("error" in result) {
        unresolved.push({ path: `set ${set}`, reason: result.error });
        layerCache.set(set, null);
      } else layerCache.set(set, result);
    }
    return layerCache.get(set) ?? null;
  };
  for (const theme of themes) for (const set of theme.sets.keys()) layerFor(set);
  return {
    format: "tokens-studio",
    modifiers,
    layers(choice) {
      const states = new Map<string, SetState>();
      for (const [group, list] of groups) {
        const theme = list.find((t) => t.name === choice.get(group)) ?? list[0]!;
        for (const [set, state] of theme.sets) if (states.get(set) !== "enabled") states.set(set, state);
      }
      return [...states]
        .sort(([a], [b]) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER))
        .flatMap(([set, state]) => {
          const layer = layerFor(set);
          return layer ? [{ ...layer, emit: state === "enabled" }] : [];
        });
    },
    unresolved,
    warnings,
    files,
  };
}

/** One Tokens Studio file: sets at the top level, `$themes`, `$metadata.tokenSetOrder`. */
export function studioModel(doc: TokenDoc): Model {
  const root = isJsonObject(doc.root) ? doc.root : ({} as JsonObject);
  const sets = Object.keys(root).filter((k) => !k.startsWith("$") && isJsonObject(root[k]!));
  const order = orderOf(own(root, "$metadata"));
  const setOrder = [...order.filter((s) => sets.includes(s)), ...sets.filter((s) => !order.includes(s))];
  const declared = themesOf(own(root, "$themes")).filter((t) => [...t.sets.keys()].some((s) => sets.includes(s)));
  const themes = declared.length > 0 ? declared : syntheticThemes(setOrder);
  return studioModelFrom(
    themes,
    setOrder,
    (set) => (sets.includes(set) ? { doc, root: root[set]!, base: [set], emit: true } : { error: "missing set" }),
    [],
    new Set(),
  );
}

/** Tokens Studio's multi-file sync: `$themes.json` reads its sets (`core/colors` → `colors.json`) from the batch. */
export function studioThemesModel(doc: TokenDoc, ctx: ParserContext): Model {
  const files = new Set<string>();
  const metadataFile = findBatchFile(ctx, "$metadata.json");
  const metadata = metadataFile ? batchDoc(ctx, metadataFile) : undefined;
  if (metadataFile && metadata?.ok) files.add(metadataFile.name.toLowerCase());
  const themes = themesOf(doc.root);
  const allSets = [...new Set(themes.flatMap((t) => [...t.sets.keys()]))];
  const order = metadata?.ok ? orderOf(metadata.doc.root) : [];
  const setOrder = [...order.filter((s) => allSets.includes(s)), ...allSets.filter((s) => !order.includes(s))];
  return studioModelFrom(
    themes,
    setOrder,
    (set) => {
      const base = set.slice(set.lastIndexOf("/") + 1);
      const found = findBatchFile(ctx, `${set}.json`) ?? findBatchFile(ctx, `${base}.json`);
      if (!found) return { error: `missing file ${base}.json` };
      const loaded = batchDoc(ctx, found);
      if (!loaded.ok) return { error: `${found.name}: ${loaded.code}` };
      files.add(found.name.toLowerCase());
      return { doc: loaded.doc, root: loaded.doc.root, base: [], emit: true };
    },
    [],
    files,
  );
}

export const isStudioThemesRoot = (root: JsonValue): boolean =>
  Array.isArray(root) && root.some((t) => isJsonObject(t) && own(t, "selectedTokenSets") !== undefined);

export const isStudioMetadataRoot = (root: JsonValue): boolean =>
  isJsonObject(root) && own(root, "tokenSetOrder") !== undefined && Object.keys(root).every((k) => k === "tokenSetOrder" || k.startsWith("$") || k === "activeThemes");

export const isStudioRoot = (root: JsonValue): boolean => isJsonObject(root) && (own(root, "$themes") !== undefined || own(root, "$metadata") !== undefined);

export const isResolverRoot = (root: JsonValue): boolean =>
  isJsonObject(root) && (own(root, "resolutionOrder") !== undefined || (own(root, "modifiers") !== undefined && own(root, "sets") !== undefined));

// ── scenarios ───────────────────────────────────────────────────────────────────────────────────

/**
 * One scenario per light/dark context of the mode modifier (the one with light/dark contexts), the
 * other modifiers at their default. Each other context becomes an alternative scenario (at most 8 in
 * all): its values are offered with lower confidence so the user picks.
 */
export function scenariosOf(model: Model, fallbackMode?: Mode): { scenarios: Scenario[]; warnings: Model["warnings"] } {
  const defaults = new Map(model.modifiers.map((m) => [m.name, m.defaultContext]));
  const modeModifier = model.modifiers.find((m) => m.contexts.some((c) => modeFromName(c)));
  /** `default` + `dark`: the unnamed default context is the light one. */
  const modeOf = (context: string): Mode | undefined =>
    modeFromName(context) ??
    (modeModifier && context === modeModifier.defaultContext && !modeModifier.contexts.some((c) => modeFromName(c) === "light") ? "light" : undefined);
  const scenarios: Scenario[] = [];
  const asMode = new Set<string>();
  if (modeModifier) {
    const seen = new Set<Mode>();
    const contexts = [modeModifier.defaultContext, ...modeModifier.contexts.filter((c) => c !== modeModifier.defaultContext)];
    for (const context of contexts) {
      const mode = modeOf(context);
      if (!mode || seen.has(mode)) continue;
      seen.add(mode);
      asMode.add(context);
      scenarios.push({ mode, choice: new Map(defaults).set(modeModifier.name, context) });
    }
  } else scenarios.push({ ...(fallbackMode && { mode: fallbackMode }), choice: new Map(defaults) });

  const warnings: Model["warnings"] = [];
  const base = scenarios[0]!;
  for (const modifier of model.modifiers) {
    const others = modifier.contexts.filter((c) => (modifier === modeModifier ? !asMode.has(c) : c !== modifier.defaultContext));
    if (others.length === 0) continue;
    warnings.push({ code: "resolver-modifier", detail: cleanText(`${modifier.name}: ${modifier.defaultContext} (default), ${others.join(", ")}`, 200) });
    for (const context of others) {
      if (scenarios.length >= MAX_SCENARIOS) break;
      const mode = modifier === modeModifier ? (modeOf(modifier.defaultContext) ?? base.mode) : base.mode;
      scenarios.push({ ...(mode && { mode }), alt: cleanText(`${modifier.name}=${context}`, 64), choice: new Map(base.choice).set(modifier.name, context) });
    }
  }
  return { scenarios, warnings };
}
