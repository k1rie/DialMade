import {
  getMotionTier,
  getStyleRecipe,
  getTypographyPairing,
  styleRecipes,
  typographyPairings,
  type StyleRecipe,
} from "@dialmade/catalog";
import { formatOklch, generateTheme, toCssVarRecord } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { colorCssVars, compileThemeVars, fontSizeCss, shadowCss } from "./compile";
import { createDesignDoc } from "./doc";
import { applyPatch, lock, unlock } from "./patch";
import type { DesignDoc } from "./schema";
import { COMPONENT_VARS, CONTRACT_VARS, NON_COLOR_VARS } from "./testing/contract";
import { acmeDoc, importedDoc, monoDoc } from "./testing/fixtures";
import { dialLerp, nearestWeight, parseCubicBezier, pinnedFor, resolveThemeInputs, resolveTokens, themeInputFor, type ThemeInputs } from "./tokens";

const PX = /^(0|\d+(\.\d+)?px)$/;
const REM_OR_CLAMP = /^(\d+(\.\d+)?rem|clamp\(\d+(\.\d+)?rem, -?\d+(\.\d+)?rem \+ \d+(\.\d+)?vw, \d+(\.\d+)?rem\))$/;
const VAR = /^var\(--[\w-]+\)$/;

function compile(doc: DesignDoc, mode: "light" | "dark" = "light", overrides: Partial<ThemeInputs> = {}, pageDials?: DesignDoc["brief"]["dials"]) {
  return compileThemeVars(doc, { ...resolveThemeInputs(doc, overrides), mode, ...(pageDials && { pageDials }) });
}

