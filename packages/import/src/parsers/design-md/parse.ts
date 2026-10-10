import { isMap, isScalar, LineCounter, parseDocument, type Document } from "yaml";
import { normalizeColor } from "../../color";
import { worseConfidence } from "../../merge";
import type { ParserContext, ParserInput } from "../../registry";
import { clampLines, cleanText, isJsonObject, own, toSafeJson, type JsonObject, type JsonValue } from "../../sanitize";
import type { Confidence, ParsedColor, ParseOutput } from "../../types";
import { createAliasResolver } from "../tokens/alias";
import { inputText, limitsOf } from "../tokens/document";
import { emitTokens, type Observation } from "../tokens/emit";
import { newNodeId, type TokenDoc, type TokenNode } from "../tokens/tree";
import { valueToText } from "../tokens/values";
import { componentHints } from "./components";

/** `system` carries what `components` says about buttons, inputs and badges. */
export type DesignMdParseOutput = ParseOutput;

type Warning = { code: string; detail?: string };

const SECTIONS = { colors: "color", typography: "typography", rounded: "borderRadius", spacing: "spacing" } as const;
const TYPE_KEYS = new Set(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFeature", "fontVariation"]);
const MAX_NOTES = 20;
const MAX_LEAVES = 2000;
const MAX_KEYS = 20_000;

const high = <T extends { confidence: Confidence }>(item: T): T => ({ ...item, confidence: worseConfidence(item.confidence, "high") });
const highRecord = <T extends { confidence: Confidence }>(record: Record<string, T> | undefined) =>
  record && Object.fromEntries(Object.entries(record).map(([k, v]) => [k, high(v)]));

/** DESIGN.md keys are free-form: nothing is more than «high». */
function capConfidence(out: Omit<ParseOutput, "warnings">): Omit<ParseOutput, "warnings"> {
  const shape = out.shape && {
    ...(out.shape.radius && { radius: high(out.shape.radius) }),
    ...(out.shape.radii && { radii: highRecord(out.shape.radii)! }),
    ...(out.shape.shadows && { shadows: out.shape.shadows.map(high) }),
    ...(out.shape.borderWidth && { borderWidth: high(out.shape.borderWidth) }),
  };
  const spacing = out.spacing && {
    ...(out.spacing.base && { base: high(out.spacing.base) }),
    ...(out.spacing.scale && { scale: highRecord(out.spacing.scale)! }),
  };
  return {
    ...out,
    ...(out.colors && { colors: out.colors.map(high) }),
    ...(out.fonts && { fonts: out.fonts.map(high) }),
    ...(shape && { shape }),
    ...(spacing && { spacing }),
    ...(out.typeScale && { typeScale: out.typeScale.map(high) }),
  };
}

/** Front matter between `---` lines (scanned line by line, no regex over the file). */
function splitFrontMatter(text: string): { yaml: string; firstLine: number; body: string } | { body: string } {
  const lines = text.split("\n");
  let start = 0;
  while (start < lines.length && lines[start]!.trim() === "") start++;
  if (lines[start]?.trimEnd() !== "---") return { body: text };
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!.trimEnd();
    if (line === "---" || line === "...") return { yaml: lines.slice(start + 1, i).join("\n"), firstLine: start + 2, body: lines.slice(i + 1).join("\n") };
  }
  return { body: text };
}

/**
 * Line of every key (`colors.primary` → 4) and the duplicated keys, from the YAML nodes. Linear:
 * `yaml`'s own `uniqueKeys` compares every key with every other one.
 */
function keyLines(doc: Document, counter: LineCounter, firstLine: number): { lines: Map<string, number>; duplicates: number[] } {
  const lines = new Map<string, number>();
  const duplicates: number[] = [];
  const lineOf = (offset: number) => firstLine + Math.max(1, counter.linePos(offset).line) - 1;
  const stack: { node: unknown; path: string[] }[] = [{ node: doc.contents, path: [] }];
  while (stack.length > 0 && lines.size < MAX_KEYS) {
    const { node, path } = stack.pop()!;
    if (!isMap(node) || path.length > 8) continue;
    const seen = new Set<string>();
    for (const pair of node.items) {
      if (!isScalar(pair.key)) continue;
      const name = String(pair.key.value);
      const key = [...path, name];
      const offset = pair.key.range?.[0];
      if (seen.has(name)) {
        if (offset !== undefined && duplicates.length < 5) duplicates.push(lineOf(offset));
      } else if (offset !== undefined) lines.set(key.join("."), lineOf(offset));
      seen.add(name);
      stack.push({ node: pair.value, path: key });
    }
  }
  return { lines, duplicates };
}

