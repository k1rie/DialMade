// «Copiar TSX» (spec §2.4): a DETERMINISTIC transformation of a sanitized AI block into a React component, no AI. It
// works on the canonical tree (./tree) so the output only ever contains what the sanitizer allows:
//   · `class` → `className`, `for` → `htmlFor`, `tabindex` → `tabIndex`… (React's names), `checked`/`value` of
//     form controls → `defaultChecked`/`defaultValue` (uncontrolled, no React warnings);
//   · empty elements close themselves; text is escaped for JSX (`{"…"}` when it has `{ } < > &`), and the spaces that
//     matter between inline elements are kept as `{" "}`;
//   · `<i data-icon>` → `<Icon name>`, `<img data-placeholder|data-asset>` → `<Placeholder kind>`, both from the
//     assets module this file also writes (`tsxAssetsModule`: our own icon set, no brand logos);
//   · `#screen:<id>` → the route of that screen;
//   · the inline-edit handles (`data-dl-t`) go.
// One component per block (`HeroB7k`), plus `exportThemeCss()` (./theme) for a Tailwind v4 project.
import { ICONS } from "@dialmade/ui/icons";
import { placeholderSvg } from "./assets";
import { hash32 } from "./direction";
import { PLACEHOLDER_KINDS } from "./sanitize";
import { HTML_NS, VOID_TAGS, parseRaw, parseSanitized, type AiElement, type AiNode, type RawNode } from "./tree";

export type TsxOptions = {
  /** Component name; default `componentName(label ?? "Block", blockId)`. */
  name?: string;
  /** Visible name of the block (the layout's label), for the default name and the header. */
  label?: string;
  /** Screen id → its route, for `#screen:<id>` links (unknown ids become `#`). */
  routes?: Readonly<Record<string, string>>;
  /** Where `Icon` and `Placeholder` come from (default `./dialmade-assets`). */
  assetsImport?: string;
  /** Provenance for the header comment. */
  model?: string;
  createdAt?: string;
};

/** React's names for the HTML attributes an AI block may carry. */
const REACT_ATTRS: Readonly<Record<string, string>> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  colspan: "colSpan",
  rowspan: "rowSpan",
  autocomplete: "autoComplete",
  datetime: "dateTime",
};
const FORM_VALUE_TAGS = new Set(["input", "select", "textarea"]);
/** Attributes React types as numbers: written as `{n}`. */
const NUMERIC_ATTRS = new Set(["tabindex", "colspan", "rowspan", "aria-level", "aria-valuenow", "aria-valuemin", "aria-valuemax"]);
/**
 * Tags laid out as blocks: whitespace-only text next to one (or at the edges of one) is never rendered, so it is not
 * written (it would only be `{" "}` noise). Between inline elements it is a real space and stays.
 */
const BLOCK_TAGS = new Set([
  "section", "header", "footer", "nav", "aside", "div", "main", "article", "ul", "ol", "li", "dl", "dt", "dd", "p",
  "h1", "h2", "h3", "h4", "h5", "h6", "figure", "figcaption", "blockquote", "hr", "table", "thead", "tbody", "tfoot",
  "tr", "th", "td", "caption", "address", "select", "option", "textarea",
]);
const DROPPED = new Set(["data-dl-t"]);
const INDENT = "  ";

const ascii = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** `HeroB7k`: the label in PascalCase (ASCII letters and digits) plus 3 characters of the block id's hash. */
export function componentName(label: string, blockId: string): string {
  const words = ascii(label)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase());
  let base = words.join("").slice(0, 32);
  if (!/^[A-Z]/.test(base)) base = `Block${base}`;
  const suffix = hash32(blockId).toString(36).padStart(3, "0").slice(-3);
  return `${base}${suffix[0]!.toUpperCase()}${suffix.slice(1)}`;
}