function patched(doc: DesignDoc, ops: unknown[]): DesignDoc {
  const result = applyPatch(doc, ops);
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

const px = (value: string) => Number.parseFloat(value);

describe("compileThemeVars: completeness", () => {
  it.each(["light", "dark"] as const)("emits every variable of the contract (%s)", (mode) => {
    const vars = compile(acmeDoc(), mode);
    for (const name of CONTRACT_VARS) expect(vars[name], name).toBeTruthy();
    expect(Object.keys(vars).every((name) => name.startsWith("--"))).toBe(true);
  });

  it.each(styleRecipes.map((recipe) => [recipe.id, recipe] as const))("is complete and well-formed with recipe %s", (_id, recipe) => {
    for (const pairing of typographyPairings) {
      const vars = compile(monoDoc(), "dark", { recipe, pairing });
      for (const name of CONTRACT_VARS) expect(vars[name], `${recipe.id}/${pairing.id} ${name}`).toBeTruthy();
      for (const name of [...NON_COLOR_VARS, ...COMPONENT_VARS]) {
        const value = vars[name]!;
        if (/^--dl-(radius|space|section|container|border-width|button-h|nav-h|table-row|sidebar)/.test(name)) expect(value, name).toMatch(PX);
        if (name.startsWith("--dl-fs-")) expect(value, name).toMatch(REM_OR_CLAMP);
        if (name.startsWith("--dl-duration")) expect(value, name).toMatch(/^\d+ms$/);
        if (/^--dl-(button-radius|button-px|card-radius|card-padding|input-radius|input-h|badge-radius)$/.test(name)) expect(value, name).toMatch(VAR);
        if (/shadow/.test(name) && !name.startsWith("--dl-shadow")) expect(value, name).toMatch(/^(none|var\(--dl-shadow-(sm|md|lg)\))$/);
      }
      expect(vars["--dl-heading-weight"]).toMatch(/^\d00$/);
      expect(vars["--dl-ease"]).toMatch(/^cubic-bezier\(/);
    }
  });

  it("matches @dialmade/palette colors exactly", () => {
    const doc = acmeDoc();
    const inputs = resolveThemeInputs(doc);
    for (const mode of ["light", "dark"] as const) {
      const record = toCssVarRecord(inputs.theme, mode);
      const vars = compileThemeVars(doc, { ...inputs, mode });
      for (const [name, value] of Object.entries(record)) expect(vars[name], name).toBe(value);
    }
    const hex = compileThemeVars(doc, { ...inputs, mode: "light", colorFormat: "hex" });
    expect(hex["--primary"]).toBe(inputs.theme.light.primary);
  });

  it("aliases --color-cta-* to the brand scale when there is no accent", () => {
    const doc = createDesignDoc({ brand: { name: "Solo", seeds: { primary: "#3a5bd9" } } });
    const inputs = resolveThemeInputs(doc);
    expect(inputs.theme.scales.accent).toBeUndefined();
    const vars = compileThemeVars(doc, { ...inputs, mode: "light" });
    expect(vars["--color-cta-500"]).toBe("var(--color-brand-500)");
    expect(vars["--cta"]).toBe(vars["--primary"]);
  });
});

describe("compileThemeVars: determinism", () => {
  it("returns the same keys, order and values for the same input", () => {
    const a = compile(acmeDoc(), "light");
    const b = compile(acmeDoc(), "light");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(Object.keys(compile(acmeDoc(), "light"))).toEqual(Object.keys(compile(acmeDoc(), "dark")));
  });

  it("uses the passed recipe, pairing and motion tier, not the doc ids", () => {
    const doc = acmeDoc();
    const recipe = getStyleRecipe("minimal-swiss")!;
    const pairing = getTypographyPairing("editorial-serif")!;
    const motionTier = getMotionTier("expressive")!;
    const vars = compile(doc, "light", { recipe, pairing, motionTier });
    expect(vars["--dl-radius-md"]).toBe("2px");
    expect(vars["--dl-font-heading"]).toMatch(/^"Newsreader", /);
    expect(vars["--dl-duration-slow"]).toBe("800ms");
    expect(vars["--dl-shadow-md"]).toBe("none");
  });
});

describe("compileThemeVars: dials", () => {
  const at = (dials: Partial<DesignDoc["brief"]["dials"]>) =>
    compile(patched(acmeDoc(), Object.entries(dials).map(([k, v]) => ({ op: "replace", path: `/brief/dials/${k}`, value: v }))));

  it("density scales spacing and heights (denser = tighter)", () => {
    const airy = at({ density: 1 });
    const mid = at({ density: 5 });
    const dense = at({ density: 10 });
    for (const name of ["--dl-space-4", "--dl-space-8", "--dl-section-py", "--dl-button-h-md", "--dl-nav-h", "--dl-table-row-h"]) {
      expect(px(airy[name]!), name).toBeGreaterThan(px(mid[name]!));
      expect(px(mid[name]!), name).toBeGreaterThan(px(dense[name]!));
    }
    expect(mid["--dl-space-4"]).toBe("16px");
    expect(mid["--dl-button-h-md"]).toBe("40px");
    expect(px(dense["--dl-container"]!)).toBeGreaterThan(px(airy["--dl-container"]!));
    expect(Number(dense["--dl-lh-body"])).toBeLessThan(Number(airy["--dl-lh-body"]));
    expect(airy["--dl-radius-md"]).toBe(dense["--dl-radius-md"]);
  });

  it("variance widens the type scale and amplifies radii", () => {
    const calm = resolveTokens(patched(acmeDoc(), [{ op: "replace", path: "/brief/dials/variance", value: 1 }]), { ...resolveThemeInputs(acmeDoc()), mode: "light" });
    const bold = resolveTokens(patched(acmeDoc(), [{ op: "replace", path: "/brief/dials/variance", value: 10 }]), { ...resolveThemeInputs(acmeDoc()), mode: "light" });
    const ratio = (t: typeof calm) => t.fontSizes.display.px / t.fontSizes.body.px;
    expect(ratio(bold)).toBeGreaterThan(ratio(calm) * 1.8);
    expect(bold.fontSizes.h1.px).toBeGreaterThan(calm.fontSizes.h1.px);
    expect(bold.fontSizes.body.px).toBe(calm.fontSizes.body.px);
    expect(bold.radius.md).toBeGreaterThan(calm.radius.md);
    expect(bold.lineHeights.tight).toBeLessThan(calm.lineHeights.tight);
    expect(bold.space).toEqual(calm.space);
    const sizes = (t: typeof calm) => ["display", "h1", "h2", "h3", "body", "small", "caption"].map((n) => t.fontSizes[n as "h1"].px);
    for (const t of [calm, bold]) {
      const s = sizes(t);
      for (let i = 1; i < s.length; i++) expect(s[i - 1]!).toBeGreaterThan(s[i]!);
      expect(t.fontSizes.display.minPx).toBeGreaterThanOrEqual(t.fontSizes.h1.minPx);
      expect(t.fontSizes.h1.minPx).toBeGreaterThanOrEqual(t.fontSizes.h2.px);
    }
  });

  it("motion scales durations", () => {
    const still = at({ motion: 1 });
    const lively = at({ motion: 10 });
    const mid = at({ motion: 5 });
    expect(mid["--dl-duration-base"]).toBe(`${getMotionTier("standard")!.durations.base}ms`);
    for (const name of ["--dl-duration-fast", "--dl-duration-base", "--dl-duration-slow"]) {
      expect(px(still[name]!)).toBeLessThan(px(mid[name]!));
      expect(px(lively[name]!)).toBeGreaterThan(px(mid[name]!));
    }
    expect(still["--dl-space-4"]).toBe(lively["--dl-space-4"]);
  });

  it("page dials override the global dials", () => {
    const doc = acmeDoc();
    const page = compile(doc, "light", {}, { ...doc.brief.dials, ...doc.pages.app!.dials });
    expect(px(page["--dl-space-4"]!)).toBeLessThan(px(compile(doc)["--dl-space-4"]!));
    const viaOption = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "light", pageDials: { density: 7 } });
    expect(viaOption).toEqual(page);
  });

  it("dialLerp is neutral at 5 and clamps", () => {
    expect(dialLerp(5, 0, 1, 2)).toBe(1);
    expect(dialLerp(1, 0, 1, 2)).toBe(0);
    expect(dialLerp(10, 0, 1, 2)).toBe(2);
    expect(dialLerp(-3, 0, 1, 2)).toBe(0);
    expect(dialLerp(99, 0, 1, 2)).toBe(2);
    expect(dialLerp(3, 0, 1, 2)).toBe(0.5);
  });
});

