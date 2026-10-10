import postcss, { type AnyNode, type Root } from "postcss";
import { IMPORT_LIMITS } from "../../limits";
import { modeFromSelector } from "../../roles";
import type { Mode } from "../../types";

/** Where a custom property was declared. `theme`: Tailwind `@theme`; `theme-inline`: `@theme inline`. */
export type ScopeKind = "root" | "theme" | "theme-inline";

/** A custom property declared in a theme scope (`:root`, `.dark`, `@theme`…). */
export interface VarDef {
  name: string;
  value: string;
  /** `undefined`: mode-neutral (`@theme`). */
  mode?: Mode;
  /** Only applies under a class, attribute or media query (`.dark`); a plain `:root` applies everywhere. */
  conditional: boolean;
  scope: ScopeKind;
  line: number;
  order: number;
  important: boolean;
}

/** Elements whose regular declarations say something about the brand (compiled CSS). */
export type ElementKind = "root" | "heading" | "mono" | "link";

export interface ElementDecl {
  element: ElementKind;
  /** The rule's selector, cut to 60 characters (for the locator). */
  selector: string;
  prop: string;
  value: string;
  mode?: Mode;
  conditional: boolean;
  line: number;
  order: number;
}

/** A regular declaration with a color-bearing property, for CSS without custom properties. */
export interface LiteralDecl {
  prop: string;
  value: string;
  line: number;
}

export interface Sheet {
  /** Every theme-scope custom property, by name, in document order. */
  defs: Map<string, VarDef[]>;
  /** The same, as one list in document order. */
  vars: VarDef[];
  elements: ElementDecl[];
  literals: LiteralDecl[];
  hasTheme: boolean;
  /** Syntax errors that were recovered from (`line 3: Unclosed block`). */
  recovered: string[];
  /** Values cut to the line limit before any regex runs (minified CSS is read whole, not cut per line). */
  truncated: number;
  /** Could not be parsed at all. */
  failed?: string;
}

const MAX_DEPTH = 64;
const MAX_RETRIES = 8;
const MAX_LITERALS = 5000;
const MAX_PROP = 512;
const MAX_PARAMS = 2000;
/** Above this, a line is minified CSS: a broken statement is blanked alone, not the whole line. */
const LONG_LINE = 1000;

const RESPONSIVE_MEDIA = /\b(?:min|max)-(?:device-)?(?:width|height|aspect-ratio|resolution)\b|\b(?:width|height|orientation|hover|pointer|resolution)\b|\bprint\b|[<>]=?/i;
const LITERAL_PROPS = /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|fill|stroke|accent-color|caret-color|text-decoration-color|column-rule-color)$/i;

interface Context {
  mode?: Mode;
  conditional: boolean;
  scope?: ScopeKind;
  element?: ElementKind;
  /** Inside a component rule (`.card { &.dark {} }` is not a theme scope). */
  component?: boolean;
  selector?: string;
}

interface SyntaxIssue {
  reason: string;
  line: number;
  column: number;
}

function syntaxIssue(error: unknown): SyntaxIssue | null {
  if (!error || typeof error !== "object" || (error as { name?: string }).name !== "CssSyntaxError") return null;
  const e = error as { reason?: string; line?: number; column?: number };
  return { reason: e.reason ?? "syntax error", line: e.line ?? 1, column: e.column ?? 1 };
}

function offsetOf(text: string, line: number, column: number): number {
  let offset = 0;
  for (let l = 1; l < line; l++) {
    const next = text.indexOf("\n", offset);
    if (next < 0) return text.length;
    offset = next + 1;
  }
  return Math.min(text.length, offset + Math.max(0, column - 1));
}

/**
 * Text of a line blanked (line breaks kept, so later line numbers stay right). On a long (minified)
 * line only the broken statement goes: from `at` to the next `;` or `}`.
 */
function blankLine(text: string, line: number, at: number): string {
  const start = offsetOf(text, line, 1);
  let end = text.indexOf("\n", start);
  if (end < 0) end = text.length;
  if (end - start > LONG_LINE && at >= start && at < end) {
    let stop = at;
    while (stop < end && text[stop] !== ";" && text[stop] !== "}") stop++;
    if (stop < end && text[stop] === ";") stop++;
    return text.slice(0, at) + " ".repeat(Math.max(1, stop - at)) + text.slice(Math.max(stop, at + 1));
  }
  return text.slice(0, start) + " ".repeat(end - start) + text.slice(end);
}

