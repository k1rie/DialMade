// The CSS of «Diseño con IA» in page mode: the model writes a page stylesheet and, per section, a few rules of its
// own. This sanitizer is the first wall for that CSS (the island's CSP and sandbox are the real guarantee): it keeps a
// small, re-serialized subset and scopes every selector. Pure TS, no DOM and no dependencies: it runs in the app's
// worker, on the server for the export and again inside the preview island (`@dialmade/ai-render/runtime`).
//
// Kept: style rules, @media, @container, @supports and @keyframes. Gone: every other at-rule (@import, @font-face,
// @namespace…), url() (but a local `url(#id)` paint of an SVG), image-set(), expression(), escapes, literal colors (the
// palette must stay switchable: colors go through the theme's variables) and font families other than the theme's
// (`var(--dl-font-*)`, generic families, or the brand's own family names, mapped to their variable).
// Repaired instead of dropped: `:root`, `html` and `body` rules land on the scope (a page's own custom properties
// live there), and `#id` selectors follow the ids the HTML sanitizer prefixed (`ai-<blockId>-`).

/** Where a stylesheet applies: the page (every AI block) or one section (its own root). */
export type CssScope = { kind: "page" } | { kind: "section"; blockId: string };

export type CssReport = {
  /** Declarations dropped (a literal color, a url(), a foreign font, an unknown property…). */
  droppedDeclarations: number;
  /** Rules or at-rules dropped whole (a forbidden at-rule, an unusable selector). */
  droppedRules: number;
};

export type CssResult = { css: string; report: CssReport };

/** The brand's font families (lowercase, unquoted) → the theme variable that carries each one. */
export type CssFonts = Readonly<Record<string, "heading" | "body" | "mono">>;

export type CssOptions = {
  /** The brand's family names, so `font-family: "Outfit"` becomes `var(--dl-font-heading)` instead of being dropped. */
  fonts?: CssFonts;
};

/** The prefix the HTML sanitizer gives a section's ids: its CSS and its local SVG references use it too. */
export const sectionIdPrefix = (blockId: string) => `ai-${blockId.replace(/[^\w-]/g, "").slice(0, 40)}-`;
const SAFE_ID = /^[A-Za-z][\w-]{0,40}$/;

/** A section id with the section's prefix (idempotent: an id that already has it stays); null when unusable. */
export function prefixedId(id: string, prefix: string): string | null {
  if (id.startsWith(prefix) && SAFE_ID.test(id.slice(prefix.length))) return id;
  const part = id.replace(/[^\w-]/g, "").slice(0, 40);
  return SAFE_ID.test(part) ? `${prefix}${part}` : null;
}

/** The theme's font roles (`--dl-font-heading`…) read back as family names, for `CssOptions.fonts`. */
export function fontRolesOf(vars: Readonly<Record<string, string>>): CssFonts {
  const out: Record<string, "heading" | "body" | "mono"> = {};
  for (const role of ["heading", "body", "mono"] as const) {
    const first = vars[`--dl-font-${role}`]?.split(",")[0]?.trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (first && !FONT_FAMILY_OK.test(first) && !/^(?:ui-|-apple|blinkmac)/.test(first) && !(first in out)) out[first] = role;
  }
  return out;
}

/** How a declaration treats a local `url(#id)`: prefixed for a section, kept as written (already prefixed), or dropped. */
type RefMode = { kind: "prefix"; prefix: string } | { kind: "keep" } | { kind: "drop" };
type DeclarationContext = { refs: RefMode; fonts?: CssFonts };

/** Caps of the page stylesheet and of one section's own rules (after sanitizing). */
export const CSS_LIMITS = { pageBytes: 32 * 1024, sectionBytes: 12 * 1024, rawBytes: 96 * 1024, depth: 4 } as const;

/** Every AI block sits in an element marked with this attribute (the island host, the export's wrapper). */
export const PAGE_SCOPE = ":where([data-dl-ai-block])";
export const sectionScope = (blockId: string) => `[data-block-id="${blockId.replace(/[^\w-]/g, "")}"]`;