describe("compileThemeVars: recipe and system", () => {
  const recipe = (id: string) => getStyleRecipe(id)!;

  it("compiles button shapes to radius aliases", () => {
    const base = acmeDoc();
    const square = compile(patched(base, [{ op: "add", path: "/system/button/shape", value: "square" }]));
    const rounded = compile(patched(base, [{ op: "add", path: "/system/button/shape", value: "rounded" }]));
    const pill = compile(patched(base, [{ op: "add", path: "/system/button/shape", value: "pill" }]));
    expect(square["--dl-button-radius"]).toBe("var(--dl-radius-sm)");
    expect(rounded["--dl-button-radius"]).toBe("var(--dl-radius-md)");
    expect(pill["--dl-button-radius"]).toBe("var(--dl-radius-full)");
    expect(pill["--dl-radius-full"]).toBe("9999px");
    expect(pill["--dl-button-px"]).toBe("var(--dl-space-5)");
    expect(rounded["--dl-button-px"]).toBe("var(--dl-space-4)");
    expect(square["--dl-badge-radius"]).toBe("var(--dl-radius-sm)");
    expect(square["--dl-input-radius"]).toBe("var(--dl-radius-sm)");
  });

  it("compiles card elevation, padding and border", () => {
    const doc = patched(acmeDoc(), [
      { op: "add", path: "/system/card/elevation", value: 3 },
      { op: "add", path: "/system/card/padding", value: "compact" },
      { op: "add", path: "/system/card/border", value: false },
    ]);
    const vars = compile(doc, "light", { recipe: recipe("soft-ui") });
    expect(vars["--dl-card-shadow"]).toBe("var(--dl-shadow-lg)");
    expect(vars["--dl-card-padding"]).toBe("var(--dl-space-4)");
    expect(vars["--dl-card-border"]).toBe("none");
    const flat = compile(patched(acmeDoc(), [{ op: "add", path: "/system/card/elevation", value: 0 }]));
    expect(flat["--dl-card-shadow"]).toBe("none");
  });

  it("takes defaults from the recipe", () => {
    const swiss = compile(acmeDoc(), "light", { recipe: recipe("minimal-swiss") });
    expect(swiss["--dl-button-radius"]).toBe("var(--dl-radius-sm)");
    expect(swiss["--dl-radius-sm"]).toBe("0");
    expect(swiss["--dl-card-shadow"]).toBe("none");
    expect(swiss["--dl-card-border"]).toBe("var(--dl-border-width) solid var(--border)");
    expect(swiss["--dl-shadow-lg"]).toBe("none");

    const playful = compile(acmeDoc(), "light", { recipe: recipe("playful") });
    expect(playful["--dl-button-radius"]).toBe("var(--dl-radius-full)");
    expect(playful["--dl-button-shadow"]).toBe("var(--dl-shadow-sm)");
    expect(playful["--dl-card-padding"]).toBe("var(--dl-space-6)");
    expect(playful["--dl-card-border"]).toBe("none");

    const brutal = compile(acmeDoc(), "light", { recipe: recipe("soft-neubrutal") });
    expect(brutal["--dl-card-border"]).toBe("var(--dl-border-width) solid var(--border-strong)");
  });

  it("builds shadows per recipe and mode", () => {
    const doc = acmeDoc();
    const inputs = resolveThemeInputs(doc);
    const tokens = (id: string, mode: "light" | "dark") => resolveTokens(doc, { ...inputs, recipe: recipe(id), mode });

    const crisp = tokens("soft-neubrutal", "light");
    expect(crisp.shadows.md).toEqual([{ x: 4, y: 4, blur: 0, spread: 0, color: crisp.colors.foreground, alpha: 1 }]);

    const glow = tokens("tech-precision", "dark");
    expect(glow.shadows.sm.every((layer) => layer.color === glow.colors.primary)).toBe(true);

    const softLight = tokens("soft-ui", "light");
    const softDark = tokens("soft-ui", "dark");
    softLight.shadows.lg.forEach((layer, i) => expect(softDark.shadows.lg[i]!.alpha).toBeGreaterThan(layer.alpha));
    expect(shadowCss(softLight.shadows.sm)).toBe("0 1px 2px 0 rgb(9 10 13 / 0.05), 0 1px 3px 0 rgb(9 10 13 / 0.08)");
    expect(shadowCss([])).toBe("none");
  });

  it("chooses font weights the pairing actually loads", () => {
    const doc = acmeDoc();
    const inputs = resolveThemeInputs(doc);
    const t = resolveTokens(doc, {
      ...inputs,
      mode: "light",
      recipe: { ...recipe("minimal-swiss"), headingWeight: 800, button: { shape: "square", weight: 300, shadow: false } },
      pairing: getTypographyPairing("editorial-serif")!,
    });
    expect(t.heading.weight).toBe(600);
    expect(t.components.button.weight).toBe(400);
    expect(nearestWeight(550, [500, 600])).toBe(600);
    expect(nearestWeight(500, [])).toBe(500);
  });

  it("detects mono pairings for --dl-font-mono", () => {
    const vars = compile(acmeDoc(), "light", { pairing: getTypographyPairing("mono-tech")! });
    expect(vars["--dl-font-mono"]).toMatch(/^"JetBrains Mono", ui-monospace/);
    expect(compile(acmeDoc())["--dl-font-mono"]).toMatch(/^ui-monospace/);
  });

  it("maps system sizes for nav, table and sidebar", () => {
    const doc = patched(acmeDoc(), [
      { op: "add", path: "/system/nav/size", value: "roomy" },
      { op: "add", path: "/system/table/size", value: "compact" },
      { op: "add", path: "/system/sidebar/width", value: "narrow" },
    ]);
    const vars = compile(doc);
    expect(px(vars["--dl-nav-h"]!)).toBeGreaterThan(64);
    expect(px(vars["--dl-table-row-h"]!)).toBeLessThan(48);
    expect(vars["--dl-sidebar-w"]).toBe("224px");
  });
});

