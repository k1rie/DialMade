// The runtime's second wall (spec §6.2): the HTML it is handed was sanitized by the app, but it is parsed into an
// inert <template> (through a Trusted Types policy) and copied node by node with the same allowlist. Never
// `innerHTML` on the live document. Icons and placeholders are our own
// SVG markup, built from trusted strings.
import {
  ALLOWED_TAGS,
  INPUT_TYPES,
  SVG_HOSTILE,
  SVG_TAGS,
  chartFromAttributes,
  checkSvgAttr,
  iconSvg,
  isAllowedAttrFor,
  isAllowedSvgAttr,
  placeholderSvg,
  sanitizeCss,
  sanitizeStyleAttr,
} from "@dialmade/ai-render/runtime";

const SVG_NS = "http://www.w3.org/2000/svg";

type TrustedPolicy = { createHTML: (input: string) => unknown };
let policy: TrustedPolicy | null | undefined;

/** Trusted Types policy of the island (CSP `require-trusted-types-for 'script'`): only our own templates. */
function htmlPolicy(): TrustedPolicy | null {
  if (policy !== undefined) return policy;
  const factory = (globalThis as { trustedTypes?: { createPolicy: (name: string, rules: { createHTML: (s: string) => string }) => TrustedPolicy } }).trustedTypes;
  policy = factory ? factory.createPolicy("dialmade-island", { createHTML: (input) => input }) : null;
  return policy;
}

function parseTemplate(html: string): DocumentFragment {
  const template = document.createElement("template");
  const trusted = htmlPolicy();
  (template as unknown as { innerHTML: unknown }).innerHTML = trusted ? trusted.createHTML(html) : html;
  return template.content;
}

/** Page mode: what the copy needs to know about where it is. */
type PageCopy = { blockId: string; depth: number } | null;

/** An inline SVG of page mode: allowlisted elements and attributes only, values checked again. */
function copySvg(element: Element, target: Node): void {
  const tag = element.localName.toLowerCase();
  if (element.namespaceURI !== SVG_NS || !SVG_TAGS.has(tag) || SVG_HOSTILE.has(tag)) return;
  const copy = document.createElementNS(SVG_NS, element.localName);
  for (const { name, value } of Array.from(element.attributes)) {
    const lower = name.toLowerCase();
    if (lower === "style") {
      const style = sanitizeStyleAttr(value);
      if (style) copy.setAttribute("style", style);
      continue;
    }
    if (!isAllowedSvgAttr(lower)) continue;
    if (lower === "class" || lower === "role" || lower.startsWith("aria-")) {
      copy.setAttribute(name, value);
      continue;
    }
    const verdict = checkSvgAttr(lower, value);
    if (!verdict.keep) continue;
    if ("value" in verdict) copy.setAttribute(name, verdict.value);
    else if ("ref" in verdict) copy.setAttribute(name, `url(#${verdict.ref})`);
    else if (/^[A-Za-z][\w-]{0,120}$/.test(verdict.id)) copy.setAttribute(name, verdict.id);
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) copy.appendChild(document.createTextNode(child.textContent ?? ""));
    else if (child.nodeType === Node.ELEMENT_NODE) copySvg(child as Element, copy);
  }
  target.appendChild(copy);
}

/** Copies `source` into `target` keeping only allowed tags and attributes (`javascript:` hrefs never pass). */
function copyAllowed(source: ParentNode, target: Node, page: PageCopy = null): void {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent ?? ""));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const element = node as Element;
    const tag = element.localName;
    if (page && element.namespaceURI === SVG_NS && tag === "svg") {
      copySvg(element, target);
      continue;
    }
    if (page && tag === "style" && element.namespaceURI === "http://www.w3.org/1999/xhtml") {
      // A section's own rules, only as a child of its root, scoped and cleaned again.
      if (page.depth !== 1) continue;
      const css = sanitizeCss(element.textContent ?? "", { kind: "section", blockId: page.blockId }).css;
      if (css) {
        const style = document.createElement("style");
        style.textContent = css;
        target.appendChild(style);
      }
      continue;
    }
    if (element.namespaceURI !== "http://www.w3.org/1999/xhtml" || !ALLOWED_TAGS.has(tag)) continue;
    const copy = document.createElement(tag);
    for (const { name, value } of Array.from(element.attributes)) {
      if (page && name === "style") {
        const style = sanitizeStyleAttr(value);
        if (style) copy.setAttribute("style", style);
        continue;
      }
      if (!isAllowedAttrFor(tag, name)) continue;
      if (name === "href" && !/^#(?:screen:[\w-]+)?$/.test(value)) continue;
      if (name === "type" && tag === "input" && !INPUT_TYPES.has(value)) continue;
      if (name === "type" && tag === "button" && value !== "button") continue;
      if (name === "tabindex" && value !== "0" && value !== "-1") continue;
      copy.setAttribute(name, value);
    }
    // A button never submits, whatever it was handed.
    if (tag === "button") copy.setAttribute("type", "button");
    const blockId = page ? (page.depth === 0 ? (copy.getAttribute("data-block-id") ?? page.blockId) : page.blockId) : "";
    copyAllowed(element, copy, page ? { blockId, depth: page.depth + 1 } : null);
    target.appendChild(copy);
  }
}

/**
 * Puts `html` into `host`, replacing what it had. Deviation from the spec (which preferred `Element.setHTML()`):
 * the Sanitizer API's default configuration drops `class` and `data-*`, which AI blocks need, and its custom
 * configuration is still changing between browser versions. Our own allowlist copy from an inert template is the
 * same everywhere, and the CSP plus the sandbox stay the real guarantee.
 */
export function insertBlock(host: Element, html: string, options: { page?: boolean } = {}): void {
  host.replaceChildren();
  copyAllowed(parseTemplate(html), host, options.page ? { blockId: "", depth: 0 } : null);
  drawAssets(host);
}

function svgFrom(markup: string): SVGSVGElement | null {
  const trusted = htmlPolicy();
  const parsed = new DOMParser().parseFromString((trusted ? trusted.createHTML(markup) : markup) as string, "image/svg+xml").documentElement;
  return parsed && parsed.namespaceURI === SVG_NS ? (document.importNode(parsed, true) as unknown as SVGSVGElement) : null;
}

/** `<i data-icon>` gets its SVG; `<img data-placeholder|data-asset>` becomes token-colored inline SVG art. */
export function drawAssets(root: Element): void {
  for (const icon of Array.from(root.querySelectorAll("i[data-icon]"))) {
    const svg = svgFrom(iconSvg(icon.getAttribute("data-icon") ?? ""));
    if (svg) icon.replaceChildren(svg);
  }
  for (const img of Array.from(root.querySelectorAll("img[data-placeholder], img[data-asset]"))) {
    const kind = img.getAttribute("data-asset") === "logo" ? "logo" : (img.getAttribute("data-placeholder") ?? "photo");
    const alt = img.getAttribute("alt") ?? "";
    // A chart is drawn from its numbers; the second wall validates them again (a bad pair falls back to the art).
    const chart = chartFromAttributes((name) => img.getAttribute(name), alt, document.documentElement.lang || undefined);
    const svg = svgFrom(chart ?? placeholderSvg(kind, alt));
    if (!svg) continue;
    const className = img.getAttribute("class");
    if (className) svg.setAttribute("class", className);
    svg.setAttribute("data-placeholder", kind);
    if (alt) svg.setAttribute("aria-label", alt);
    else svg.setAttribute("aria-hidden", "true");
    img.replaceWith(svg);
  }
}
