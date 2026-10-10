// The runtime's second wall against the same XSS corpus and fuzzing as the sanitizer, in a DOM: whatever HTML reaches
// the island (sanitized, or raw as if the app's sanitizer had been bypassed), what ends up in the live document is
// only allowlisted elements and attributes, with no handlers and no URLs.
import { sanitizeBlock } from "@dialmade/ai-render";
import { INPUT_TYPES, isAllowedAttrFor, ALLOWED_TAGS } from "@dialmade/ai-render/runtime";
import { XSS_CORPUS, fuzzHtml } from "@dialmade/ai-render/testing";
import { describe, expect, it } from "vitest";
import { insertBlock } from "./insert";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Problems of the live DOM under `host` (our own icon/placeholder SVG is allowed, nothing else of SVG). */
function audit(host: Element): string[] {
  const problems: string[] = [];
  for (const element of Array.from(host.querySelectorAll("*"))) {
    const tag = element.localName;
    const inOurSvg = element.namespaceURI === SVG_NS && element.closest("i[data-icon] > svg, svg[data-placeholder]") !== null;
    if (inOurSvg) {
      for (const { name } of Array.from(element.attributes)) if (/^on|href/i.test(name)) problems.push(`svg ${tag} ${name}`);
      continue;
    }
    if (element.namespaceURI !== "http://www.w3.org/1999/xhtml" || !ALLOWED_TAGS.has(tag)) problems.push(`tag ${tag}`);
    for (const { name, value } of Array.from(element.attributes)) {
      if (/^on/i.test(name) || !isAllowedAttrFor(tag, name)) problems.push(`${tag} ${name}`);
      if (name === "href" && !/^#(?:screen:[\w-]+)?$/.test(value)) problems.push(`${tag} href=${value}`);
      if (name === "type" && tag === "input" && !INPUT_TYPES.has(value)) problems.push(`input type=${value}`);
      if (name === "type" && tag === "button" && value !== "button") problems.push(`button type=${value}`);
    }
  }
  return problems;
}

const ctx = { blockId: "b-hero", screenIds: ["s-pricing"] };
const wrap = (inner: string) => `<section data-block-id="b-hero" class="@container p-6"><p>ok</p>${inner}</section>`;

describe("second wall in a DOM", () => {
  it.each(XSS_CORPUS.map((entry) => [entry.group, entry.payload] as const))("%s: %s", (_group, payload) => {
    // Raw, as if the app's sanitizer had been bypassed.
    const raw = document.createElement("div");
    insertBlock(raw, wrap(payload));
    expect(audit(raw)).toEqual([]);
    // Sanitized: the DOM keeps exactly the sanitized structure (minus the assets the runtime draws).
    const sanitized = sanitizeBlock(wrap(payload), ctx);
    if (!sanitized.ok) return;
    const host = document.createElement("div");
    insertBlock(host, sanitized.html);
    expect(audit(host)).toEqual([]);
    expect(host.querySelectorAll("[data-dl-t]").length).toBe(sanitized.textNodes);
  });

  it("fuzzed raw HTML never gets past it", () => {
    for (let i = 0; i < 400; i++) {
      const host = document.createElement("div");
      const html = fuzzHtml(0xf00d + i, 30);
      insertBlock(host, html);
      expect(audit(host), html).toEqual([]);
    }
  });

  it("drops `name` outside form controls and forces buttons to type=button", () => {
    const host = document.createElement("div");
    insertBlock(host, '<section><img name="importNode" alt="x"><input name="email" type="file"><button type="submit">Go</button></section>');
    expect(host.querySelector("[name=importNode]")).toBeNull();
    expect(host.querySelector("input")?.getAttribute("name")).toBe("email");
    expect(host.querySelector("input")?.hasAttribute("type")).toBe(false);
    expect(host.querySelector("button")?.getAttribute("type")).toBe("button");
  });
});
