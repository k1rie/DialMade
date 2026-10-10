import { describe, expect, it } from "vitest";
import { captureCss, partSelector } from "./captureCss";

describe("captureCss", () => {
  it("always freezes motion, caret, cursor, focus ring, toasts and the dev overlay", () => {
    const css = captureCss({ only: null, transparent: false });
    expect(css).toContain("transition-duration: 0s !important");
    expect(css).toContain("animation-duration: 0s !important");
    expect(css).toContain("caret-color: transparent !important");
    expect(css).toContain("outline: none !important");
    expect(css).toContain("[data-sonner-toaster], nextjs-portal { display: none !important; }");
    expect(css).not.toContain("visibility");
    expect(css).not.toContain("html, body");
  });

  it("drops the page background with transparent", () => {
    expect(captureCss({ only: null, transparent: true })).toContain("html, body { background: transparent !important; }");
  });

  it("hides everything but the part with only, keeping its layout", () => {
    const css = captureCss({ only: "palette-card", transparent: true });
    const part = partSelector("palette-card");
    expect(part).toBe('[data-promo-part="palette-card"]');
    expect(css).toContain(`body *:not(${part}, ${part} *) { visibility: hidden !important; }`);
    expect(css).toContain(`${part} { visibility: visible !important; }`);
    expect(css).not.toContain(":has(");
  });

  it("lets an unclipped part overflow its ancestors and paints it whole", () => {
    const css = captureCss({ only: "preview-page", transparent: true, unclip: true });
    const part = partSelector("preview-page");
    expect(css).toContain(`*:has(${part}) { overflow: visible !important; }`);
    expect(css).toContain(`${part}, ${part} * { content-visibility: visible !important; }`);
  });
});