const KEPT_AT_RULES: ReadonlySet<string> = new Set(["media", "container", "supports", "keyframes"]);

/** CSS named colors (and the system ones): words that would paint a color the palette cannot change. */
const NAMED_COLORS: ReadonlySet<string> = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue " +
    "chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey " +
    "darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray " +
    "darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen " +
    "fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen " +
    "lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime " +
    "limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue " +
    "mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive " +
    "olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
    "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke " +
    "yellow yellowgreen canvastext linktext visitedtext activetext buttonface buttontext buttonborder fieldtext " +
    "highlighttext selecteditem selecteditemtext marktext graytext accentcolor accentcolortext"
  ).split(" "),
);

/** Color functions that take literal channels (color-mix takes colors, so it stays: its colors are checked too). */
const LITERAL_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
/** Never in a value: resources, script-like constructs, escapes and anything that could close the stylesheet. */
const FORBIDDEN_VALUE = /url\s*\(|image-set\s*\(|image\s*\(|element\s*\(|expression\s*\(|javascript:|-moz-binding|behavior|\\|<|>|@|\{|\}/i;
/** Selectors: no braces, at signs, escapes, comments or attribute values that could carry a resource. */
const FORBIDDEN_SELECTOR = /[{}@\\<]|\/\*|url\s*\(|:host\b/i;
/** The document's own selectors (`:root`, `html`, `body`) anywhere but at the start: never kept. */
const DOCUMENT_SELECTOR = /:root\b|(?:^|[\s>+~,(])(?:html|body)(?![\w-])/i;
/** `:root`, `html` and `body` at the start of a selector (with their combinators): they become the scope itself. */
const LEADING_DOCUMENT = /^(?:(?::root|html|body)(?![\w-])\s*>?\s*)+/i;

const FONT_FAMILY_OK = /^(?:var\(--dl-font-(?:heading|body|mono)\)|serif|sans-serif|monospace|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|cursive|inherit)$/;
/** SVG paints and references that may point at a gradient, clip or mask of the same section. */
const LOCAL_REF_PROPERTIES: ReadonlySet<string> = new Set(["fill", "stroke", "clip-path", "mask"]);
const LOCAL_REF = /^url\(\s*#([A-Za-z][\w-]{0,80})\s*\)$/;
/** Properties that cannot be used at all (they leave the box or reach outside the page). */
const DROPPED_PROPERTIES: ReadonlySet<string> = new Set(["behavior", "-moz-binding", "src", "unicode-range", "font-display"]);
/** Values a property may not take: `position: fixed/sticky` leaves the block's box. */
const FORBIDDEN_POSITION = /^(?:fixed|sticky)$/i;

const emptyReport = (): CssReport => ({ droppedDeclarations: 0, droppedRules: 0 });

/** A minimal tokenizer: strips comments and splits the text into `{`, `}`, `;` and the runs between them (quotes kept). */
function chunks(css: string): string[] {
  const text = css.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, " ");
  const out: string[] = [];
  let current = "";
  let quote: string | null = null;
  let paren = 0;
  for (const c of text) {
    if (quote) {
      current += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      current += c;
      continue;
    }
    if (c === "(") paren++;
    if (c === ")") paren = Math.max(0, paren - 1);
    if ((c === "{" || c === "}" || (c === ";" && paren === 0))) {
      out.push(current);
      out.push(c);
      current = "";
      continue;
    }
    current += c;
  }
  out.push(current);
  return out;
}

type Node =
  | { kind: "rule"; selector: string; declarations: string[] }
  | { kind: "at"; name: string; prelude: string; children: Node[] }
  | { kind: "frame"; selector: string; declarations: string[] };

/** Parses the chunks into rules and at-rules; malformed input is skipped, never repaired into something larger. */
function parse(parts: string[], report: CssReport): Node[] {
  let i = 0;
  const block = (depth: number, inKeyframes: boolean): Node[] => {
    const nodes: Node[] = [];
    while (i < parts.length) {
      const part = parts[i]!;
      if (part === "}") {
        i++;
        return nodes;
      }
      if (part === "{" || part === ";") {
        i++;
        continue;
      }
      const head = part.trim();
      const next = parts[i + 1];
      if (!head) {
        i++;
        continue;
      }
      if (next === ";" || next === undefined || next === "}") {
        // A statement outside a rule (`@import …;`, stray text): dropped.
        if (head) report.droppedRules++;
        i += next === ";" ? 2 : 1;
        continue;
      }
      // `head {`: a rule, an at-rule or a keyframe selector.
      i += 2;
      if (head.startsWith("@")) {
        const match = /^@([a-z-]+)\s*([\s\S]*)$/i.exec(head);
        const name = match?.[1]?.toLowerCase() ?? "";
        if (!match || !KEPT_AT_RULES.has(name) || depth >= CSS_LIMITS.depth) {
          report.droppedRules++;
          skip();
          continue;
        }
        nodes.push({ kind: "at", name, prelude: match[2]!.trim(), children: block(depth + 1, name === "keyframes") });
        continue;
      }
      const declarations: string[] = [];
      while (i < parts.length && parts[i] !== "}") {
        const piece = parts[i]!;
        if (piece === "{") {
          // Nested rules are not kept: skip the nested block.
          report.droppedRules++;
          i++;
          skip();
          continue;
        }
        if (piece !== ";" && piece.trim()) declarations.push(piece.trim());
        i++;
      }
      i++;
      nodes.push(inKeyframes ? { kind: "frame", selector: head, declarations } : { kind: "rule", selector: head, declarations });
    }
    return nodes;
  };
  const skip = () => {
    let level = 1;
    while (i < parts.length && level > 0) {
      if (parts[i] === "{") level++;
      else if (parts[i] === "}") level--;
      i++;
    }
  };
  return block(0, false);
}

/** One `property: value`, cleaned, or null when it must go. */
function declaration(raw: string, report: CssReport, context: DeclarationContext): string | null {
  const colon = raw.indexOf(":");
  if (colon <= 0) return drop(report);
  const property = raw.slice(0, colon).trim().toLowerCase();
  let value = oklabMix(raw.slice(colon + 1).trim());
  const important = /!\s*important\s*$/i.test(value);
  value = value.replace(/!\s*important\s*$/i, "").trim();
  if (!/^(?:--[a-z0-9-]{1,48}|-?[a-z][a-z-]{0,48})$/.test(property) || !value || value.length > 600) return drop(report);
  // A gradient, clip or mask of the section's own SVG: kept, pointing at the id the HTML sanitizer gave it.
  const ref = LOCAL_REF_PROPERTIES.has(property) ? LOCAL_REF.exec(value) : null;
  if (ref) {
    if (context.refs.kind === "drop") return drop(report);
    const id = context.refs.kind === "prefix" ? prefixedId(ref[1]!, context.refs.prefix) : ref[1]!;
    return id ? `${property}:url(#${id})${important ? " !important" : ""}` : drop(report);
  }
  if (context.fonts && (property === "font-family" || property === "font")) value = brandFonts(value, context.fonts);
  if (DROPPED_PROPERTIES.has(property) || FORBIDDEN_VALUE.test(value)) return drop(report);
  if (property === "position" && FORBIDDEN_POSITION.test(value)) return drop(report);
  if (property === "font-family" && !value.split(",").every((family) => FONT_FAMILY_OK.test(family.trim()))) return drop(report);
  if (property === "font" && !/var\(--dl-font-(?:heading|body|mono)\)|\b(?:serif|sans-serif|monospace|system-ui)\b/.test(value)) return drop(report);
  if (property === "font" && /["']/.test(value)) return drop(report);
  if (hasLiteralColor(value, property)) return drop(report);
  // `z-index` stays inside the block's own stacking context: a small range is enough.
  if (property === "z-index" && !/^-?\d{1,2}$/.test(value)) return drop(report);
  return `${property}:${value}${important ? " !important" : ""}`;
}

/**
 * `color-mix(in oklch, var(--primary) 20%, white)` swings the hue toward 0 (pink) because the theme's whites and
 * grays carry an explicit hue of 0: mixing in oklab (or srgb) has no hue to interpolate, so a tint stays the brand's.
 */
export const oklabMix = (value: string): string => value.replace(/color-mix\(\s*in\s+(?:oklch|lch|hsl|hwb)(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?\b/gi, "color-mix(in oklab");

/** The brand's quoted or bare family names in a font value → their theme variables. */
function brandFonts(value: string, fonts: CssFonts): string {
  return value.replace(/(["'])([^"']{1,60})\1|(?<![\w-])([A-Za-z][\w -]{0,58}[A-Za-z0-9])(?=\s*(?:,|$))/g, (match, _quote, quoted, bare) => {
    const role = fonts[String(quoted ?? bare).trim().toLowerCase()];
    return role ? `var(--dl-font-${role})` : match;
  });
}

/**
 * A `style` attribute of page mode: the same declaration rules as the stylesheets; "" when nothing is left. With
 * `idPrefix` (the HTML sanitizer, for one section) a local `url(#id)` points at the prefixed id; without it (the
 * island's second wall, on HTML that was already sanitized) it is kept as written.
 */
export function sanitizeStyleAttr(text: string, options: CssOptions & { idPrefix?: string } = {}): string {
  if (text.length > 2000) return "";
  const report = emptyReport();
  const context: DeclarationContext = { refs: options.idPrefix ? { kind: "prefix", prefix: options.idPrefix } : { kind: "keep" }, ...(options.fonts && { fonts: options.fonts }) };
  return chunks(text)
    .filter((part) => part !== ";" && part.trim() && part !== "{" && part !== "}")
    .map((part) => declaration(part.trim(), report, context))
    .filter((d): d is string => d !== null)
    .join(";");
}

const drop = (report: CssReport): null => {
  report.droppedDeclarations++;
  return null;
};

/** A color the palette cannot reach: a literal (`#fff`, `rgb()`, `oklch()`) or a named color outside strings. */
function hasLiteralColor(value: string, property: string): boolean {
  const unquoted = value.replace(/(["'])(?:(?!\1).)*\1/g, '""').replace(/--[\w-]+/g, "--v");
  if (LITERAL_COLOR.test(unquoted)) return true;
  // Names of keyframes, grid areas, counters and custom properties are identifiers, not colors.
  if (/^(?:animation(?:-name)?|grid(?:-template)?-areas|grid-area|counter-(?:reset|increment|set)|content|transition(?:-property)?|will-change|--.*)$/.test(property)) return false;
  for (const word of unquoted.toLowerCase().match(/[a-z]+/g) ?? []) if (NAMED_COLORS.has(word)) return true;
  return false;
}

/**
 * `#id` selectors follow the HTML sanitizer's ids: a section's own (`#ai-<blockId>-id`), or on the page stylesheet,
 * whichever section has it (`[id$="-id"]`). Quoted attribute values are left alone.
 */
function rewriteIds(selector: string, scope: CssScope): string | null {
  let ok = true;
  const rewritten = selector
    .split(/("[^"]*"|'[^']*')/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/#([A-Za-z_-][\w-]*)/g, (_, id: string) => {
            if (scope.kind === "page") return SAFE_ID.test(id) ? `[id$="-${id}"]` : ((ok = false), "");
            const next = prefixedId(id, sectionIdPrefix(scope.blockId));
            if (!next) ok = false;
            return `#${next ?? ""}`;
          }),
    )
    .join("");
  return ok ? rewritten : null;
}

/** The selector list scoped to `scope`; null when nothing usable is left. */
function scopeSelectors(list: string, scope: CssScope): string | null {
  if (FORBIDDEN_SELECTOR.test(list) || list.length > 600) return null;
  const prefix = scope.kind === "page" ? PAGE_SCOPE : sectionScope(scope.blockId);
  const out: string[] = [];
  for (const raw of list.split(",")) {
    let selector = raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\[data-block-id\s*=\s*(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\s*\]/g, (_, a, b, c) => sectionScope(a ?? b ?? c));
    if (!selector) continue;
    // Quotes only inside an attribute selector (`a[href="#x"]`): anywhere else the selector is malformed.
    if (/["']/.test(selector.replace(/\[[^\]]*\]/g, ""))) continue;
    // `:root{--pad:…}`, `body .x`: the document is the scope here (a page's own tokens live on it).
    const leading = LEADING_DOCUMENT.exec(selector);
    const onScope = leading !== null && leading[0].length === selector.length;
    if (leading) selector = selector.slice(leading[0].length).trim();
    if (DOCUMENT_SELECTOR.test(selector)) continue;
    const ids = rewriteIds(selector, scope);
    if (ids === null) continue;
    selector = ids;
    if (scope.kind === "section") {
      // The section's own rules: they must start at its root (written or not).
      const own = sectionScope(scope.blockId);
      if (onScope) out.push(own);
      else if (selector.startsWith(own)) out.push(selector);
      else if (/^\[data-block-id/.test(selector)) continue; // another section: never
      else out.push(`${own} ${selector}`);
    } else if (onScope) out.push(PAGE_SCOPE);
    else out.push(selector.startsWith(`${PAGE_SCOPE} `) || selector === PAGE_SCOPE ? selector : `${prefix} ${selector}`);
  }
  return out.length > 0 ? [...new Set(out)].join(",") : null;
}

/** Cleans a keyframes name or an at-rule prelude; null when it carries something it should not. */
function prelude(name: string, text: string): string | null {
  if (/url\s*\(|\\|@|[{}]|<\/|<!/i.test(text) || text.length > 300) return null;
  if (name === "keyframes") return /^[A-Za-z][\w-]{0,48}$/.test(text) ? text : null;
  if (name === "container") return /^(?:[a-z][\w-]{0,40}\s+)?\(.*\)$/i.test(text) || /^\(.*\)$/.test(text) ? text : null;
  return text;
}

function serialize(nodes: Node[], scope: CssScope, report: CssReport, context: DeclarationContext): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "at") {
      const head = prelude(node.name, node.prelude);
      const body = serialize(node.children, scope, report, context);
      if (head === null) {
        report.droppedRules++;
        continue;
      }
      if (body) out += `@${node.name} ${head}{${body}}`;
      continue;
    }
    const declarations = node.declarations.map((d) => declaration(d, report, context)).filter((d): d is string => d !== null);
    if (declarations.length === 0) continue;
    if (node.kind === "frame") {
      if (!/^(?:from|to|\d{1,3}(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d{1,3}(?:\.\d+)?%))*$/.test(node.selector)) {
        report.droppedRules++;
        continue;
      }
      out += `${node.selector}{${declarations.join(";")}}`;
      continue;
    }
    const selector = scopeSelectors(node.selector, scope);
    if (!selector) {
      report.droppedRules++;
      continue;
    }
    out += `${selector}{${declarations.join(";")}}`;
  }
  return out;
}

/**
 * Model-written CSS → its sanitized, scoped and re-serialized form. Idempotent: the output sanitized again is the
 * same text (stored CSS goes through it again in the island and in the export). Over the cap it is emptied, never cut.
 */
export function sanitizeCss(css: string, scope: CssScope, options: CssOptions = {}): CssResult {
  const report = emptyReport();
  if (css.length > CSS_LIMITS.rawBytes) return { css: "", report: { ...report, droppedRules: 1 } };
  // A section's SVG references point at its prefixed ids; the page stylesheet cannot know which section holds one.
  const refs: RefMode = scope.kind === "section" ? { kind: "prefix", prefix: sectionIdPrefix(scope.blockId) } : { kind: "drop" };
  const out = serialize(parse(chunks(css), report), scope, report, { refs, ...(options.fonts && { fonts: options.fonts }) });
  const cap = scope.kind === "page" ? CSS_LIMITS.pageBytes : CSS_LIMITS.sectionBytes;
  if (out.includes("</") || new TextEncoder().encode(out).length > cap) return { css: "", report: { ...report, droppedRules: report.droppedRules + 1 } };
  return { css: out, report };
}

/** What every page-mode root needs besides the page's own CSS: it is a size container for its `@container` rules. */
export const PAGE_BASE_CSS = "[data-dl-ai-block]>[data-block-id]{container-type:inline-size;display:block}";
