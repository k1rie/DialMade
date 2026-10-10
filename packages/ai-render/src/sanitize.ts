// The sanitizer of AI blocks (spec §6.2): parse5 parses, an allowlist walks the AST, and the HTML is re-serialized
// from the kept tree (./tree). Pure TS, no DOM: it runs in a worker of the app and on the server for the export. It is
// the first wall; the real guarantee is the sandboxed iframe on the preview origin and its CSP.
import { ICON_NAMES } from "@dialmade/ui/icons";
import { HTML_NS, parseRaw, serialize, VOID_TAGS, type AiElement, type AiNode, type RawNode } from "./tree";
import { ALLOWED_TAGS, INPUT_TYPES, NAMED_TAGS, ROOT_TAGS } from "./allowlist";
import { checkClass, type ClassRejection } from "./vocabulary";

export { ALLOWED_TAGS, ROOT_TAGS };

/** Dropped with everything inside (their content is code, another namespace or never visible). */
const DROP_WITH_CONTENT: ReadonlySet<string> = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "svg", "math", "template", "noscript",
  "noembed", "noframes", "xmp", "plaintext", "title", "head", "meta", "link", "base", "canvas", "audio", "video",
  "source", "track", "picture", "portal", "param", "dialog", "slot",
]);

export const PLACEHOLDER_KINDS = ["photo", "avatar", "logo", "screenshot", "chart", "illustration"] as const;
const PLACEHOLDERS: ReadonlySet<string> = new Set(PLACEHOLDER_KINDS);
const ICONS: ReadonlySet<string> = new Set(ICON_NAMES);
export const FALLBACK_ICON = "dot";

const ROLES: ReadonlySet<string> = new Set([
  "list", "listitem", "group", "region", "img", "presentation", "none", "note", "status", "tablist", "tab", "tabpanel",
  "navigation", "banner", "contentinfo", "complementary", "separator", "switch", "progressbar", "meter", "figure",
  "table", "row", "cell", "columnheader", "rowheader", "grid", "gridcell", "radiogroup", "toolbar", "menu", "menuitem",
]);
const ARIA: ReadonlySet<string> = new Set([
  "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden", "aria-current", "aria-selected", "aria-expanded",
  "aria-pressed", "aria-checked", "aria-disabled", "aria-controls", "aria-live", "aria-valuenow", "aria-valuemin",
  "aria-valuemax", "aria-valuetext", "aria-level", "aria-orientation", "aria-roledescription", "aria-sort", "aria-required",
]);
const ID_REF_ATTRS: ReadonlySet<string> = new Set(["aria-labelledby", "aria-describedby", "aria-controls"]);

/** Caps of spec §2.1: per block, after sanitizing (and the raw input). */
export const BLOCK_LIMITS = {
  rawBytes: 24 * 1024,
  bytes: 16 * 1024,
  elements: 400,
  depth: 32,
  classesPerElement: 40,
  textLength: 2000,
} as const;

export type SanitizeContext = {
  /** The block this root must carry as `data-block-id`. */
  blockId: string;
  /** Screen ids a `#screen:<id>` link may point to. */
  screenIds: readonly string[];
};

export type SanitizeReport = {
  droppedTags: Record<string, number>;
  droppedAttrs: Record<string, number>;
  droppedClasses: Partial<Record<ClassRejection, number>>;
  /** Class tokens seen and kept. */
  classesTotal: number;
  classesKept: number;
  /** `data-icon` names that were not in the icon set (drawn as a neutral dot). */
  unknownIcons: string[];
  /** Forbidden tags that make the whole block fail (scripts, frames, other namespaces…). */
  hostile: number;
};

export type SanitizeFailure = "too-large" | "too-many-elements" | "too-deep" | "no-root" | "wrong-root" | "empty" | "unstable";

export type SanitizeResult =
  | { ok: true; html: string; tree: AiElement; report: SanitizeReport; textNodes: number }
  | { ok: false; failure: SanitizeFailure; report: SanitizeReport };

const emptyReport = (): SanitizeReport => ({ droppedTags: {}, droppedAttrs: {}, droppedClasses: {}, classesTotal: 0, classesKept: 0, unknownIcons: [], hostile: 0 });
const bump = (record: Record<string, number>, key: string) => (record[key] = (record[key] ?? 0) + 1);

