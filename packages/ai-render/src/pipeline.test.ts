import { compileThemeVars } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { acmeDoc, screensDoc } from "../../doc/src/testing/fixtures";
import { themeColorsFromVars } from "./contrast";
import { inlineAssets } from "./export";
import { blockBasis, processBlock } from "./pipeline";
import { draftTexts, screenInput } from "./input";
import type { RenderBlockInput } from "./prompt";

const doc = acmeDoc();
const theme = { light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
const block: RenderBlockInput = { id: "b-hero", type: "hero", label: "Hero", cols: 12, heightPx: 480, h1: true, draft: ["Hola"] };

describe("processBlock", () => {
  it("sanitizes, fixes headings and contrast, flags new contacts", () => {
    const raw = '<section data-block-id="b-hero" class="@container bg-muted"><h1>A</h1><h1 class="text-muted-foreground/50">B</h1><p>Write to us at team@acme.example</p></section>';
    const result = processBlock(raw, { block, screenIds: [], theme });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain("<h2");
    expect(result.gates.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(["heading-fixed", "new-contact"]));
    expect(["fixed", "ok"]).toContain(result.gates.contrast);
  });

  it("fails a hostile block or one that mostly ignored the vocabulary (it stays on the base design)", () => {
    expect(processBlock('<section data-block-id="b-hero"><script>x</script><p>a</p></section>', { block, screenIds: [], theme })).toMatchObject({ ok: false, failure: "hostile" });
    expect(processBlock('<section data-block-id="b-hero" class="bg-[#f00] text-white p-[3px] p-4"><p>a</p></section>', { block, screenIds: [], theme })).toMatchObject({ ok: false, failure: "too-many-dropped" });
  });

  it("containers keep only their surface classes", () => {
    const result = processBlock('<div data-block-id="b-box" class="@container bg-card rounded-card flex p-6"><p>children are other blocks</p></div>', { block: { ...block, id: "b-box", type: "container", container: true }, screenIds: [], theme });
    expect(result).toMatchObject({ ok: true, html: "", surfaceClasses: ["bg-card", "rounded-card", "p-6"] });
  });

  it("basis changes with the copy, the size or the direction, not with the id", () => {
    const a = blockBasis(block, "es", "d1");
    expect(blockBasis({ ...block, id: "other" }, "es", "d1")).toBe(a);
    expect(blockBasis({ ...block, draft: ["Adiós"] }, "es", "d1")).not.toBe(a);
    expect(blockBasis({ ...block, cols: 6 }, "es", "d1")).not.toBe(a);
    expect(blockBasis(block, "en", "d1")).not.toBe(a);
    expect(blockBasis(block, "es", "d2")).not.toBe(a);
  });
});

describe("inputs", () => {
  it("draft texts skip ids, links and bindings, keep prices", () => {
    expect(draftTexts({ variant: "split", title: "Hola", cta: { label: "Ir", href: "#" }, brand: { bind: "brand.name" }, plans: [{ name: "Pro", price: 12 }] })).toEqual(["Hola", "Ir", "Pro", "price: 12"]);
  });

  it("a screen's blocks in reading order, with the h1 on the hero", () => {
    const docWithScreens = screensDoc();
    const input = screenInput(docWithScreens, "s-home", { draftOf: () => [] });
    expect(input.blocks.map((b) => b.id)).not.toContain("b-shot"); // absorbed by the hero
    expect(input.blocks.find((b) => b.h1)?.type).toBe("hero");
    expect(input.screens.map((s) => s.id)).not.toContain("s-home");
  });
});

describe("export", () => {
  it("inlines icons and placeholders as SVG (no scripts in the export)", () => {
    const html = inlineAssets('<div><i class="size-4" data-icon="check" aria-hidden="true"></i><img class="w-full" alt="Panel" data-placeholder="screenshot"><img alt="Brisa" data-asset="logo"></div>', { logoUrl: "assets/logo.png" });
    expect(html).toContain("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"");
    expect(html).toContain('<svg class="w-full" aria-label="Panel" data-placeholder="screenshot"');
    expect(html).toContain('<img src="assets/logo.png" alt="Brisa">');
  });
});
