import { describe, expect, it } from "vitest";
import { CSS_LIMITS, PAGE_SCOPE, fontRolesOf, sanitizeCss, sanitizeStyleAttr } from "./pageCss";

const page = (css: string) => sanitizeCss(css, { kind: "page" });
const section = (css: string, blockId = "b-hero") => sanitizeCss(css, { kind: "section", blockId });

describe("sanitizeCss (page mode)", () => {
  it("scopes every page selector to the AI blocks and keeps theme variables, color-mix and fonts", () => {
    const { css, report } = page(`
      .btn, h2 { background: var(--primary); color: var(--primary-foreground); border-radius: var(--dl-radius-md) }
      .tint { background: color-mix(in oklch, var(--primary) 18%, var(--background)); font-family: var(--dl-font-heading), serif }
    `);
    expect(css).toBe(
      `${PAGE_SCOPE} .btn,${PAGE_SCOPE} h2{background:var(--primary);color:var(--primary-foreground);border-radius:var(--dl-radius-md)}` +
        `${PAGE_SCOPE} .tint{background:color-mix(in oklab, var(--primary) 18%, var(--background));font-family:var(--dl-font-heading), serif}`,
    );
    expect(report).toEqual({ droppedDeclarations: 0, droppedRules: 0 });
  });

  it("is idempotent", () => {
    const once = page(".a{color:var(--foreground)} @media (width >= 640px){.a{padding:2rem}} @keyframes rise{from{opacity:0}to{opacity:1}}").css;
    expect(page(once).css).toBe(once);
    const own = section(`[data-block-id="b-hero"] .x{gap:1rem} .y{gap:2rem}`).css;
    expect(section(own).css).toBe(own);
  });

  it("starts a section's rules at its own root and never reaches another section", () => {
    const { css } = section(`.title{font-size:4rem} [data-block-id='b-hero'] .lede{opacity:.8} [data-block-id="b-other"] p{color:var(--primary)}`);
    expect(css).toBe(`[data-block-id="b-hero"] .title{font-size:4rem}[data-block-id="b-hero"] .lede{opacity:.8}`);
  });

  it("drops literal and named colors, but not variable names that contain a color word", () => {
    const { css, report } = page(".a{color:#fff;background:rgb(0 0 0);border-color:oklch(0.5 0.1 200);outline-color:white;--tan-x:var(--accent);fill:var(--tan-x)}");
    expect(css).toBe(`${PAGE_SCOPE} .a{--tan-x:var(--accent);fill:var(--tan-x)}`);
    expect(report.droppedDeclarations).toBe(4);
  });

  it("drops resources, script-like values, foreign fonts and positions that leave the box", () => {
    const { css } = page(
      ".a{background:url(https://x.test/a.png);background-image:image-set('a.png' 1x);width:expression(alert(1));font-family:'Comic Sans MS';position:fixed;content:'\\41';z-index:9999;gap:1rem}",
    );
    expect(css).toBe(`${PAGE_SCOPE} .a{gap:1rem}`);
  });

  it("keeps only @media, @container, @supports and @keyframes", () => {
    const { css, report } = page(
      "@import url(x.css); @font-face{font-family:x;src:url(x.woff)} @namespace svg url(x); @container (min-width: 40rem){.a{display:grid}} @supports (display:grid){.b{display:grid}} @page{margin:0}",
    );
    expect(css).toBe(`@container (min-width: 40rem){${PAGE_SCOPE} .a{display:grid}}@supports (display:grid){${PAGE_SCOPE} .b{display:grid}}`);
    expect(report.droppedRules).toBe(4);
  });

  it("lands the document's rules on the scope (a page's own tokens live there), and class names with those words stay", () => {
    expect(page("html{color:var(--foreground)} body .a{gap:1px} :root{--x:1px} .body-copy{gap:2px} .x html{gap:3px} .body{gap:4px}").css).toBe(
      `${PAGE_SCOPE}{color:var(--foreground)}${PAGE_SCOPE} .a{gap:1px}${PAGE_SCOPE}{--x:1px}${PAGE_SCOPE} .body-copy{gap:2px}${PAGE_SCOPE} .body{gap:4px}`,
    );
    expect(section(":root{--pad:2rem} body > .a{padding:var(--pad)}").css).toBe(`[data-block-id="b-hero"]{--pad:2rem}[data-block-id="b-hero"] .a{padding:var(--pad)}`);
  });

  it("#id selectors follow the ids the HTML sanitizer prefixed (a section's own; on the page, whichever section has it)", () => {
    const own = section('#late:checked ~ .bar{gap:1px} a[href="#late"]{gap:2px}');
    expect(own.css).toBe(`[data-block-id="b-hero"] #ai-b-hero-late:checked ~ .bar{gap:1px}[data-block-id="b-hero"] a[href="#late"]{gap:2px}`);
    expect(section(own.css).css).toBe(own.css);
    const onPage = page("#late:checked + label{gap:1px}");
    expect(onPage.css).toBe(`${PAGE_SCOPE} [id$="-late"]:checked + label{gap:1px}`);
    expect(page(onPage.css).css).toBe(onPage.css);
  });

  it("keeps a section's local gradient, clip and mask paints, pointing at its prefixed ids; nothing remote", () => {
    const { css, report } = section(".bowl{fill:url(#glaze);stroke:url( #rim );clip-path:url(#c)} .x{fill:url(https://x.test/#a);background:url(#glaze)}");
    expect(css).toBe(`[data-block-id="b-hero"] .bowl{fill:url(#ai-b-hero-glaze);stroke:url(#ai-b-hero-rim);clip-path:url(#ai-b-hero-c)}`);
    expect(report.droppedDeclarations).toBe(2);
    expect(section(css).css).toBe(css);
    // The page stylesheet cannot know which section holds the drawing.
    expect(page(".bowl{fill:url(#glaze)}").css).toBe("");
  });

  it("maps the brand's own family names to the theme's font variables", () => {
    const fonts = fontRolesOf({ "--dl-font-heading": '"Outfit", ui-sans-serif, sans-serif', "--dl-font-body": '"Work Sans", system-ui, sans-serif', "--dl-font-mono": "ui-monospace, monospace" });
    expect(fonts).toEqual({ outfit: "heading", "work sans": "body" });
    const { css } = sanitizeCss(".t{font-family:'Outfit',sans-serif} .b{font:400 1rem/1.5 \"Work Sans\", serif} .c{font-family:'Comic Sans MS'}", { kind: "page" }, { fonts });
    expect(css).toBe(`${PAGE_SCOPE} .t{font-family:var(--dl-font-heading),sans-serif}${PAGE_SCOPE} .b{font:400 1rem/1.5 var(--dl-font-body), serif}`);
  });

  it("never lets the stylesheet be closed from inside", () => {
    expect(page(".a{content:'</style><script>alert(1)</script>'}").css).toBe("");
    expect(page(".a</style>{gap:1px}").css).toBe("");
    expect(page("@media (width < 40rem) and (</style>){.a{gap:1px}}").css).toBe("");
  });

  it("empties a stylesheet over its cap instead of cutting it", () => {
    const big = Array.from({ length: 2000 }, (_, i) => `.c${i}{padding:${i}px}`).join("");
    expect(page(big).css.length).toBeLessThanOrEqual(CSS_LIMITS.pageBytes);
    expect(page(big).css).toBe("");
  });

  it("skips nested rules and malformed input without growing it", () => {
    const { css } = page(".a{gap:1px; .b{gap:2px}} .c{gap:3px} }}} .d{");
    expect(css).toBe(`${PAGE_SCOPE} .a{gap:1px}${PAGE_SCOPE} .c{gap:3px}`);
  });

  it("mixes tints in oklab so a theme white (hue 0) never turns the brand's tint pink", () => {
    expect(page(".a{background:color-mix(in oklch longer hue, var(--primary) 20%, var(--background))}").css).toContain("color-mix(in oklab, var(--primary) 20%");
  });

  it("cleans a style attribute with the same rules", () => {
    expect(sanitizeStyleAttr("display:flex; gap:28px; color:#fff; background:url(x.png); --pct:40%")).toBe("display:flex;gap:28px;--pct:40%");
    expect(sanitizeStyleAttr("stop-color:var(--accent)")).toBe("stop-color:var(--accent)");
    // A gradient paint: prefixed for its section, kept as written by the island's second wall.
    expect(sanitizeStyleAttr("fill:url(#g)", { idPrefix: "ai-b-hero-" })).toBe("fill:url(#ai-b-hero-g)");
    expect(sanitizeStyleAttr("fill:url(#ai-b-hero-g)")).toBe("fill:url(#ai-b-hero-g)");
  });
});