/** postcss, retried after cutting what broke it (unclosed block, string or comment, stray `}`, unknown word). */
export function parseTolerant(source: string): { root: Root | null; recovered: string[]; failed?: string } {
  let text = source;
  const recovered: string[] = [];
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return { root: postcss.parse(text), recovered };
    } catch (error) {
      const issue = syntaxIssue(error);
      if (!issue) return { root: null, recovered, failed: error instanceof Error ? error.message : String(error) };
      recovered.push(`line ${issue.line}: ${issue.reason}`);
      const at = offsetOf(text, issue.line, issue.column);
      if (/^Unclosed block/.test(issue.reason)) text += "\n}";
      else if (/^Unclosed (?:string|comment|bracket|quote)/.test(issue.reason)) text = text.slice(0, at);
      else if (/^Unexpected \}/.test(issue.reason)) text = `${text.slice(0, at)} ${text.slice(at + 1)}`;
      else text = blankLine(text, issue.line, at);
    }
  }
  return { root: null, recovered, failed: recovered.at(-1) ?? "syntax error" };
}

/** `a, b` → `["a", "b"]`, commas inside parentheses or brackets kept. */
function selectorParts(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of selector.slice(0, 2000)) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

const BARE_ROOT = /^(?::root|html|:host|body)$/i;

function elementOf(part: string): ElementKind | undefined {
  const compounds = part.split(/\s*[\s>+~]\s*/).filter(Boolean);
  const tag = compounds.pop()?.replace(/^&/, "").toLowerCase() ?? "";
  if (!/^(?::root|:host|[a-z][a-z0-9]*)$/.test(tag)) return undefined;
  if (compounds.some((c) => modeFromSelector(c) === undefined)) return undefined;
  if (tag === "html" || tag === "body" || tag === ":root" || tag === ":host") return "root";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "code" || tag === "pre" || tag === "kbd" || tag === "samp") return "mono";
  return tag === "a" ? "link" : undefined;
}

/** The rule's theme context, or none when it is not a theme scope (a component selector). */
function ruleContext(selector: string, parent: Context): Context | null {
  const parts = selectorParts(selector);
  if (parts.length === 0) return null;
  const modes = parts.map((p) => modeFromSelector(p.replace(/:not\([^()]{0,200}\)/g, "")));
  const elements = parts.map(elementOf);
  const element = elements.every((e) => e !== undefined && e === elements[0]) ? elements[0] : undefined;
  if (parent.component) return null;
  if (modes.some((m) => m === undefined)) return element ? { ...parent, element, scope: undefined } : null;
  const dark = modes.includes("dark");
  const own: Mode = dark ? "dark" : "light";
  const conditional = parent.conditional || !parts.every((p) => BARE_ROOT.test(p));
  const mode = parent.mode === "dark" || dark ? "dark" : parent.mode && parent.conditional ? parent.mode : own;
  return { mode, conditional, scope: "root", ...(element && { element }) };
}

function atRuleContext(name: string, params: string, parent: Context): Context | null {
  if (name === "theme") return { ...parent, scope: /\binline\b/.test(params) ? "theme-inline" : "theme", mode: parent.conditional ? parent.mode : undefined };
  if (name === "media") {
    const scheme = /prefers-color-scheme\s*:\s*(dark|light)/i.exec(params)?.[1]?.toLowerCase() as Mode | undefined;
    if (scheme) return { ...parent, mode: scheme, conditional: true };
    return RESPONSIVE_MEDIA.test(params) ? null : parent;
  }
  return name === "supports" || name === "layer" ? parent : null;
}

/** `/* … *\/` removed from a value (indexOf scan, no regex). */
function stripComments(value: string): string {
  let out = "";
  let from = 0;
  for (let start = value.indexOf("/*"); start >= 0; start = value.indexOf("/*", from)) {
    const end = value.indexOf("*/", start + 2);
    out += `${value.slice(from, start)} `;
    from = end < 0 ? value.length : end + 2;
  }
  return (out + value.slice(from)).trim();
}

const colorSchemeOf = (value: string): Mode | undefined => {
  const words = value.trim().toLowerCase().split(/\s+/);
  if (words.includes("dark") && !words.includes("light")) return "dark";
  if (words.includes("light") && !words.includes("dark")) return "light";
  return undefined;
};

