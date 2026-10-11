// The sanitizer of AI blocks (spec §6.2): parse5 parses, an allowlist walks the AST, and the HTML is re-serialized
// from the kept tree (./tree). Pure TS, no DOM: it runs in a worker of the app and on the server for the export. It is
// the first wall; the real guarantee is the sandboxed iframe on the preview origin and its CSP.
import { ICON_NAMES } from "@dialmade/ui/icons";
import { HTML_NS, parseRaw, serialize, SVG_NS, VOID_TAGS, type AiElement, type AiNode, type RawNode } from "./tree";
import { ALLOWED_TAGS, INPUT_TYPES, NAMED_TAGS, ROOT_TAGS } from "./allowlist";
import { CHART_LIMITS, canonicalChartValues, isChartKind, parseChartHighlight, parseChartLabels, parseChartUnit, parseChartValues } from "./chart";
import { checkClass, type ClassRejection } from "./vocabulary";
import { prefixedId, sanitizeCss, sanitizeStyleAttr, sectionIdPrefix, type CssFonts } from "./pageCss";
import { checkSvgAttr, SVG_HOSTILE, SVG_TAGS } from "./svgAllowlist";

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

/** Caps of page mode: a section draws its own SVG and carries its own rules, so it is larger. */
export const PAGE_BLOCK_LIMITS = {
  rawBytes: 64 * 1024,
  bytes: 48 * 1024,
  elements: 1500,
  depth: 48,
  classesPerElement: 40,
  textLength: 2000,
} as const;

/** «blocks»: token classes only (the default). «page»: own class names, one scoped `<style>` per section and inline SVG. */
export type SanitizeMode = "blocks" | "page";

export type SanitizeContext = {
  /** The block this root must carry as `data-block-id`. */
  blockId: string;
  /** Screen ids a `#screen:<id>` link may point to. */
  screenIds: readonly string[];
  mode?: SanitizeMode;
  /** Page mode: the brand's family names, so its CSS may name them (`fontRolesOf` of the theme's variables). */
  fonts?: CssFonts;
};

/** A class name of page mode: lowercase, short, never the base kit's `dl-` prefix. */
const PAGE_CLASS = /^(?!dl-)[a-z][a-z0-9_-]{0,48}$/;

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
  /** Page mode: CSS declarations and rules the CSS sanitizer dropped. */
  cssDropped: number;
};

export type SanitizeFailure = "too-large" | "too-many-elements" | "too-deep" | "no-root" | "wrong-root" | "empty" | "unstable";

export type SanitizeResult =
  | { ok: true; html: string; tree: AiElement; report: SanitizeReport; textNodes: number }
  | { ok: false; failure: SanitizeFailure; report: SanitizeReport };