describe("compileThemeVars: token overrides", () => {
  it("applies user overrides after the dials", () => {
    const doc = patched(acmeDoc(), [
      { op: "replace", path: "/brief/dials/variance", value: 10 },
      { op: "add", path: "/tokens/color/light/primary", value: "#FF0000" },
      { op: "add", path: "/tokens/radius/md", value: 5 },
      { op: "add", path: "/tokens/fontSize/display", value: 72 },
      { op: "add", path: "/tokens/fontSize/body", value: 18 },
      { op: "add", path: "/tokens/space/4", value: 20 },
      { op: "add", path: "/tokens/borderWidth", value: 2 },
      { op: "add", path: "/tokens/motion/base", value: 333 },
      { op: "add", path: "/tokens/motion/ease", value: "ease-in-out" },
    ]);
    const light = compile(doc, "light");
    const dark = compile(doc, "dark");
    expect(light["--primary"]).toBe(formatOklch("#ff0000"));
    expect(dark["--primary"]).not.toBe(formatOklch("#ff0000"));
    expect(light["--dl-radius-md"]).toBe("5px");
    expect(light["--dl-fs-display"]).toBe("4.5rem");
    expect(light["--dl-fs-body"]).toBe("1.125rem");
    expect(light["--dl-space-4"]).toBe("20px");
    expect(light["--dl-border-width"]).toBe("2px");
    expect(light["--dl-duration-base"]).toBe("333ms");
    expect(light["--dl-ease"]).toBe("ease-in-out");
    const t = resolveTokens(doc, { ...resolveThemeInputs(doc), mode: "light" });
    expect(t.motion.bezier).toEqual([0.42, 0, 0.58, 1]);
    expect(t.fontSizes.h3.px).toBeGreaterThan(18 * 1.3 ** 2);
  });
});