/** Leaves of a section: colors and dimensions are scalars; a typography style is a map of font properties. */
function leaves(section: JsonValue, prefix: string[], isLeaf: (v: JsonValue) => boolean): { path: string[]; value: JsonValue }[] {
  const out: { path: string[]; value: JsonValue }[] = [];
  const stack: { value: JsonValue; path: string[] }[] = [{ value: section, path: prefix }];
  while (stack.length > 0 && out.length < MAX_LEAVES) {
    const { value, path } = stack.pop()!;
    if (path.length > prefix.length && isLeaf(value)) {
      out.push({ path, value });
      continue;
    }
    if (!isJsonObject(value) || path.length > prefix.length + 4) continue;
    const keys = Object.keys(value);
    for (let i = keys.length - 1; i >= 0; i--) stack.push({ value: value[keys[i]!]!, path: [...path, keys[i]!] });
  }
  return out;
}

const isTypeStyle = (v: JsonValue) => typeof v === "string" || (isJsonObject(v) && Object.keys(v).some((k) => TYPE_KEYS.has(k)));
const isScalarLeaf = (v: JsonValue) => typeof v === "string" || typeof v === "number";

/** H2 sections of the prose, without tables (they repeat the front matter). */
function proseNotes(body: string): string[] {
  const notes: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const text = current.filter((l) => !l.trimStart().startsWith("|")).join("\n").trim();
    if (text && text.split("\n").some((l) => l.trim() && !l.startsWith("#"))) notes.push(text);
    current = [];
  };
  for (const line of body.split("\n")) {
    if (line.startsWith("## ")) flush();
    if (/^# [^#]/.test(line)) continue;
    current.push(line);
  }
  flush();
  return notes;
}

/**
 * DESIGN.md (Google Labs, alpha): YAML front matter read with `yaml` (core schema, unique keys,
 * at most 50 aliases) → `colors`, `typography`, `rounded`, `spacing`; `{colors.primary}` references
 * with the tokens parser's resolver; `components` name roles (a button's background is the primary)
 * and give `system` hints; the prose becomes notes. Values are «high», roles «high» or «medium»: the
 * keys are free-form. DESIGN.md has no modes: a dark background puts the colors in dark mode.
 */