/** A JSX attribute value: always a double-quoted string literal (JSX strings take no escapes, so `{"…"}` for quotes). */
function attrValue(value: string): string {
  return /["\\{}\n\r]/.test(value) ? `{${JSON.stringify(value)}}` : `"${value}"`;
}

/** JSX text: plain when safe, else a string expression. */
function jsxText(text: string): string {
  return /[{}<>&]/.test(text) || text.trim() !== text ? `{${JSON.stringify(text)}}` : text;
}

type Context = { routes: Readonly<Record<string, string>>; uses: Set<"Icon" | "Placeholder"> };

/** The JSX attributes of an element (`[]` of `name=value` strings), in the element's order. */
function jsxAttrs(element: AiElement, context: Context, skip: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = [];
  for (const [name, value] of element.attrs) {
    if (DROPPED.has(name) || skip.has(name)) continue;
    if (name === "href") {
      const screen = /^#screen:([\w-]+)$/.exec(value)?.[1];
      out.push(`href=${attrValue(screen ? (context.routes[screen] ?? "#") : "#")}`);
      continue;
    }
    if ((name === "checked" || name === "value") && FORM_VALUE_TAGS.has(element.tag)) {
      out.push(name === "checked" ? "defaultChecked" : `defaultValue=${attrValue(value)}`);
      continue;
    }
    if (name === "disabled" || name === "checked") {
      out.push(name);
      continue;
    }
    if (NUMERIC_ATTRS.has(name) && /^-?\d+(?:\.\d+)?$/.test(value)) {
      out.push(`${REACT_ATTRS[name] ?? name}={${value}}`);
      continue;
    }
    out.push(`${REACT_ATTRS[name] ?? name}=${attrValue(value)}`);
  }
  return out;
}

const tagOpen = (tag: string, attrs: readonly string[]) => (attrs.length > 0 ? `<${tag} ${attrs.join(" ")}` : `<${tag}`);

/** Lines of one node at `depth`. */
function nodeLines(node: AiElement, depth: number, context: Context): string[] {
  const pad = INDENT.repeat(depth);
  const attrOf = (name: string) => node.attrs.find(([key]) => key === name)?.[1];

  if (node.tag === "i" && attrOf("data-icon") !== undefined) {
    context.uses.add("Icon");
    return [`${pad}${tagOpen("Icon", [`name=${attrValue(attrOf("data-icon")!)}`, ...jsxAttrs(node, context, new Set(["data-icon"]))])} />`];
  }
  if (node.tag === "img") {
    context.uses.add("Placeholder");
    const kind = attrOf("data-asset") === "logo" ? "logo" : (attrOf("data-placeholder") ?? "photo");
    return [`${pad}${tagOpen("Placeholder", [`kind=${attrValue(kind)}`, ...jsxAttrs(node, context, new Set(["data-placeholder", "data-asset"]))])} />`];
  }

  let children = node.children;
  const attrs = jsxAttrs(node, context);
  if (node.tag === "textarea") {
    // React wants a textarea's text as `defaultValue`.
    const text = children.map((child) => (child.type === "text" ? child.value : "")).join("");
    if (text) attrs.push(`defaultValue=${attrValue(text)}`);
    children = [];
  }
  const open = tagOpen(node.tag, attrs);
  if (VOID_TAGS.has(node.tag) || children.length === 0) return [`${pad}${open} />`];
  // A single text child stays on the element's line.
  if (children.length === 1 && children[0]!.type === "text") {
    const text = collapse(children[0]!.value);
    if (text === " ") return [`${pad}${open}>{" "}</${node.tag}>`];
    return [`${pad}${open}>${jsxText(text)}</${node.tag}>`];
  }
  return [`${pad}${open}>`, ...childLines(children, depth + 1, context, BLOCK_TAGS.has(node.tag)), `${pad}</${node.tag}>`];
}

const isBlock = (node: AiNode | undefined) => node?.type === "element" && BLOCK_TAGS.has(node.tag);

/** Whitespace-only text that CSS never renders: next to a block, or at the edge of a block parent. */
export function insignificantSpace(children: readonly AiNode[], index: number, parentIsBlock: boolean): boolean {
  const node = children[index];
  if (node?.type !== "text" || node.value.trim() !== "") return false;
  const first = index === 0;
  const last = index === children.length - 1;
  return ((first || last) && parentIsBlock) || isBlock(children[index - 1]) || isBlock(children[index + 1]);
}

const collapse = (text: string) => text.replace(/[ \t\n\r\f]+/g, " ");

/** Children one per line; the spaces HTML would render at the edges of a text become `{" "}`. */
function childLines(children: readonly AiNode[], depth: number, context: Context, parentIsBlock: boolean): string[] {
  const pad = INDENT.repeat(depth);
  const out: string[] = [];
  for (const [index, child] of children.entries()) {
    if (insignificantSpace(children, index, parentIsBlock)) continue;
    if (child.type === "element") {
      out.push(...nodeLines(child, depth, context));
      continue;
    }
    const text = collapse(child.value);
    if (text === "") continue;
    if (text === " ") {
      out.push(`${pad}{" "}`);
      continue;
    }
    if (text.startsWith(" ")) out.push(`${pad}{" "}`);
    out.push(`${pad}${jsxText(text.trim())}`);
    if (text.endsWith(" ")) out.push(`${pad}{" "}`);
  }
  return out;
}

/** One line of a `//` comment: every JS line terminator (CR, LF, U+2028, U+2029) would end it and turn the rest into code. */
const oneLine = (text: string) => text.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/\*\//g, "*\\/").trim();

/**
 * A sanitized AI block (`AiBlock.html`) as a TSX module with one exported component. Deterministic: same HTML and
 * options, same text (golden tests in ./__golden__).
 */
export function blockToTsx(html: string, blockId: string, options: TsxOptions = {}): string {
  const root = parseSanitized(html).find((node): node is AiElement => node.type === "element");
  const name = options.name ?? componentName(options.label ?? "Block", blockId);
  const context: Context = { routes: options.routes ?? {}, uses: new Set() };
  const body = root ? nodeLines(root, 2, context) : [`${INDENT.repeat(2)}null`];
  const header = [
    `// ${oneLine(options.label ?? name)} · «Diseño con IA» (Dialmade)${options.model ? ` · ${oneLine(options.model)}` : ""}${options.createdAt ? ` · ${options.createdAt.slice(0, 10)}` : ""}`,
    "// Tailwind v4 with Dialmade's theme.css (the variables) and ai-theme.css (the vocabulary of the AI blocks).",
  ];
  const uses = [...context.uses].sort();
  return [
    ...header,
    ...(uses.length > 0 ? [`import { ${uses.join(", ")} } from ${JSON.stringify(options.assetsImport ?? "./dialmade-assets")};`] : []),
    "",
    `export function ${name}() {`,
    `${INDENT}return (`,
    ...body,
    `${INDENT});`,
    "}",
    "",
  ].join("\n");
}

// ── the assets module (Icon and Placeholder) ────────────────────────────────────

/** The tree lowercases attribute names; SVG needs these back in their case. */
const SVG_ATTR_CASE: Readonly<Record<string, string>> = { viewbox: "viewBox", preserveaspectratio: "preserveAspectRatio" };
const camel = (name: string) => name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/** Our own, trusted SVG markup (./assets) → JSX lines: `style="a:b"` → `style={{ a: "b" }}`, kebab attributes → camelCase. */
function svgJsx(markup: string, depth: number, rootAttrs: string): string[] {
  const visit = (node: RawNode, level: number): string[] => {
    const pad = INDENT.repeat(level);
    if (node.type === "text") return node.value.trim() ? [`${pad}${jsxText(node.value.trim())}`] : [];
    if (node.tag === "title") return [];
    const attrs = node.attrs
      .filter(([name]) => name !== "xmlns" && !(level === depth && (name === "role" || name === "aria-hidden")))
      .map(([name, value]) => {
        if (name === "style") {
          const entries = value.split(";").filter(Boolean).map((rule) => {
            const [prop, ...rest] = rule.split(":");
            return `${camel(prop!.trim())}: ${JSON.stringify(rest.join(":").trim())}`;
          });
          return `style={{ ${entries.join(", ")} }}`;
        }
        return `${name.startsWith("aria-") ? name : (SVG_ATTR_CASE[name] ?? camel(name))}=${attrValue(value)}`;
      });
    if (level === depth) attrs.push(rootAttrs);
    const open = tagOpen(node.tag, attrs);
    const children = node.children.flatMap((child) => visit(child, level + 1));
    return children.length === 0 ? [`${pad}${open} />`] : [`${pad}${open}>`, ...children, `${pad}</${node.tag}>`];
  };
  const svg = parseRaw(markup).nodes.find((node): node is Extract<RawNode, { type: "element" }> => node.type === "element" && node.namespace !== HTML_NS);
  return svg ? visit(svg, depth) : [];
}

/**
 * `dialmade-assets.tsx`: `Icon` (the icon set of @dialmade/ui, drawn like the preview) and `Placeholder` (the
 * token-colored placeholder art), the two components `blockToTsx` imports.
 */
export function tsxAssetsModule(): string {
  const icons = Object.entries(ICONS as Record<string, readonly string[]>)
    .map(([name, paths]) => `  ${JSON.stringify(name)}: [${paths.map((d) => JSON.stringify(d)).join(", ")}],`)
    .join("\n");
  const cases = PLACEHOLDER_KINDS.flatMap((kind) => [
    `    case ${JSON.stringify(kind)}:`,
    "      return (",
    ...svgJsx(placeholderSvg(kind), 4, "className={className} {...a11y}"),
    "      );",
  ]);
  return [
    "// Icons and placeholders of the AI blocks exported by Dialmade («Diseño con IA»). Our own icon set (MIT), no brand",
    "// logos: swap a Placeholder for your real image, and the \"logo\" one for your logo.",
    'import type { SVGProps } from "react";',
    "",
    "const ICONS: Record<string, readonly string[]> = {",
    icons,
    "};",
    "",
    "/** An icon of the set, drawn with the current text color (an unknown name draws a dot). */",
    'export function Icon({ name, ...props }: { name: string } & Omit<SVGProps<SVGSVGElement>, "name">) {',
    "  const paths = ICONS[name];",
    "  return (",
    '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" focusable="false" width="1em" height="1em" {...props}>',
    '      {paths ? paths.map((d) => <path key={d} d={d} />) : <circle cx={12} cy={12} r={2.5} fill="currentColor" />}',
    "    </svg>",
    "  );",
    "}",
    "",
    `export type PlaceholderKind = ${PLACEHOLDER_KINDS.map((kind) => JSON.stringify(kind)).join(" | ")};`,
    "",
    "/** Placeholder art painted with the theme's variables (it follows the palette and dark mode). */",
    "export function Placeholder({ kind, alt = \"\", className }: { kind: PlaceholderKind; alt?: string; className?: string }) {",
    '  const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };',
    "  switch (kind) {",
    ...cases.map((line) => line.replace(/^ {4}case "photo":$/, "    default:\n    case \"photo\":")),
    "  }",
    "}",
    "",
  ].join("\n");
}
