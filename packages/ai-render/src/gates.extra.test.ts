// Track D's gates: a visible focus indicator (4b), the writing system (9) and the responsive verdict (5) from the
// island's measurements at the 3 device widths.
import { compileThemeVars } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { acmeDoc } from "../../doc/src/testing/fixtures";
import { themeColorsFromVars, type ThemeColors } from "./contrast";
import { extraGateWarnings, foreignScript, missingFocusIndicators, responsiveGate } from "./gates";
import { processBlock } from "./pipeline";
import type { RenderBlockInput } from "./prompt";
import { parseSanitized, type AiElement } from "./tree";

const tree = (html: string) => parseSanitized(html)[0] as AiElement;

describe("gate 4b: focus indicator", () => {
  it("flags interactive elements that remove the outline and draw nothing on focus", () => {
    const root = tree(
      '<div><a href="#" class="outline-none">Ver demo</a><button class="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ok</button><input class="outline-hidden focus:border-primary"><span class="outline-none">not focusable</span><div tabindex="0" class="focus-visible:outline-none">Card</div></div>',
    );
    expect(missingFocusIndicators(root)).toEqual(["Ver demo", "Card"]);
  });

  it("an outline that does not show after the fixes is a focus-ring warning, not a text contrast one", () => {
    // Every candidate color of the fix is the parent's background: nothing can make the ring visible.
    const flat = { background: "#777777", foreground: "#777777", primary: "#777777", ring: "#777777" };
    const theme: ThemeColors = { light: flat, dark: flat };
    const block: RenderBlockInput = { id: "b", type: "cta", label: "CTA", cols: 12, heightPx: 200, draft: [] };
    const result = processBlock('<section data-block-id="b" class="bg-background"><a href="#" class="focus-visible:outline-ring">Ir</a></section>', { block, screenIds: [], theme });
    expect(result.ok && result.gates.warnings.some((w) => w.code === "focus-ring")).toBe(true);
  });

  it("a ring under `focus:` is checked like `focus-visible:`", () => {
    const doc = acmeDoc();
    const theme = { light: themeColorsFromVars(compileThemeVars(doc, { mode: "light" })), dark: themeColorsFromVars(compileThemeVars(doc, { mode: "dark" })) };
    const block: RenderBlockInput = { id: "b", type: "cta", label: "CTA", cols: 12, heightPx: 200, draft: [] };
    const result = processBlock('<section data-block-id="b" class="bg-background"><a href="#" class="text-foreground focus:ring-2 focus:ring-background">Ir</a></section>', { block, screenIds: [], theme });
    expect(result.ok && result.html).not.toContain("focus:ring-background");
  });
});

describe("gate 9: writing system", () => {
  it("flags words with letters outside the Latin script that the input did not have", () => {
    const root = tree("<p>Gestiona tu agenda sin配置 y cobra con Ñandú, café, naïve · 3×2 ✓ €</p>");
    expect(foreignScript(root, [])).toEqual(["sin配置"]);
    expect(foreignScript(root, ["配置"])).toEqual([]);
    expect(foreignScript(tree("<p>Привет мир</p>"), [])).toEqual(["Привет", "мир"]);
  });

  it("is part of processBlock's warnings", () => {
    const warnings = extraGateWarnings(tree('<div><p>Reserva sin配置</p><a href="#" class="outline-none">Ir</a></div>'), ["Reserva"]);
    expect(warnings.map((w) => w.code)).toEqual(["focus-ring", "foreign-script"]);
  });
});

describe("gate 5: responsive", () => {
  it("names the device of every overflow, clipped text and small target", () => {
    const verdict = responsiveGate([
      { device: "mobile", width: 358, overflowX: true, smallTargets: 2, clipped: 1 },
      { device: "desktop", width: 1440, overflowX: false, smallTargets: 0, clipped: 0, height: 900 },
      { device: "tablet", width: 768, overflowX: false, smallTargets: 1, clipped: 0 },
    ], { layoutHeightPx: 600 });
    expect(verdict.responsive).toBe("warn");
    expect(verdict.warnings).toEqual([
      { code: "small-target", detail: "tablet · 1" },
      { code: "overflow", detail: "mobile · 358px" },
      { code: "overflow", detail: "mobile · clipped 1" },
      { code: "small-target", detail: "mobile · 2" },
      { code: "overflow", detail: "desktop · 900/600px" },
    ]);
  });

  it("is ok when nothing overflows and the height is within 1.25 × the layout's", () => {
    expect(responsiveGate([{ device: "desktop", width: 1440, overflowX: false, smallTargets: 0, clipped: 0, height: 740 }], { layoutHeightPx: 600 })).toEqual({ responsive: "ok", warnings: [] });
  });
});