const SAFE_ID = /^[A-Za-z][\w-]{0,40}$/;
const sanitizeIdPart = (value: string) => value.replace(/[^\w-]/g, "").slice(0, 40);

/** Visible text: no control characters except newlines and tabs, capped. */
function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, "").slice(0, BLOCK_LIMITS.textLength);
}

/** Attribute text (labels, alt, placeholder…): one line, capped. */
const cleanAttrText = (value: string, max = 200) => cleanText(value).replace(/\s+/g, " ").trim().slice(0, max);

class Walker {
  readonly report = emptyReport();
  elements = 0;
  maxDepth = 0;
  constructor(private readonly context: SanitizeContext) {}

  private prefixId(id: string): string | null {
    const prefix = `ai-${sanitizeIdPart(this.context.blockId)}-`;
    // Idempotent: stored (already sanitized) HTML can go through the sanitizer again without growing its ids.
    if (id.startsWith(prefix) && SAFE_ID.test(id.slice(prefix.length))) return id;
    const part = sanitizeIdPart(id);
    return SAFE_ID.test(part) ? `${prefix}${part}` : null;
  }

  /** The attributes `element` keeps, in a canonical order (class first). */
  attrs(tag: string, attrs: readonly [string, string][], isRoot: boolean): [string, string][] {
    const out: [string, string][] = [];
    const drop = (name: string) => bump(this.report.droppedAttrs, name.startsWith("on") ? "on*" : name);
    let type: string | null = null;
    for (const [rawName, rawValue] of attrs) {
      const name = rawName.toLowerCase();
      const value = rawValue;
      if (name === "class") {
        const kept: string[] = [];
        for (const token of value.split(/\s+/).filter(Boolean)) {
          this.report.classesTotal++;
          const check = checkClass(token);
          if (!check.ok) {
            this.report.droppedClasses[check.reason] = (this.report.droppedClasses[check.reason] ?? 0) + 1;
            continue;
          }
          if (kept.length >= BLOCK_LIMITS.classesPerElement || kept.includes(token)) continue;
          kept.push(token);
        }
        this.report.classesKept += kept.length;
        if (kept.length > 0) out.push(["class", kept.join(" ")]);
        continue;
      }
      if (name === "data-block-id") {
        if (isRoot) out.push([name, this.context.blockId]);
        else drop(name);
        continue;
      }
      if (name === "data-icon") {
        if (tag !== "i") {
          drop(name);
          continue;
        }
        const icon = value.trim().toLowerCase();
        if (ICONS.has(icon)) out.push([name, icon]);
        else {
          this.report.unknownIcons.push(icon.slice(0, 40));
          out.push([name, FALLBACK_ICON]);
        }
        continue;
      }
      if (name === "data-placeholder") {
        if (tag === "img" && PLACEHOLDERS.has(value.trim())) out.push([name, value.trim()]);
        else if (tag === "img") out.push([name, "photo"]);
        else drop(name);
        continue;
      }
      if (name === "data-asset") {
        if (tag === "img" && value.trim() === "logo") out.push([name, "logo"]);
        else drop(name);
        continue;
      }
      if (name === "href") {
        if (tag !== "a") {
          drop(name);
          continue;
        }
        const target = /^#screen:([\w-]{1,64})$/.exec(value.trim());
        out.push(["href", target && this.context.screenIds.includes(target[1]!) ? `#screen:${target[1]}` : "#"]);
        continue;
      }
      if (name === "alt" || name === "placeholder" || name === "aria-label" || name === "aria-roledescription" || name === "aria-valuetext") {
        out.push([name, cleanAttrText(value)]);
        continue;
      }
      if (ID_REF_ATTRS.has(name)) {
        const refs = value.split(/\s+/).map((ref) => this.prefixId(ref)).filter((ref): ref is string => ref !== null);
        if (refs.length > 0) out.push([name, refs.join(" ")]);
        else drop(name);
        continue;
      }
      if (ARIA.has(name)) {
        const clean = cleanAttrText(value, 40);
        if (/^[\w .-]*$/.test(clean)) out.push([name, clean]);
        else drop(name);
        continue;
      }
      if (name === "role") {
        if (ROLES.has(value.trim())) out.push([name, value.trim()]);
        else drop(name);
        continue;
      }
      if (name === "id" || name === "for") {
        if ((name === "for" && tag !== "label") || isRoot) {
          drop(name);
          continue;
        }
        const id = this.prefixId(value);
        if (id) out.push([name, id]);
        else drop(name);
        continue;
      }
      if (name === "type") {
        if (tag === "button") out.push([name, "button"]);
        else if (tag === "input") {
          type = INPUT_TYPES.has(value.trim().toLowerCase()) ? value.trim().toLowerCase() : "text";
          out.push([name, type]);
        } else drop(name);
        continue;
      }
      if (name === "name") {
        // Only form controls: a `name` elsewhere (img) clobbers `document`'s own properties.
        if (NAMED_TAGS.has(tag) && /^[\w-]{1,64}$/.test(value)) out.push([name, value]);
        else drop(name);
        continue;
      }
      if (name === "scope") {
        if (tag === "th" && (value === "row" || value === "col")) out.push([name, value]);
        else drop(name);
        continue;
      }
      if (name === "colspan" || name === "rowspan") {
        const n = Number(value);
        if ((tag === "td" || tag === "th") && Number.isInteger(n) && n >= 1 && n <= 12) out.push([name, String(n)]);
        else drop(name);
        continue;
      }
      if (name === "datetime") {
        if (tag === "time" && /^[\d:TZ+ -]{1,40}$/.test(value)) out.push([name, value]);
        else drop(name);
        continue;
      }
      if (name === "value") {
        out.push([name, cleanAttrText(value)]);
        continue;
      }
      if (name === "checked" || name === "disabled" || name === "selected") {
        out.push([name === "selected" ? "aria-selected" : name, name === "selected" ? "true" : ""]);
        continue;
      }
      if (name === "tabindex") {
        if (value === "0" || value === "-1") out.push([name, value]);
        else drop(name);
        continue;
      }
      drop(name);
    }
    if (tag === "button" && !out.some(([name]) => name === "type")) out.push(["type", "button"]);
    if (tag === "img" && !out.some(([name]) => name === "alt")) out.push(["alt", ""]);
    if (tag === "img" && !out.some(([name]) => name === "data-placeholder" || name === "data-asset")) out.push(["data-placeholder", "photo"]);
    if (tag === "input" && type === "password") out.push(["autocomplete", "off"]);
    if (tag === "a" && !out.some(([name]) => name === "href")) out.push(["href", "#"]);
    // One value per name (the first, as a browser keeps it), `class` first, then the rest as kept: a canonical
    // order keeps diffs and undo snapshots small, and sanitizing the output again changes nothing.
    const seen = new Set<string>();
    return out
      .filter(([name]) => (seen.has(name) ? false : (seen.add(name), true)))
      .sort(([a], [b]) => (a === "class" ? -1 : b === "class" ? 1 : 0));
  }