const emptyReport = (): SanitizeReport => ({ droppedTags: {}, droppedAttrs: {}, droppedClasses: {}, classesTotal: 0, classesKept: 0, unknownIcons: [], hostile: 0, cssDropped: 0 });
const bump = (record: Record<string, number>, key: string) => (record[key] = (record[key] ?? 0) + 1);


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
  /** Page mode: CSS found below the root (a nested `<style>`, an SVG's `<style>`), merged into the root's own. */
  private nestedCss: string[] = [];
  constructor(private readonly context: SanitizeContext) {}

  private get cssOptions() {
    return this.context.fonts ? { fonts: this.context.fonts } : {};
  }

  private get page(): boolean {
    return this.context.mode === "page";
  }

  /** The class list of page mode: own names (the page stylesheet defines them); anything else is dropped. */
  private pageClasses(value: string): string | null {
    const kept: string[] = [];
    for (const token of value.split(/\s+/).filter(Boolean)) {
      this.report.classesTotal++;
      if (!PAGE_CLASS.test(token)) {
        this.report.droppedClasses.unknown = (this.report.droppedClasses.unknown ?? 0) + 1;
        continue;
      }
      if (kept.length >= PAGE_BLOCK_LIMITS.classesPerElement || kept.includes(token)) continue;
      kept.push(token);
    }
    this.report.classesKept += kept.length;
    return kept.length > 0 ? kept.join(" ") : null;
  }

  private prefixId(id: string): string | null {
    // Idempotent: stored (already sanitized) HTML can go through the sanitizer again without growing its ids.
    return prefixedId(id, sectionIdPrefix(this.context.blockId));
  }

  /** The attributes `element` keeps, in a canonical order (class first). */
  attrs(tag: string, attrs: readonly [string, string][], isRoot: boolean): [string, string][] {
    const out: [string, string][] = [];
    const drop = (name: string) => bump(this.report.droppedAttrs, name.startsWith("on") ? "on*" : name);
    let type: string | null = null;
    for (const [rawName, rawValue] of attrs) {
      const name = rawName.toLowerCase();
      const value = rawValue;
      if (name === "class" && this.page) {
        const classes = this.pageClasses(value);
        if (classes) out.push(["class", classes]);
        continue;
      }
      if (name === "style" && this.page) {
        // Page mode: one-off declarations (a flex row, a custom property), under the stylesheets' rules.
        const style = sanitizeStyleAttr(value, { idPrefix: sectionIdPrefix(this.context.blockId), ...this.cssOptions });
        if (style) out.push(["style", style]);
        else drop(name);
        continue;
      }
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
      if (name === "data-chart") {
        // Charts are drawn from numbers (./chart): `<img data-chart="bar" data-values="1,2,3">`.
        if (tag === "img" && isChartKind(value.trim())) out.push([name, value.trim()]);
        else drop(name);
        continue;
      }
      if (name === "data-values") {
        const series = tag === "img" ? parseChartValues(value) : null;
        if (series) out.push([name, canonicalChartValues(series)]);
        else drop(name);
        continue;
      }
      if (name === "data-highlight") {
        const index = tag === "img" ? parseChartHighlight(value) : null;
        if (index !== null) out.push([name, String(index)]);
        else drop(name);
        continue;
      }
      if (name === "data-labels" || name === "data-series") {
        // The x axis (or a donut's segments) and the legend: short plain labels, re-checked against the numbers below.
        const labels = tag === "img" ? (name === "data-labels" ? parseChartLabels(value) : parseChartLabels(value, 1, CHART_LIMITS.series)) : null;
        if (labels) out.push([name, labels.join(",")]);
        else drop(name);
        continue;
      }
      if (name === "data-unit") {
        const unit = tag === "img" ? parseChartUnit(value) : null;
        if (unit) out.push([name, unit]);
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
    if (tag === "img") {
      // A chart needs both its kind and its numbers; one without the other is dropped, the stressed index must exist in
      // the data, and a chart is a «chart» image.
      const at = (attr: string) => out.findIndex(([name]) => name === attr);
      if (at("data-chart") >= 0 && at("data-values") < 0) out.splice(at("data-chart"), 1);
      if (at("data-values") >= 0 && at("data-chart") < 0) out.splice(at("data-values"), 1);
      if (at("data-highlight") >= 0) {
        const series = at("data-values") >= 0 ? parseChartValues(out[at("data-values")]![1]) : null;
        const longest = series ? Math.max(...series.map((s) => s.length)) : 0;
        if (Number(out[at("data-highlight")]![1]) >= longest) out.splice(at("data-highlight"), 1);
      }
      // Labels must match the points (a donut: its segments) and names the series; extras without a chart go.
      const series = at("data-values") >= 0 ? parseChartValues(out[at("data-values")]![1]) : null;
      const points = series ? (out[at("data-chart")]?.[1] === "donut" ? series[0]!.length : Math.max(...series.map((s) => s.length))) : 0;
      if (at("data-labels") >= 0 && out[at("data-labels")]![1].split(",").length !== points) out.splice(at("data-labels"), 1);
      if (at("data-series") >= 0 && out[at("data-series")]![1].split(",").length !== (series?.length ?? 0)) out.splice(at("data-series"), 1);
      if (at("data-unit") >= 0 && !series) out.splice(at("data-unit"), 1);
      if (at("data-chart") >= 0) {
        for (let i = out.length - 1; i >= 0; i--) if (out[i]![0] === "data-placeholder" || out[i]![0] === "data-asset") out.splice(i, 1);
        out.push(["data-placeholder", "chart"]);
      }
    }
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
      if (this.page && node.namespace === SVG_NS && node.tag === "svg") {
        out.push(this.svg(node, depth + 1));
        continue;
      }
      if (this.page && node.namespace === HTML_NS && node.tag === "style") {
        // A section's own rules: one stylesheet, a child of its root, scoped to it by the CSS sanitizer. One written
        // deeper joins it (see `element`).
        const text = node.children.map((child) => (child.type === "text" ? child.value : "")).join("");
        if (depth !== 1) {
          this.nestedCss.push(text);
          continue;
        }
        const css = sanitizeCss(text, { kind: "section", blockId: this.context.blockId }, this.cssOptions);
        this.report.cssDropped += css.report.droppedDeclarations + css.report.droppedRules;
        if (css.css) out.push({ type: "element", tag: "style", attrs: [], children: [{ type: "text", value: css.css }] });
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

  /** An inline SVG of page mode: allowlisted elements and attributes, ids and local references prefixed. */
  private svg(node: Extract<RawNode, { type: "element" }>, depth: number): AiElement {
    this.elements++;
    this.maxDepth = Math.max(this.maxDepth, depth);
    const children: AiNode[] = [];
    const holdsText = node.tag === "text" || node.tag === "tspan" || node.tag === "title" || node.tag === "desc";
    for (const child of node.children) {
      if (child.type === "text") {
        const value = holdsText ? cleanText(child.value) : "";
        if (value.trim()) children.push({ type: "text", value });
        continue;
      }
      if (SVG_HOSTILE.has(child.tag)) {
        bump(this.report.droppedTags, `svg:${child.tag}`);
        this.report.hostile++;
        continue;
      }
      if (child.namespace === SVG_NS && child.tag === "style") {
        // A drawing's own rules (`.bowl{fill:url(#glaze)}`): they join the section's stylesheet.
        this.nestedCss.push(child.children.map((text) => (text.type === "text" ? text.value : "")).join(""));
        continue;
      }
      if (child.namespace !== SVG_NS || !SVG_TAGS.has(child.tag)) {
        bump(this.report.droppedTags, `svg:${child.tag}`);
        continue;
      }
      children.push(this.svg(child, depth + 1));
    }
    return { type: "element", tag: node.tag, attrs: this.svgAttrs(node.tag, node.attrs), children };
  }

  private svgAttrs(tag: string, attrs: readonly [string, string][]): [string, string][] {
    const out: [string, string][] = [];
    for (const [rawName, value] of attrs) {
      const name = rawName.toLowerCase();
      if (name === "class") {
        const classes = this.pageClasses(value);
        if (classes) out.push(["class", classes]);
        continue;
      }
      if (name === "role") {
        if (/^(?:img|presentation|none)$/.test(value.trim())) out.push([name, value.trim()]);
        continue;
      }
      if (name === "aria-label") {
        out.push([name, cleanAttrText(value)]);
        continue;
      }
      if (name === "aria-hidden") {
        if (value.trim() === "true" || value.trim() === "false") out.push([name, value.trim()]);
        continue;
      }
      if (name === "style") {
        // A gradient paint (`fill:url(#g)`) points at the prefixed id, like the `fill` attribute.
        const style = sanitizeStyleAttr(value, { idPrefix: sectionIdPrefix(this.context.blockId), ...this.cssOptions });
        if (style) out.push([name, style]);
        continue;
      }
      const verdict = checkSvgAttr(name, value);
      if (!verdict.keep) {
        bump(this.report.droppedAttrs, name.startsWith("on") ? "on*" : `svg:${name}`);
        continue;
      }
      if ("value" in verdict) out.push([name, verdict.value]);
      else if ("ref" in verdict) {
        const id = this.prefixId(verdict.ref);
        if (id) out.push([name, `url(#${id})`]);
      } else {
        const id = this.prefixId(verdict.id);
        if (id) out.push([name, id]);
      }
    }
    if (tag === "svg") {
      // Decorative unless it says what it shows: a labelled drawing is an image for assistive technology.
      const labelled = out.some(([name]) => name === "aria-label");
      if (labelled && !out.some(([name]) => name === "role")) out.push(["role", "img"]);
      if (!labelled && !out.some(([name]) => name === "aria-hidden")) out.push(["aria-hidden", "true"]);
      if (!out.some(([name]) => name === "focusable")) out.push(["focusable", "false"]);
    }
    const seen = new Set<string>();
    return out
      .filter(([name]) => (seen.has(name) ? false : (seen.add(name), true)))
      .sort(([a], [b]) => (a === "class" ? -1 : b === "class" ? 1 : 0));
  }

  element(node: Extract<RawNode, { type: "element" }>, depth: number, isRoot: boolean): AiElement {
    this.elements++;
    this.maxDepth = Math.max(this.maxDepth, depth);
    const tag = node.tag === "b" ? "strong" : node.tag;
    const children = VOID_TAGS.has(tag) ? [] : this.children(node.children, depth);
    if (isRoot && this.page && this.nestedCss.length > 0) this.mergeNestedCss(children);
    return { type: "element", tag, attrs: this.attrs(tag, node.attrs, isRoot), children };
  }

  /** The CSS written below the root joins the root's stylesheet (one per section, its first child when it is new). */
  private mergeNestedCss(children: AiNode[]): void {
    const index = children.findIndex((child) => child.type === "element" && child.tag === "style");
    const own = index >= 0 ? (children[index] as AiElement).children.map((child) => (child.type === "text" ? child.value : "")).join("") : "";
    const css = sanitizeCss([own, ...this.nestedCss].join("\n"), { kind: "section", blockId: this.context.blockId }, this.cssOptions);
    this.report.cssDropped += css.report.droppedDeclarations + css.report.droppedRules;
    this.nestedCss = [];
    const style: AiElement = { type: "element", tag: "style", attrs: [], children: [{ type: "text", value: css.css }] };
    if (index >= 0) {
      if (css.css) children[index] = style;
      else children.splice(index, 1);
    } else if (css.css) children.unshift(style);
  }
}

/** Marks every element with its own visible text as `data-dl-t="n"` (document order): the inline text edit's handle. */
function markText(root: AiElement): number {
  let n = 0;
  const visit = (element: AiElement) => {
    // A page-mode stylesheet and drawings are not editable copy.
    if (element.tag === "style" || element.tag === "svg") return;
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

export const limitsOf = (mode: SanitizeMode | undefined) => (mode === "page" ? PAGE_BLOCK_LIMITS : BLOCK_LIMITS);

function sanitizeOnce(raw: string, context: SanitizeContext): SanitizeResult {
  const walker = new Walker(context);
  const limits = limitsOf(context.mode);
  if (new TextEncoder().encode(raw).length > limits.rawBytes) return { ok: false, failure: "too-large", report: walker.report };
  const { nodes } = parseRaw(raw);
  const roots = nodes.filter((node): node is Extract<RawNode, { type: "element" }> => node.type === "element");
  if (roots.length === 0) return { ok: false, failure: "no-root", report: walker.report };
  const [first, ...extra] = roots;
  for (const node of extra) bump(walker.report.droppedTags, `extra-root:${node.tag}`);
  if (first!.namespace !== HTML_NS || !ROOT_TAGS.has(first!.tag)) return { ok: false, failure: "wrong-root", report: walker.report };
  const root = walker.element(first!, 1, true);
  if (!root.attrs.some(([name]) => name === "data-block-id")) root.attrs.push(["data-block-id", context.blockId]);
  if (walker.elements > limits.elements) return { ok: false, failure: "too-many-elements", report: walker.report };
  if (walker.maxDepth > limits.depth) return { ok: false, failure: "too-deep", report: walker.report };
  const textNodes = markText(root);
  if (root.children.every((child) => child.type === "element" && child.tag === "style")) return { ok: false, failure: "empty", report: walker.report };
  const html = serialize([root]);
  if (new TextEncoder().encode(html).length > limits.bytes) return { ok: false, failure: "too-large", report: walker.report };
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