export async function parse(input: ParserInput, ctx: ParserContext): Promise<DesignMdParseOutput> {
  const limits = limitsOf(ctx);
  const clamped = clampLines(inputText(input), limits.maxLineLength);
  const warnings: Warning[] = clamped.truncated > 0 ? [{ code: "line-truncated", detail: String(clamped.truncated) }] : [];
  const text = clamped.text.replace(/\r\n?/g, "\n");
  if (text.trim().length === 0) return { warnings: [{ code: "empty-file" }] };

  const split = splitFrontMatter(text);
  const notes = proseNotes(split.body);
  if (!("yaml" in split)) {
    return { format: "markdown", ...(notes.length > 0 && { notes: notes.slice(0, MAX_NOTES) }), warnings: [...warnings, { code: "no-front-matter" }] };
  }

  const counter = new LineCounter();
  let yamlDoc: Document;
  let js: unknown;
  try {
    yamlDoc = parseDocument(split.yaml, { schema: "core", uniqueKeys: false, lineCounter: counter, prettyErrors: false });
    for (const error of yamlDoc.errors.slice(0, 5)) {
      const line = split.firstLine + Math.max(1, counter.linePos(error.pos[0]).line) - 1;
      warnings.push({ code: "invalid-yaml", detail: cleanText(`${error.code} line ${line}`, 120) });
    }
    js = yamlDoc.toJS({ maxAliasCount: limits.yamlMaxAliasCount });
  } catch (error) {
    const alias = error instanceof ReferenceError || /alias/i.test(String(error));
    return { format: "design-md", warnings: [...warnings, { code: alias ? "yaml-alias-limit" : "invalid-yaml", detail: cleanText(String(error), 120) }] };
  }
  const safe = toSafeJson(js ?? null, { maxDepth: limits.tokens.maxDepth, maxNodes: limits.maxJsonNodes });
  if (!safe.ok) return { format: "design-md", warnings: [...warnings, { code: safe.code, ...(safe.detail && { detail: safe.detail }) }] };
  for (const issue of safe.issues.slice(0, 20)) warnings.push({ code: issue.code, detail: issue.path });
  const root: JsonObject = isJsonObject(safe.value) ? safe.value : (Object.create(null) as JsonObject);
  const { lines, duplicates } = keyLines(yamlDoc, counter, split.firstLine);
  for (const line of duplicates) warnings.push({ code: "invalid-yaml", detail: `DUPLICATE_KEY line ${line}` });

  const doc: TokenDoc = { name: input.name, root, legacy: false };
  const locator = (path: readonly string[]) => {
    const line = lines.get(path.join("."));
    return cleanText(`${input.name}${line ? `:${line}` : ""} ${path.join(".")}`, 200);
  };
  const node = (path: string[], value: JsonValue, type: string): TokenNode => ({
    id: newNodeId(),
    path,
    key: path.join("."),
    value,
    type,
    deprecated: false,
    doc,
    pointer: `#/${path.join("/")}`,
    locator: locator(path),
  });

  const resolver = createAliasResolver<null>(
    {
      lookup(path) {
        const segments = path.split(".");
        let value: JsonValue | undefined = root;
        for (const s of segments) value = isJsonObject(value) ? own(value, s) : undefined;
        return value === undefined ? undefined : { value, key: path, scope: null };
      },
      toText: valueToText,
    },
    { maxHops: limits.tokens.maxAliasHops, maxSteps: limits.maxJsonNodes },
  );

  const unresolved: { path: string; reason: string }[] = [];
  const observations: Observation[] = [];
  for (const [section, type] of Object.entries(SECTIONS)) {
    const value = own(root, section);
    if (value === undefined) continue;
    const found = leaves(value, [section], section === "typography" ? isTypeStyle : isScalarLeaf);
    if (found.length >= MAX_LEAVES) warnings.push({ code: "too-many-tokens", detail: `${section}: kept ${MAX_LEAVES}` });
    for (const leaf of found) {
      const resolved = resolver.resolve(leaf.value, null);
      if (!resolved.ok) {
        unresolved.push({ path: locator(leaf.path), reason: resolved.reason });
        continue;
      }
      observations.push({ node: node(leaf.path, leaf.value, type), value: resolved.value, type });
    }
  }

  const emitted = emitTokens(observations);
  const { warnings: emitWarnings, ...emittedValues } = emitted;
  const values = capConfidence(emittedValues);
  const colors: ParsedColor[] = values.colors ?? [];

  const components = own(root, "components");
  const hints = isJsonObject(components) ? componentHints(components, { resolve: (v) => resolver.resolve(v, null), locator, colors }) : null;
  if (hints) {
    colors.push(...hints.colors);
    for (const u of hints.unresolved) unresolved.push(u);
  }

  const background = colors.find((c) => c.role === "background" && !c.mode);
  const lightness = background ? normalizeColor(background.value) : null;
  if (lightness?.ok && lightness.color.oklch.l < 0.5 && !colors.some((c) => c.role && c.mode)) {
    for (const c of colors) if (c.role) c.mode = "dark";
    warnings.push({ code: "mode-inferred", detail: "dark" });
  }

  const name = own(root, "name");
  const description = own(root, "description");
  const intro = [typeof name === "string" ? name : "", typeof description === "string" ? description : ""].filter(Boolean).join(": ");
  const allNotes = [...(intro ? [intro] : []), ...notes].slice(0, MAX_NOTES);
  const allWarnings = [...warnings, ...emitWarnings];
  return {
    format: "design-md",
    ...values,
    ...(colors.length > 0 && { colors }),
    ...(hints && hints.system.length > 0 && { system: hints.system }),
    ...(allNotes.length > 0 && { notes: allNotes }),
    ...(allWarnings.length > 0 && { warnings: allWarnings }),
    ...(unresolved.length > 0 && { unresolved: unresolved.slice(0, 500) }),
  };
}
