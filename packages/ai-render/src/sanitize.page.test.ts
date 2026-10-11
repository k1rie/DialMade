import { describe, expect, it } from "vitest";
import { sanitizeBlock } from "./sanitize";

const page = (html: string, blockId = "b-hero") => sanitizeBlock(html, { blockId, screenIds: ["s-pricing"], mode: "page" });
const blocks = (html: string, blockId = "b-hero") => sanitizeBlock(html, { blockId, screenIds: [], mode: "blocks" });

const HERO = `<section data-block-id="b-hero" class="hero">
  <style>.title{font-size:clamp(2.5rem,6cqi,5rem);color:var(--foreground)} .bad{color:#ff0000}</style>
  <h1 class="title Display md:flex">Tu barbería, <em>sin llamadas</em></h1>
  <svg viewBox="0 0 100 40" class="chart" onclick="alert(1)" style="fill:red">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)"/><stop offset="1" stop-color="transparent"/></linearGradient></defs>
    <path d="M0 30 L50 10 L100 20" fill="url(#g)" stroke="var(--primary)" stroke-width="2"/>
    <rect x="0" y="0" width="10" height="10" fill="#ff0000"/>
    <text x="4" y="36" font-size="6" fill="currentColor">Hoy</text>
  </svg>
  <a href="#screen:s-pricing" class="btn">Precios</a>
</section>`;

describe("sanitizeBlock in page mode", () => {
  it("keeps the section's own scoped rules, own class names and a sanitized inline SVG", () => {
    const result = page(HERO);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { html, report } = result;
    expect(html).toContain('<style>[data-block-id="b-hero"] .title{font-size:clamp(2.5rem,6cqi,5rem);color:var(--foreground)}</style>');
    expect(html).not.toContain("#ff0000");
    expect(html).toContain('class="title"');
    expect(html).toContain('<lineargradient id="ai-b-hero-g"');
    expect(html).toContain('fill="url(#ai-b-hero-g)"');
    expect(html).toContain('stop-color="var(--primary)"');
    expect(html).toContain('<text x="4" y="36" font-size="6" fill="currentColor">Hoy</text>');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/onclick|style="|alert/);
    expect(html).toContain('href="#screen:s-pricing"');
    expect(report.hostile).toBe(0);
    expect(report.cssDropped).toBe(1);
  });

  it("is stable: the stored HTML sanitizes to itself (SVG names come back lowercase from the parser)", () => {
    const first = page(HERO);
    if (!first.ok) throw new Error(first.failure);
    const again = page(first.html);
    expect(again.ok && again.html).toBe(first.html);
  });

  it("treats code inside an SVG as hostile and drops elements it does not know", () => {
    for (const evil of ["<script>alert(1)</script>", "<foreignObject><div>x</div></foreignObject>", '<use href="#x"/>', '<image href="x.png"/>', '<a href="javascript:1"><text>x</text></a>']) {
      const result = page(`<section data-block-id="b-hero"><p>x</p><svg>${evil}</svg></section>`);
      expect(result.ok ? result.report.hostile : -1, evil).toBeGreaterThan(0);
    }
    const unknown = page(`<section data-block-id="b-hero"><p>x</p><svg><filter id="f"><feGaussianBlur/></filter><circle r="2"/></svg></section>`);
    expect(unknown.ok && unknown.html).toContain("<circle");
    expect(unknown.ok && unknown.html).not.toMatch(/filter|feGaussian/i);
  });

  it("keeps a <style> only as a direct child of the root and never marks styles or drawings as editable copy", () => {
    const result = page(`<section data-block-id="b-hero"><div><style>.x{gap:1px}</style><p>Texto</p></div><svg><text>Dibujo</text></svg></section>`);
    expect(result.ok && result.html).not.toContain("<style");
    expect(result.ok && result.html).toMatch(/<p data-dl-t="\d+">Texto<\/p>/);
    expect(result.ok && result.html).not.toMatch(/<text[^>]*data-dl-t/);
  });

  it("never uses the base kit's class prefix and drops token grammar it does not need", () => {
    const result = page(`<section data-block-id="b-hero" class="dl-section hero @container"><p class="lede dl-text md:hidden w-[10px]">x</p></section>`);
    expect(result.ok && result.html).toBe('<section class="hero" data-block-id="b-hero"><p class="lede" data-dl-t="0">x</p></section>');
  });

  it("a root with only its stylesheet is empty", () => {
    expect(page(`<section data-block-id="b-hero"><style>.x{gap:1px}</style></section>`)).toMatchObject({ ok: false, failure: "empty" });
  });

  it("block mode is unchanged: <style> and <svg> are still hostile", () => {
    const result = blocks(`<section data-block-id="b-hero"><style>.x{}</style><svg><path d="M0 0"/></svg><p>x</p></section>`);
    expect(result.ok && result.report.hostile).toBe(2);
  });

  it("keeps cleaned style attributes on HTML and SVG (a flex row, a gradient stop)", () => {
    const result = page(`<section data-block-id="b-hero"><div style="display:flex;color:red;gap:8px"><p>x</p></div><svg><defs><linearGradient id="g"><stop offset="0" style="stop-color:var(--accent)"/></linearGradient></defs><rect width="4" height="4" fill="url(#g)"/></svg></section>`);
    expect(result.ok && result.html).toContain('<div style="display:flex;gap:8px">');
    expect(result.ok && result.html).toContain('<stop offset="0" style="stop-color:var(--accent)">');
  });
});