describe("helpers", () => {
  it("formats fluid font sizes as clamp()", () => {
    expect(fontSizeCss({ px: 16, minPx: 16 })).toBe("1rem");
    expect(fontSizeCss({ px: 56, minPx: 34 })).toBe("clamp(2.125rem, 1.5552rem + 2.4309vw, 3.5rem)");
  });

  it("parses easings", () => {
    expect(parseCubicBezier("cubic-bezier(0.16, 1, 0.3, 1)")).toEqual([0.16, 1, 0.3, 1]);
    expect(parseCubicBezier("linear")).toEqual([0, 0, 1, 1]);
    expect(parseCubicBezier("constructor")).toBeNull();
    expect(parseCubicBezier("steps(4)")).toBeNull();
  });

  it("resolves theme inputs from the doc", () => {
    const doc = monoDoc();
    const inputs = resolveThemeInputs(doc);
    expect(inputs.recipe.id).toBe(doc.brief.recipeId);
    expect(inputs.pairing.id).toBe(doc.brief.pairingId);
    expect(inputs.motionTier.id).toBe(doc.brief.motionTier);
    expect(inputs.theme).toEqual(generateTheme({ primary: "#171717", achromatic: true, style: "brand" }));
    const custom: StyleRecipe = { ...inputs.recipe, id: "custom" };
    expect(resolveThemeInputs(doc, { recipe: custom }).recipe).toBe(custom);
  });
});