  children(nodes: readonly RawNode[], depth: number): AiNode[] {
    const out: AiNode[] = [];
    for (const node of nodes) {
      if (node.type === "text") {
        const value = cleanText(node.value);
        if (value) out.push({ type: "text", value });
        continue;
      }
      if (node.namespace !== HTML_NS || DROP_WITH_CONTENT.has(node.tag)) {
        bump(this.report.droppedTags, node.namespace !== HTML_NS ? node.namespace.split("/").pop() ?? "ns" : node.tag);
        this.report.hostile++;
        continue;
      }
      if (!ALLOWED_TAGS.has(node.tag)) {
        // Unknown but harmless (`<center>`, `<font>`, `<form>`): its content stays, the tag goes.
        bump(this.report.droppedTags, node.tag);
        out.push(...this.children(node.children, depth));
        continue;
      }
      out.push(this.element(node, depth + 1, false));
    }
    return out;
  }

  element(node: Extract<RawNode, { type: "element" }>, depth: number, isRoot: boolean): AiElement {
    this.elements++;
    this.maxDepth = Math.max(this.maxDepth, depth);
    const tag = node.tag === "b" ? "strong" : node.tag;
    return {
      type: "element",
      tag,
      attrs: this.attrs(tag, node.attrs, isRoot),
      children: VOID_TAGS.has(tag) ? [] : this.children(node.children, depth),
    };
  }
}