/**
 * Reads a stylesheet into theme variables (with their mode), element declarations (`body`, `h1`,
 * `code`) and color-bearing literals. `@import` and `url()` are never followed; `@media` other than
 * `prefers-color-scheme` (responsive overrides), keyframes, `@property` and Tailwind directives are
 * skipped. Iterative, with a depth cap. postcss reads the text whole (its tokenizer is linear); each
 * value is cut to `maxValue` before any regex sees it.
 */
export function readSheet(text: string, signal?: { readonly aborted: boolean }, maxValue: number = IMPORT_LIMITS.maxLineLength): Sheet {
  const { root, recovered, failed } = parseTolerant(text);
  const sheet: Sheet = { defs: new Map(), vars: [], elements: [], literals: [], hasTheme: false, recovered, truncated: 0, ...(failed && { failed }) };
  const cut = (value: string): string => {
    if (value.length <= maxValue) return value;
    sheet.truncated++;
    return value.slice(0, maxValue);
  };
  if (!root) return sheet;
  let order = 0;
  const stack: { node: AnyNode; ctx: Context; depth: number }[] = [];
  const push = (nodes: readonly AnyNode[] | undefined, ctx: Context, depth: number) => {
    if (!nodes || depth > MAX_DEPTH) return;
    for (let i = nodes.length - 1; i >= 0; i--) stack.push({ node: nodes[i]!, ctx, depth });
  };
  // Declarations outside any rule (a pasted fragment) count as `:root` without a mode.
  push(root.nodes, { conditional: false, scope: "root" }, 0);

  while (stack.length > 0) {
    const { node, ctx, depth } = stack.pop()!;
    if (++order % 2000 === 0 && signal?.aborted) throw new Error("aborted");
    if (node.type === "atrule") {
      const name = node.name.toLowerCase();
      const next = atRuleContext(name, node.params.slice(0, MAX_PARAMS), ctx);
      if (name === "theme") sheet.hasTheme = true;
      if (next) push(node.nodes, next, depth + 1);
      continue;
    }
    if (node.type === "rule") {
      const selector = node.selector.slice(0, MAX_PARAMS);
      let next = ruleContext(selector, ctx);
      if (!next) {
        if (sheet.literals.length < MAX_LITERALS) {
          for (const child of node.nodes ?? []) {
            if (child.type === "decl" && child.prop.length <= MAX_PROP && LITERAL_PROPS.test(child.prop)) {
              sheet.literals.push({ prop: child.prop.toLowerCase(), value: cut(child.value), line: child.source?.start?.line ?? 1 });
            }
          }
        }
        push(
          node.nodes?.filter((n) => n.type !== "decl"),
          { ...ctx, scope: undefined, element: undefined, component: true },
          depth + 1,
        );
        continue;
      }
      next = { ...next, selector: selector.replace(/\s+/g, " ").trim().slice(0, 60) };
      if (next.scope === "root" && !next.conditional) {
        const scheme = node.nodes?.find((n) => n.type === "decl" && n.prop.toLowerCase() === "color-scheme");
        const mode = scheme?.type === "decl" ? colorSchemeOf(scheme.value.slice(0, 200)) : undefined;
        if (mode) next = { ...next, mode };
      }
      push(node.nodes, next, depth + 1);
      continue;
    }
    if (node.type !== "decl") continue;
    const line = node.source?.start?.line ?? 1;
    const prop = node.prop;
    if (prop.length > MAX_PROP) continue;
    if (prop.startsWith("--")) {
      if (!ctx.scope || prop.includes("*")) continue;
      const def: VarDef = {
        name: prop,
        value: stripComments(cut(node.value)),
        ...(ctx.mode && { mode: ctx.mode }),
        conditional: ctx.conditional,
        scope: ctx.scope,
        line,
        order,
        important: node.important === true,
      };
      const list = sheet.defs.get(prop);
      if (list) list.push(def);
      else sheet.defs.set(prop, [def]);
      sheet.vars.push(def);
    } else if (ctx.element) {
      sheet.elements.push({ element: ctx.element, selector: ctx.selector ?? "", prop: prop.toLowerCase(), value: stripComments(cut(node.value)), ...(ctx.mode && { mode: ctx.mode }), conditional: ctx.conditional, line, order });
    }
    if (!prop.startsWith("--") && LITERAL_PROPS.test(prop) && sheet.literals.length < MAX_LITERALS) {
      sheet.literals.push({ prop: prop.toLowerCase(), value: cut(node.value), line });
    }
  }
  return sheet;
}
