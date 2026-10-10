import type { ImportLimits } from "../../limits";
import type { BatchFile, ParserContext, ParserInput } from "../../registry";
import { cleanText, isJsonObject, own, type JsonValue } from "../../sanitize";
import type { Mode, ParseOutput } from "../../types";
import { aliasPath, atPointer, createAliasResolver, pointerSegments, type AliasHost, type AliasResolver, type Resolved } from "./alias";
import { batchDoc, findBatchFile, inputText, limitsOf, loadTokenDoc, splitRef } from "./document";
import { emitTokens, type Observation } from "./emit";
import {
  isResolverRoot,
  isStudioMetadataRoot,
  isStudioRoot,
  isStudioThemesRoot,
  plainModel,
  resolverModel,
  scenariosOf,
  studioModel,
  studioThemesModel,
  type Layer,
  type Model,
} from "./models";
import { applyExtends, fileMode, flatten, modeValues, type TokenDoc, type TokenNode } from "./tree";
import { scaleAlpha, valueToText } from "./values";

/** A merged token tree: path → token, plus top-level groups tried as prefixes for relative references. */
interface TreeIndex {
  map: Map<string, TokenNode>;
  prefixes: string[];
  mode?: Mode;
}

interface Scope {
  primary: TreeIndex;
  /** The file of the value being resolved (local `$ref`). */
  doc: TokenDoc;
  /** The other token files of the batch, loaded on the first miss. */
  others: () => TreeIndex[];
}

type Warning = { code: string; detail?: string };

const LEGACY_SUFFIX = /\.\$?value$/;
const MAX_PREFIXES = 32;
const MAX_ISSUES = 20;

const prefixesOf = (roots: readonly JsonValue[]) =>
  [...new Set(roots.flatMap((r) => (isJsonObject(r) ? Object.keys(r).filter((k) => !k.startsWith("$") && isJsonObject(r[k]!)) : [])))].slice(0, MAX_PREFIXES);

const docIds = new WeakMap<TokenDoc, number>();
let nextDocId = 0;
const docId = (doc: TokenDoc) => {
  let id = docIds.get(doc);
  if (id === undefined) docIds.set(doc, (id = ++nextDocId));
  return id;
};

const flatCache = new WeakMap<TokenDoc, Map<string, { tokens: TokenNode[]; unresolved: { path: string; reason: string }[]; truncated: boolean }>>();

function flatLayer(layer: Layer, limits: ImportLimits) {
  let byBase = flatCache.get(layer.doc);
  if (!byBase) flatCache.set(layer.doc, (byBase = new Map()));
  const key = layer.base.join("\u0000");
  let flat = byBase.get(key);
  if (!flat) {
    const tree = flatten(layer.doc, layer.root, { maxTokens: limits.tokens.maxTokens, base: layer.base });
    const extended = applyExtends(tree, limits.tokens.maxAliasHops);
    flat = { tokens: extended.tokens, unresolved: extended.unresolved, truncated: tree.truncated };
    byBase.set(key, flat);
  }
  return flat;
}

/** Layers merged in order (later wins, keeping the first position and the overridden `$type`). */
function buildTree(layers: readonly Layer[], limits: ImportLimits, unresolved: (path: string, reason: string) => void) {
  const map = new Map<string, TokenNode>();
  const emit = new Map<string, boolean>();
  let truncated = false;
  for (const layer of layers) {
    const flat = flatLayer(layer, limits);
    truncated ||= flat.truncated;
    for (const u of flat.unresolved) unresolved(u.path, u.reason);
    for (const token of flat.tokens) {
      const previous = map.get(token.key);
      if (!previous && map.size >= limits.tokens.maxTokens) {
        truncated = true;
        break;
      }
      map.set(token.key, !token.type && previous?.type ? { ...token, type: previous.type } : token);
      emit.set(token.key, layer.emit);
    }
  }
  return { index: { map, prefixes: prefixesOf(layers.map((l) => l.root)) } satisfies TreeIndex, emit, truncated };
}

const siblingCache = new WeakMap<readonly BatchFile[], Map<string, TreeIndex | null>>();