/** Marks every element with its own visible text as `data-dl-t="n"` (document order): the inline text edit's handle. */
function markText(root: AiElement): number {
  let n = 0;
  const visit = (element: AiElement) => {
    element.attrs = element.attrs.filter(([name]) => name !== "data-dl-t");
    if (element.children.some((child) => child.type === "text" && child.value.trim() !== "")) element.attrs.push(["data-dl-t", String(n++)]);
    for (const child of element.children) if (child.type === "element") visit(child);
  };
  visit(root);
  return n;
}

/**
 * One block's raw HTML → its canonical, sanitized HTML. Exactly one root element of `ROOT_TAGS` is kept (extra
 * top-level elements are dropped and counted); the root carries `data-block-id` = `context.blockId` whatever the
 * model wrote (the structure gate checks the id BEFORE calling this). Over the caps of spec §2.1 the block fails
 * (it is never truncated halfway).
 */
export function sanitizeBlock(raw: string, context: SanitizeContext): SanitizeResult {
  let result = sanitizeOnce(raw, context);
  // Fixpoint: unwrapping a tag can leave a nesting the HTML parser rebuilds differently (`<h2>` inside `<h1>`, a `<p>`
  // in a `<p>`, table parts out of place). The stored HTML must parse back into exactly the tree it was serialized
  // from (no mutation between us and the browser), so the output goes through the sanitizer again until it is stable.
  for (let pass = 0; pass < MAX_PASSES && result.ok; pass++) {
    const again = sanitizeOnce(result.html, context);
    if (!again.ok) return { ok: false, failure: again.failure, report: result.report };
    if (again.html === result.html) return result;
    result = { ...again, report: result.report };
  }
  return result.ok ? { ok: false, failure: "unstable", report: result.report } : result;
}

const MAX_PASSES = 4;

function sanitizeOnce(raw: string, context: SanitizeContext): SanitizeResult {
  const walker = new Walker(context);
  if (new TextEncoder().encode(raw).length > BLOCK_LIMITS.rawBytes) return { ok: false, failure: "too-large", report: walker.report };
  const { nodes } = parseRaw(raw);
  const roots = nodes.filter((node): node is Extract<RawNode, { type: "element" }> => node.type === "element");
  if (roots.length === 0) return { ok: false, failure: "no-root", report: walker.report };
  const [first, ...extra] = roots;
  for (const node of extra) bump(walker.report.droppedTags, `extra-root:${node.tag}`);
  if (first!.namespace !== HTML_NS || !ROOT_TAGS.has(first!.tag)) return { ok: false, failure: "wrong-root", report: walker.report };
  const root = walker.element(first!, 1, true);
  if (!root.attrs.some(([name]) => name === "data-block-id")) root.attrs.push(["data-block-id", context.blockId]);
  if (walker.elements > BLOCK_LIMITS.elements) return { ok: false, failure: "too-many-elements", report: walker.report };
  if (walker.maxDepth > BLOCK_LIMITS.depth) return { ok: false, failure: "too-deep", report: walker.report };
  const textNodes = markText(root);
  if (root.children.length === 0) return { ok: false, failure: "empty", report: walker.report };
  const html = serialize([root]);
  if (new TextEncoder().encode(html).length > BLOCK_LIMITS.bytes) return { ok: false, failure: "too-large", report: walker.report };
  return { ok: true, html, tree: root, report: walker.report, textNodes };
}

/** Share of class tokens the grammar dropped (gate 2 fails the block above 15 %). */
export const droppedClassRatio = (report: SanitizeReport): number =>
  report.classesTotal === 0 ? 0 : (report.classesTotal - report.classesKept) / report.classesTotal;

/** Surface classes of a container block (spec §1 [C15]): only the classes, validated, no HTML. */
export function sanitizeSurfaceClasses(classes: readonly string[]): string[] {
  const allowed = /^(?:bg|from|via|to|border|rounded|shadow|p|px|py|pt|pb|pl|pr|ring)(?:-|$)/;
  const out: string[] = [];
  for (const token of classes) {
    const utility = token.split(":").pop() ?? "";
    if (checkClass(token).ok && allowed.test(utility) && !out.includes(token)) out.push(token);
    if (out.length >= BLOCK_LIMITS.classesPerElement) break;
  }
  return out;
}
