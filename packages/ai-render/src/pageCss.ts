// The CSS of «Diseño con IA» in page mode: the model writes a page stylesheet and, per section, a few rules of its
// own. This sanitizer is the first wall for that CSS (the island's CSP and sandbox are the real guarantee): it keeps a
// small, re-serialized subset and scopes every selector. Pure TS, no DOM and no dependencies: it runs in the app's
// worker, on the server for the export and again inside the preview island (`@dialmade/ai-render/runtime`).
//
// Kept: style rules, @media, @container, @supports and @keyframes. Gone: every other at-rule (@import, @font-face,
// @namespace…), url(), image-set(), expression(), escapes, literal colors (the palette must stay switchable: colors go
// through the theme's variables) and font families other than the theme's (`var(--dl-font-*)` and generic families).

/** Where a stylesheet applies: the page (every AI block) or one section (its own root). */
export type CssScope = { kind: "page" } | { kind: "section"; blockId: string };

export type CssReport = {
  /** Declarations dropped (a literal color, a url(), a foreign font, an unknown property…). */
  droppedDeclarations: number;
  /** Rules or at-rules dropped whole (a forbidden at-rule, an unusable selector). */
  droppedRules: number;
};

export type CssResult = { css: string; report: CssReport };

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
const FORBIDDEN_SELECTOR = /[{}@\\<]|\/\*|url\s*\(|:root\b|:host\b|(?:^|[\s>+~,(])(?:html|body)(?![\w-])/i;

const FONT_FAMILY_OK = /^(?:var\(--dl-font-(?:heading|body|mono)\)|serif|sans-serif|monospace|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|cursive|inherit)$/;
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
function declaration(raw: string, report: CssReport): string | null {
  const colon = raw.indexOf(":");
  if (colon <= 0) return drop(report);
  const property = raw.slice(0, colon).trim().toLowerCase();
  let value = oklabMix(raw.slice(colon + 1).trim());
  const important = /!\s*important\s*$/i.test(value);
  value = value.replace(/!\s*important\s*$/i, "").trim();
  if (!/^(?:--[a-z0-9-]{1,48}|-?[a-z][a-z-]{0,48})$/.test(property) || !value || value.length > 600) return drop(report);
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

/** A `style` attribute of page mode: the same declaration rules as the stylesheets; "" when nothing is left. */
export function sanitizeStyleAttr(text: string): string {
  if (text.length > 2000) return "";
  const report = emptyReport();
  return chunks(text)
    .filter((part) => part !== ";" && part.trim() && part !== "{" && part !== "}")
    .map((part) => declaration(part.trim(), report))
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

/** The selector list scoped to `scope`; null when nothing usable is left. */
function scopeSelectors(list: string, scope: CssScope): string | null {
  if (FORBIDDEN_SELECTOR.test(list) || list.length > 600) return null;
  const prefix = scope.kind === "page" ? PAGE_SCOPE : sectionScope(scope.blockId);
  const out: string[] = [];
  for (const raw of list.split(",")) {
    const selector = raw
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\[data-block-id\s*=\s*(?:"([\w-]+)"|'([\w-]+)'|([\w-]+))\s*\]/g, (_, a, b, c) => sectionScope(a ?? b ?? c));
    if (!selector) continue;
    if (scope.kind === "section") {
      // The section's own rules: they must start at its root (written or not).
      const own = sectionScope(scope.blockId);
      if (selector.startsWith(own)) out.push(selector);
      else if (/^\[data-block-id/.test(selector)) continue; // another section: never
      else out.push(`${own} ${selector}`);
    } else out.push(selector.startsWith(`${PAGE_SCOPE} `) ? selector : `${prefix} ${selector}`);
  }
  return out.length > 0 ? out.join(",") : null;
}

/** Cleans a keyframes name or an at-rule prelude; null when it carries something it should not. */
function prelude(name: string, text: string): string | null {
  if (/url\s*\(|\\|@|[{}]|<\/|<!/i.test(text) || text.length > 300) return null;
  if (name === "keyframes") return /^[A-Za-z][\w-]{0,48}$/.test(text) ? text : null;
  if (name === "container") return /^(?:[a-z][\w-]{0,40}\s+)?\(.*\)$/i.test(text) || /^\(.*\)$/.test(text) ? text : null;
  return text;
}

function serialize(nodes: Node[], scope: CssScope, report: CssReport): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "at") {
      const head = prelude(node.name, node.prelude);
      const body = serialize(node.children, scope, report);
      if (head === null) {
        report.droppedRules++;
        continue;
      }
      if (body) out += `@${node.name} ${head}{${body}}`;
      continue;
    }
    const declarations = node.declarations.map((d) => declaration(d, report)).filter((d): d is string => d !== null);
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
export function sanitizeCss(css: string, scope: CssScope): CssResult {
  const report = emptyReport();
  if (css.length > CSS_LIMITS.rawBytes) return { css: "", report: { ...report, droppedRules: 1 } };
  const out = serialize(parse(chunks(css), report), scope, report);
  const cap = scope.kind === "page" ? CSS_LIMITS.pageBytes : CSS_LIMITS.sectionBytes;
  if (out.includes("</") || new TextEncoder().encode(out).length > cap) return { css: "", report: { ...report, droppedRules: report.droppedRules + 1 } };
  return { css: out, report };
}

/** What every page-mode root needs besides the page's own CSS: it is a size container for its `@container` rules. */
export const PAGE_BASE_CSS = "[data-dl-ai-block]>[data-block-id]{container-type:inline-size;display:block}";