/** Another token file of the batch as a tree (Figma collections, Tokens Studio sets, split DTCG). */
function siblingIndex(ctx: ParserContext, file: BatchFile, limits: ImportLimits): TreeIndex | null {
  let byFile = siblingCache.get(ctx.batch);
  if (!byFile) siblingCache.set(ctx.batch, (byFile = new Map()));
  if (byFile.has(file.sourceId)) return byFile.get(file.sourceId)!;
  let index: TreeIndex | null = null;
  const loaded = batchDoc(ctx, file);
  if (loaded.ok) {
    const root = loaded.doc.root;
    if (!isResolverRoot(root) && !isStudioThemesRoot(root) && !isStudioMetadataRoot(root)) {
      const model = isStudioRoot(root) ? studioModel(loaded.doc) : plainModel(loaded.doc, "");
      const layers = model.layers(new Map(model.modifiers.map((m) => [m.name, m.defaultContext])));
      const built = buildTree(layers, limits, () => {});
      const mode = fileMode(loaded.doc);
      index = { ...built.index, ...(mode && { mode }) };
    }
  }
  byFile.set(file.sourceId, index);
  return index;
}

/** The batch resolver or `$themes.json` that reads this file, if any. */
function readThrough(input: ParserInput, ctx: ParserContext): string | undefined {
  const me = input.name.toLowerCase();
  for (const file of ctx.batch) {
    if (file.parserId !== "tokens" || file.sourceId === input.sourceId) continue;
    const loaded = batchDoc(ctx, file);
    if (!loaded.ok) continue;
    const root = loaded.doc.root;
    const model = isResolverRoot(root) ? resolverModel(loaded.doc, ctx) : isStudioThemesRoot(root) ? studioThemesModel(loaded.doc, ctx) : null;
    if (model?.files.has(me)) return file.name;
  }
  return undefined;
}

function hasFigma(doc: TokenDoc, nodes: Iterable<TokenNode>): boolean {
  const ext = isJsonObject(doc.root) ? own(doc.root, "$extensions") : undefined;
  if (isJsonObject(ext) && Object.keys(ext).some((k) => k.startsWith("com.figma"))) return true;
  for (const node of nodes) if (node.extensions && Object.keys(node.extensions).some((k) => k.startsWith("com.figma"))) return true;
  return false;
}

const isColorObject = (v: JsonValue) => isJsonObject(v) && own(v, "colorSpace") !== undefined;

function formatOf(model: Model, doc: TokenDoc, input: ParserInput, nodes: TokenNode[]): string {
  if (model.format) return model.format;
  if (hasFigma(doc, nodes)) return "figma-native";
  if (doc.legacy) return input.format === "tokens-studio" ? "tokens-studio" : "style-dictionary";
  return nodes.some((n) => isColorObject(n.value)) ? "dtcg-2025.10" : "dtcg";
}

/**
 * Token JSON → detections. One tolerant walker for DTCG 2025.10 (color objects, dimensions, fonts,
 * shadows, typography, `{a.b}` aliases, `$ref` to sub-values, `$extends`, `$deprecated`), its resolver,
 * DTCG drafts and Style Dictionary (`value`), Tokens Studio (`$themes`, `$metadata`, math, `rgba(#hex, a)`,
 * `alpha` modifiers) and Figma's native export. References to other files resolve by file name inside
 * the batch, never over the network; set files a resolver or `$themes.json` reads emit nothing on
 * their own (`read-through`).
 *
 * Figma's «Export modes» is not documented, so both plausible shapes are read:
 * - one file per mode, the mode named by the file (`Dark.tokens.json`) or by the root
 *   `$extensions["com.figma.modeName"]`; aliases to another collection resolve against the other
 *   files of the batch, falling back to `com.figma.aliasData.targetVariableName`;
 * - one file with every mode: per-token `$extensions["com.figma.modes"]` (`{ "Light": …, "Dark": … }`)
 *   or top-level groups named by mode.
 * `com.figma.codeSyntax.WEB` (`var(--primary)`) names the role when the path does not, and number
 * variables take their kind from `com.figma.scopes` (CORNER_RADIUS, GAP, FONT_SIZE…). The REST API
 * format (Enterprise only) is refused.
 */
export async function parse(input: ParserInput, ctx: ParserContext): Promise<ParseOutput> {
  const limits = limitsOf(ctx);
  const loaded = loadTokenDoc(input.name, inputText(input), limits);
  if (!loaded.ok) return { warnings: [{ code: loaded.code, ...(loaded.detail && { detail: loaded.detail }) }] };
  const doc = loaded.doc;
  const warnings: Warning[] = loaded.issues.slice(0, MAX_ISSUES).map((i) => ({ code: i.code, detail: i.path }));
  const root = doc.root;

  const meta = isJsonObject(root) ? own(root, "meta") : undefined;
  if (isJsonObject(meta) && own(meta, "variableCollections") !== undefined) {
    return { format: "figma-rest", warnings: [...warnings, { code: "unsupported-format", detail: "figma-rest" }] };
  }
  const owner = readThrough(input, ctx);
  if (owner) return { warnings: [...warnings, { code: "read-through", detail: owner }] };
  if (isStudioMetadataRoot(root)) return { format: "tokens-studio", warnings: [...warnings, { code: "no-tokens", detail: "$metadata" }] };

  const model = isResolverRoot(root)
    ? resolverModel(doc, ctx)
    : isStudioThemesRoot(root)
      ? studioThemesModel(doc, ctx)
      : isStudioRoot(root)
        ? studioModel(doc)
        : plainModel(doc, "");
  return run(model, doc, input, ctx, limits, warnings);
}

