// A minimal HTML tree for AI blocks: what the sanitizer keeps from parse5's AST, and the only thing ever serialized.
// Raw model text is never reused (spec §6.2): HTML leaves this package as `serialize(tree)`.
import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";

export type AiText = { type: "text"; value: string };
export type AiElement = { type: "element"; tag: string; attrs: [name: string, value: string][]; children: AiNode[] };
export type AiNode = AiText | AiElement;

/** Elements without content (serialized without a closing tag). */
export const VOID_TAGS: ReadonlySet<string> = new Set(["br", "hr", "img", "input"]);

type P5Node = DefaultTreeAdapterTypes.ChildNode;

/** parse5 fragment → raw tree (no filtering: every element of the HTML namespace, its attributes and text). */
export function parseRaw(html: string): { nodes: RawNode[] } {
  const fragment = parseFragment(html);
  return { nodes: fragment.childNodes.map(convert).filter((node): node is RawNode => node !== null) };
}

/** Like `AiNode`, plus the namespace (svg and math are dropped by the sanitizer) and comments (skipped). */
export type RawNode =
  | { type: "text"; value: string }
  | { type: "element"; tag: string; namespace: string; attrs: [string, string][]; children: RawNode[] };

function convert(node: P5Node): RawNode | null {
  if (node.nodeName === "#text") return { type: "text", value: (node as DefaultTreeAdapterTypes.TextNode).value };
  if (node.nodeName === "#comment" || node.nodeName === "#documentType") return null;
  const element = node as DefaultTreeAdapterTypes.Element;
  if (!("tagName" in element)) return null;
  // <template> keeps its children in `content`: never rendered, dropped by the sanitizer anyway.
  const children = element.tagName === "template" ? [] : element.childNodes.map(convert).filter((child): child is RawNode => child !== null);
  return {
    type: "element",
    tag: element.tagName.toLowerCase(),
    namespace: element.namespaceURI,
    attrs: element.attrs.map((attr) => [attr.prefix ? `${attr.prefix}:${attr.name}` : attr.name.toLowerCase(), attr.value]),
    children,
  };
}

const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Canonical HTML of a sanitized tree: double-quoted attributes, escaped text, void elements without `/`. */
export function serialize(nodes: readonly AiNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += escapeText(node.value);
      continue;
    }
    out += `<${node.tag}`;
    for (const [name, value] of node.attrs) out += value === "" && BOOLEAN_ATTRS.has(name) ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`;
    out += ">";
    if (VOID_TAGS.has(node.tag)) continue;
    // A page-mode <style> holds CSS the CSS sanitizer re-serialized (never a `</`): raw text, as the HTML parser reads it.
    if (node.tag === "style") out += node.children.map((child) => (child.type === "text" ? child.value : "")).join("");
    else out += serialize(node.children);
    out += `</${node.tag}>`;
  }
  return out;
}

const BOOLEAN_ATTRS: ReadonlySet<string> = new Set(["checked", "disabled"]);

/** Parses HTML this package serialized (already sanitized) back into a tree. Comments and other namespaces go (SVG stays: page mode keeps a sanitized subset). */
export function parseSanitized(html: string): AiNode[] {
  const strip = (nodes: RawNode[]): AiNode[] =>
    nodes.flatMap((node): AiNode[] =>
      node.type === "text" ? [node] : node.namespace === HTML_NS || node.namespace === SVG_NS ? [{ type: "element", tag: node.tag, attrs: node.attrs, children: strip(node.children) }] : [],
    );
  return strip(parseRaw(html).nodes);
}

export const HTML_NS = "http://www.w3.org/1999/xhtml";
export const SVG_NS = "http://www.w3.org/2000/svg";

/** Depth-first walk over the elements. */
export function* elements(nodes: readonly AiNode[]): Generator<AiElement> {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    yield node;
    yield* elements(node.children);
  }
}

export const attr = (element: AiElement, name: string): string | undefined => element.attrs.find(([key]) => key === name)?.[1];

/** All the text of a tree, in order (spaces collapsed). */
export function textOf(nodes: readonly AiNode[]): string {
  let out = "";
  for (const node of nodes) out += node.type === "text" ? node.value : ` ${textOf(node.children)} `;
  return out.replace(/\s+/g, " ").trim();
}