describe("compileThemeVars: imported tokens", () => {
  const unwrap = (result: ReturnType<typeof applyPatch>): DesignDoc => {
    if (!result.ok) throw new Error(result.error.message);
    return result.doc;
  };

  it("emits the whole contract with imported values", () => {
    for (const mode of ["light", "dark"] as const) {
      const vars = compile(importedDoc(), mode);
      for (const name of CONTRACT_VARS) expect(vars[name], name).toBeTruthy();
    }
  });

  it("prefers imported colors over the generated ones, alpha included", () => {
    const doc = importedDoc();
    const light = compile(doc, "light");
    const dark = compile(doc, "dark");
    expect(light["--primary"]).toBe(formatOklch("#2f4fd0"));
    expect(light["--primary-foreground"]).toBe("oklch(1 0 0)");
    expect(dark["--border"]).toBe("oklch(1 0 0 / 0.1)");
    expect(dark["--input"]).toBe("oklch(1 0 0 / 0.15)");
    const hex = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "dark", colorFormat: "hex" });
    expect(hex["--border"]).toBe("#ffffff1a");
    expect(hex["--input"]).toBe("#ffffff26");
  });

  it("pins only the locked colors when generating the theme", () => {
    const doc = importedDoc();
    expect(pinnedFor(doc)).toEqual({ light: { primary: "#2f4fd0" }, dark: { border: "#ffffff1a" } });
    expect(themeInputFor(doc)).toMatchObject({ primary: doc.brand.seeds.primary, style: doc.brief.paletteStyleId, pinned: pinnedFor(doc) });
    expect(pinnedFor(acmeDoc())).toBeUndefined();
    expect(themeInputFor(acmeDoc())).not.toHaveProperty("pinned");
    const unlocked = unwrap(unlock(doc, "/tokens/color/light/primary"));
    expect(pinnedFor(unlocked)).toEqual({ dark: { border: "#ffffff1a" } });
  });

  it("anchors the brand scale to a locked primary, also under another palette style", () => {
    for (const style of ["brand", "pastel", "vibrant"] as const) {
      const doc = unwrap(applyPatch(importedDoc(), [{ op: "replace", path: "/brief/paletteStyleId", value: style }]));
      const { theme } = resolveThemeInputs(doc);
      expect(theme.light.primary, style).toBe("#2f4fd0");
      expect(theme.dark.border, style).toBe("#ffffff1a");
      const anchor = theme.scales.brand.find((step) => step.step === theme.anchors.brand);
      expect(anchor?.hex, style).toBe("#2f4fd0");
      expect(compile(doc, "light")[`--color-brand-${theme.anchors.brand}`], style).toBe(formatOklch("#2f4fd0"));
    }
  });

  it("pins a locked 50–950 scale and exports it as is", () => {
    const scale = { "50": "#eef2ff", "500": "#2f4fd0", "950": "#0b1240" };
    const doc = unwrap(lock(acmeDoc(), "/tokens/color/scales/brand", { value: scale }));
    expect(pinnedFor(doc)?.scales?.brand?.map((step) => step.hex)).toEqual(["#eef2ff", "#2f4fd0", "#0b1240"]);
    const vars = compile(doc, "light");
    expect(vars["--color-brand-50"]).toBe(formatOklch("#eef2ff"));
    expect(vars["--color-brand-950"]).toBe(formatOklch("#0b1240"));
  });

  it("prefers imported type, shape, space, elevation and border over recipe and pairing", () => {
    const doc = importedDoc();
    const vars = compile(doc, "light");
    expect(vars["--dl-font-heading"]).toBe('"Brand Grotesk", "Arimo", system-ui, sans-serif');
    expect(vars["--dl-font-body"]?.startsWith('"Inter", ')).toBe(true);
    expect(vars["--dl-lh-tight"]).toBe("1.1");
    expect(vars["--dl-lh-body"]).toBe("1.5");
    expect(vars["--dl-heading-weight"]).toBe("700");
    expect(vars["--dl-heading-tracking"]).toBe("-0.02em");
    expect(vars["--dl-radius-md"]).toBe("10px");
    expect(vars["--dl-space-4"]).toBe("18px");
    expect(vars["--dl-border-width"]).toBe("1px");
    expect(vars["--dl-shadow-sm"]).toBe("0 1px 2px 0 rgb(0 0 0 / 0.05)");
    expect(vars["--dl-shadow-lg"]).toBe("none");
  });

  it("keeps imported values when the recipe, pairing or dials change", () => {
    const doc = importedDoc();
    const base = compile(doc, "light");
    const swiss = compile(doc, "light", { recipe: getStyleRecipe("minimal-swiss")!, pairing: getTypographyPairing("editorial-serif")! });
    const dense = compile(doc, "light", {}, { variance: 10, motion: 5, density: 10 });
    for (const vars of [swiss, dense]) {
      expect(vars["--dl-radius-md"]).toBe("10px");
      expect(vars["--dl-space-4"]).toBe("18px");
      expect(vars["--dl-font-heading"]).toBe(base["--dl-font-heading"]);
      expect(vars["--dl-font-body"]?.startsWith('"Inter", ')).toBe(true);
      expect(vars["--dl-lh-tight"]).toBe("1.1");
      expect(vars["--dl-shadow-sm"]).toBe(base["--dl-shadow-sm"]);
    }
    expect(dense["--dl-radius-sm"]).not.toBe(base["--dl-radius-sm"]);
    expect(dense["--dl-space-3"]).not.toBe(base["--dl-space-3"]);
  });

  it("resolves the theme itself when no inputs are passed", () => {
    const doc = importedDoc();
    for (const mode of ["light", "dark"] as const) {
      expect(compileThemeVars(doc, { mode })).toEqual(compileThemeVars(doc, { ...resolveThemeInputs(doc), mode }));
      expect(colorCssVars(doc, { mode })).toEqual(colorCssVars(doc, { theme: resolveThemeInputs(doc).theme, mode }));
    }
    const recipe = getStyleRecipe("minimal-swiss")!;
    expect(compileThemeVars(doc, { mode: "light", recipe })).toEqual(compileThemeVars(doc, { ...resolveThemeInputs(doc, { recipe }), mode: "light" }));
  });
});