function run(model: Model, doc: TokenDoc, input: ParserInput, ctx: ParserContext, limits: ImportLimits, warnings: Warning[]): ParseOutput {
  const unresolved: { path: string; reason: string }[] = [];
  const seen = new Set<string>();
  const addUnresolved = (path: string, reason: string) => {
    const key = `${path}\u0000${reason}`;
    if (seen.has(key) || unresolved.length >= 500) return;
    seen.add(key);
    unresolved.push({ path: cleanText(path, 200), reason: cleanText(reason, 200) });
  };
  for (const u of model.unresolved) addUnresolved(u.path, u.reason);
  warnings.push(...model.warnings);

  const { scenarios, warnings: scenarioWarnings } = scenariosOf(model, fileMode(doc));
  warnings.push(...scenarioWarnings);

  const siblingFiles = ctx.batch.filter((f) => f.parserId === "tokens" && f.sourceId !== input.sourceId && !model.files.has(f.name.toLowerCase()));
  let siblings: TreeIndex[] | null = null;
  const byMode = new Map<Mode | undefined, TreeIndex[]>();
  /** Other token files, same mode first, then files without a mode; loaded on the first miss. */
  const siblingsFor = (mode: Mode | undefined) => () => {
    let sorted = byMode.get(mode);
    if (!sorted) {
      siblings ??= siblingFiles.map((f) => siblingIndex(ctx, f, limits)).filter((t): t is TreeIndex => t !== null);
      const rank = (t: TreeIndex) => (t.mode === mode ? 0 : t.mode === undefined ? 1 : 2);
      byMode.set(mode, (sorted = [...siblings].sort((a, b) => rank(a) - rank(b))));
    }
    return sorted;
  };

  const inTree = (tree: TreeIndex, candidates: readonly string[]) => {
    for (const candidate of candidates) {
      const node = tree.map.get(candidate) ?? tree.prefixes.map((p) => tree.map.get(`${p}.${candidate}`)).find(Boolean);
      if (node) return node;
    }
    return undefined;
  };

  const findNode = (path: string, scope: Scope): { node: TokenNode; scope: Scope } | undefined => {
    const raw = path.includes("/") && !path.includes(".") ? path.split("/").join(".") : path;
    const candidates = [raw, ...(LEGACY_SUFFIX.test(raw) ? [raw.replace(LEGACY_SUFFIX, "")] : []), `${raw}.$root`];
    const local = inTree(scope.primary, candidates);
    if (local) return { node: local, scope: { ...scope, doc: local.doc } };
    for (const tree of scope.others()) {
      const node = inTree(tree, candidates);
      if (node) return { node, scope: { primary: tree, doc: node.doc, others: () => [scope.primary, ...scope.others().filter((t) => t !== tree)] } };
    }
    return undefined;
  };

  const host: AliasHost<Scope> = {
    lookup(path, scope) {
      const hit = findNode(path, scope);
      return hit && { value: hit.node.value, key: `n${hit.node.id}`, scope: hit.scope };
    },
    ref(ref, scope) {
      const { file, fragment, remote } = splitRef(ref);
      if (remote) return { error: `remote $ref ignored: ${cleanText(ref, 80)}` };
      let target = scope.doc;
      if (file) {
        const found = findBatchFile(ctx, file);
        if (!found) return { error: `missing file ${file}` };
        const loaded = batchDoc(ctx, found);
        if (!loaded.ok) return { error: `${found.name}: ${loaded.code}` };
        target = loaded.doc;
      }
      const segments = pointerSegments(fragment ?? "#");
      if (!segments) return { error: `invalid $ref ${cleanText(ref, 80)}` };
      let value = atPointer(target.root, segments);
      if (value === undefined) return { error: `missing $ref target ${cleanText(ref, 80)}` };
      if (isJsonObject(value)) value = own(value, "$value") ?? (target.legacy ? own(value, "value") : undefined) ?? value;
      return { value, key: `r${docId(target)}#${segments.join("/")}`, scope: { ...scope, doc: target } };
    },
    toText: valueToText,
  };

  const typeOf = (node: TokenNode, scope: Scope): string | undefined => {
    let current: { node: TokenNode; scope: Scope } | undefined = { node, scope };
    for (let hops = 0; current && hops <= limits.tokens.maxAliasHops; hops++) {
      if (current.node.type) return current.node.type;
      const path = aliasPath(current.node.value);
      current = path === null ? undefined : findNode(path, current.scope);
    }
    return undefined;
  };

  const resolveNode = (resolver: AliasResolver<Scope>, node: TokenNode, raw: JsonValue, scope: Scope): Resolved => {
    const result = resolver.resolve(raw, scope);
    if (result.ok) return result;
    const alias = node.extensions ? own(node.extensions, "com.figma.aliasData") : undefined;
    const target = isJsonObject(alias) ? own(alias, "targetVariableName") : undefined;
    if (typeof target !== "string" || target.length > 256) return result;
    const retry = resolver.resolve(`{${target.split("/").join(".")}}`, scope);
    return retry.ok ? retry : result;
  };

  /** Tokens Studio color modifiers: `alpha` is applied; lighten, darken and mix are not evaluated. */
  const modified = (resolver: AliasResolver<Scope>, node: TokenNode, result: Resolved, scope: Scope): Resolved => {
    const studio = node.extensions ? own(node.extensions, "studio.tokens") : undefined;
    const modify = isJsonObject(studio) ? own(studio, "modify") : undefined;
    if (!result.ok || !isJsonObject(modify)) return result;
    const type = own(modify, "type");
    if (type !== "alpha") return { ok: false, reason: `Tokens Studio modifier "${cleanText(String(type), 32)}" is not evaluated` };
    const amount = resolver.resolve(own(modify, "value") ?? null, scope);
    const factor = amount.ok ? Number(amount.value) : Number.NaN;
    const color = scaleAlpha(result.value, factor);
    return color ? { ok: true, value: color } : { ok: false, reason: "invalid alpha modifier" };
  };

  const observations: Observation[] = [];
  const allNodes: TokenNode[] = [];
  let deprecated = 0;
  let truncated = false;
  scenarios.forEach((scenario, i) => {
    const built = buildTree(model.layers(scenario.choice), limits, addUnresolved);
    truncated ||= built.truncated;
    const scope: Scope = { primary: built.index, doc, others: siblingsFor(scenario.mode) };
    const resolver = createAliasResolver(host, { maxHops: limits.tokens.maxAliasHops, maxSteps: limits.maxJsonNodes * 4 });
    for (const node of built.index.map.values()) {
      if (i === 0) allNodes.push(node);
      const reference = !built.emit.get(node.key);
      if (node.deprecated) {
        if (i === 0) deprecated++;
        continue;
      }
      const nodeScope: Scope = { ...scope, doc: node.doc };
      const type = typeOf(node, nodeScope);
      const perMode = modeValues(node);
      const pairs: [Mode | undefined, JsonValue][] = scenario.mode
        ? [[scenario.mode, perMode?.[scenario.mode] ?? node.value]]
        : perMode
          ? [["light", perMode.light ?? node.value], ...(perMode.dark !== undefined ? [["dark", perMode.dark] as [Mode, JsonValue]] : [])]
          : [[undefined, node.value]];
      for (const [mode, raw] of pairs) {
        const result = modified(resolver, node, resolveNode(resolver, node, raw, nodeScope), nodeScope);
        if (!result.ok) {
          if (!reference) addUnresolved(`${node.doc.name} ${node.pointer}`, result.reason);
          continue;
        }
        observations.push({
          node,
          value: result.value,
          ...(type && { type }),
          ...(mode && { mode }),
          ...(scenario.alt && { alt: scenario.alt }),
          ...(reference && { reference: true }),
        });
      }
    }
  });

  const emitted = emitTokens(observations);
  if (truncated) warnings.push({ code: "too-many-tokens", detail: `kept ${limits.tokens.maxTokens}` });
  if (deprecated > 0) warnings.push({ code: "deprecated-skipped", detail: String(deprecated) });
  const { warnings: emitWarnings, ...values } = emitted;
  return {
    format: formatOf(model, doc, input, allNodes),
    ...values,
    ...(warnings.length + emitWarnings.length > 0 && { warnings: [...warnings, ...emitWarnings] }),
    ...(unresolved.length > 0 && { unresolved }),
  };
}
