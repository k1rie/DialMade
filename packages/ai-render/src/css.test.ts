import { describe, expect, it } from "vitest";
import { classTokensOf, compileAiCss, scopeCss } from "./css";
import { exportThemeCss } from "./theme";

describe("AI CSS (Tailwind v4 compile over the token theme)", () => {
  it("compiles vocabulary classes to contract variables", async () => {
    const css = await compileAiCss(["bg-primary", "text-h1", "rounded-card", "shadow-card", "py-section", "@md:flex", "bg-brand-500", "hover:bg-primary-hover"], { base: false });
    expect(css).toContain("background-color: var(--primary)");
    expect(css).toContain("font-size: var(--dl-fs-h1)");
    expect(css).toContain("border-radius: var(--dl-card-radius)");
    expect(css).toContain("var(--dl-card-shadow)");
    expect(css).toContain("padding-block: var(--dl-section-py)");
    expect(css).toContain("@container (width >= 28rem)");
    expect(css).toContain("var(--color-brand-500)");
    expect(css).toContain("var(--primary-hover)");
    // No theme variables are emitted (no `--color-brand-500: var(--color-brand-500)` cycle).
    expect(css).not.toMatch(/:root\s*,?\s*:host\s*\{/);
  });

  it("produces nothing for classes outside the vocabulary", async () => {
    const css = await compileAiCss(["bg-red-500", "bg-[#f00]", "text-white", "fixed", "-mt-4", "z-50"], { base: false });
    expect(css).not.toContain("{");
  });

  it("prepends preflight, scoped for pages that also have base sections", async () => {
    const css = await compileAiCss(["p-4"], { scoped: true });
    expect(css).toContain(":where([data-dl-ai-block],[data-dl-ai-surface]) h1");
    expect(css).not.toMatch(/(^|})\s*h1\s*,/);
    expect(await compileAiCss(["p-4"])).toMatch(/\nh1,\nh2/);
  });

  it("scopes plain CSS and at-rule blocks", () => {
    expect(scopeCss("html,:host{a:b}*{c:d}@supports (x){::placeholder{e:f}}", "[s]")).toBe(":where([s]){a:b}:where([s]),:where([s]) *{c:d}@supports (x){:where([s]) *::placeholder,:where([s])::placeholder{e:f}}");
  });

  it("reads class tokens of canonical HTML", () => {
    expect(classTokensOf('<div class="a b"><p class="c">x</p></div>')).toEqual(["a", "b", "c"]);
  });

  it("the TSX export theme uses the same vocabulary", () => {
    expect(exportThemeCss()).toContain("@theme inline reference");
    expect(exportThemeCss()).toContain("--color-primary: var(--primary);");
  });
});
