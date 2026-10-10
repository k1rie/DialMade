import { createDesignDoc, resolveExport, themeWithOverrides, toDTCGFull, toFigmaNumberVars, type DesignDoc } from "@dialmade/doc";
import { ROLE_KEYS, generateTheme, splitAlpha, toDTCG, toFigmaTokens, type Theme } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { applyImport, defaultSelection } from "../../apply";
import { importBatch } from "../../batch";
import { deltaE } from "../../color";
import type { FontMatcher } from "../../fonts";
import { MERGE_DELTA_E, effectiveMode } from "../../merge";
import { utf8 } from "../../testing/fakes";
import type { ImportedBrand, Mode } from "../../types";
import { tokensParser } from "./index";

// Our own exporters, imported back: every role in both modes within ΔEok 0.001 (alpha kept) and the
// same roles; shape, spacing and type where the format carries them.

const NOW = "2026-10-10T09:00:00.000Z";

/** Stays independent of the font matcher's index: the first non-generic family wins. */
const fonts: FontMatcher = {
  match: () => ({ kind: "none" }),
  resolveStack(stack) {
    const entries = (Array.isArray(stack) ? stack : String(stack).split(",")).map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    const family = entries.find((e) => !/^(?:sans-serif|serif|monospace|system-ui|ui-[a-z]+)$/.test(e));
    return family ? { family, fallback: entries.filter((e) => e !== family), match: { kind: "none" } } : null;
  },
};

const brisaDoc = (): DesignDoc =>
  createDesignDoc({
    brand: { name: "Brisa", seeds: { primary: "#3464d5", secondary: "#ef694a" } },
    brief: { productType: "saas-general", focus: "landing", locale: "es" },
    tokens: {
      color: { dark: { border: "#ffffff1a", input: "#ffffff26" } },
      radius: { md: 10 },
      typography: {
        heading: { family: "Brisa Grotesk", source: "local", fallback: ["system-ui", "sans-serif"], weights: [600, 700] },
        body: { family: "Inter", source: "google", weights: [400, 500] },
      },
    },
    provenance: { createdAt: NOW },
  });

async function reimport(files: { name: string; json: unknown }[]): Promise<ImportedBrand> {
  return importBatch(
    files.map((f) => ({ name: f.name, bytes: utf8(JSON.stringify(f.json)) })),
    { ownership: "own", rightsConfirmedAt: NOW, parsers: [tokensParser], fonts },
  );
}

function expectRoles(brand: ImportedBrand, theme: Pick<Theme, "light" | "dark">, modes: readonly Mode[] = ["light", "dark"]) {
  for (const mode of modes) {
    for (const key of ROLE_KEYS) {
      const color = brand.colors.find((c) => c.role === key && effectiveMode(c) === mode && !c.overriddenBy);
      const expected = splitAlpha(theme[mode][key]);
      expect(color, `${mode} ${key}`).toBeDefined();
      expect(deltaE(color!.hex, expected.hex), `${mode} ${key}`).toBeLessThan(0.001);
      expect(color!.alpha ?? 1, `${mode} ${key} alpha`).toBeCloseTo(expected.alpha, 2);
      expect(color!.confidence).toBe("exact");
    }
  }
}

describe("round trip: @dialmade/palette exporters", () => {
  const theme = generateTheme({ primary: "#3464d5", secondary: "#ef694a", style: "pastel", pinned: { dark: { border: "oklch(1 0 0 / 10%)" } } });

  it("toDTCG: both modes from one file, scales kept", async () => {
    const brand = await reimport([{ name: "brisa.dtcg.json", json: toDTCG(theme) }]);
    expect(brand.sources[0]).toMatchObject({ format: "dtcg-2025.10", parser: "tokens@1.0.0" });
    expectRoles(brand, theme);
    expect(brand.colors.find((c) => c.role === "border" && c.mode === "dark")?.alpha).toBe(0.1);
    // The core folds a step closer than MERGE_DELTA_E to a role into that role (one color, both
    // provenances), so those steps carry the role's exact value; the rest are exact.
    const brandSteps = new Map(brand.colors.filter((c) => c.scale?.group === "brand").map((c) => [c.scale!.step, c]));
    expect([...brandSteps.keys()].sort((a, b) => a - b)).toEqual(theme.scales.brand.map((s) => s.step));
    for (const step of theme.scales.brand) {
      const color = brandSteps.get(step.step)!;
      expect(deltaE(color.hex, step.hex)).toBeLessThan(color.role ? MERGE_DELTA_E : 0.001);
    }
  });

  it("toFigmaTokens: one file per mode", async () => {
    const brand = await reimport([
      { name: "Light.tokens.json", json: toFigmaTokens(theme, "light") },
      { name: "Dark.tokens.json", json: toFigmaTokens(theme, "dark") },
    ]);
    expectRoles(brand, theme);
    expect(brand.warnings.filter((w) => w.code === "mode-generated")).toHaveLength(0);
  });
});

describe("round trip: @dialmade/doc exporters", () => {
  it("toDTCGFull: colors, fonts, radii, spacing, shadows and the type scale", async () => {
    const doc = brisaDoc();
    const { inputs, light } = resolveExport(doc);
    const brand = await reimport([{ name: "brisa.full.json", json: toDTCGFull(doc) }]);
    expectRoles(brand, themeWithOverrides(doc, inputs.theme));

    expect(brand.fonts.filter((f) => !f.overriddenBy).map((f) => [f.role, f.family])).toEqual([
      ["heading", "Brisa Grotesk"],
      ["body", "Inter"],
      ["mono", light.fonts.mono.family ?? expect.any(String)],
    ]);
    for (const name of ["sm", "md", "lg", "xl"] as const) expect(brand.shape.radii?.[name]?.px).toBe(light.radius[name]);
    expect(Object.values(brand.spacing?.scale ?? {}).map((d) => d.px)).toEqual(light.space);
    expect(brand.shape.borderWidth?.px).toBe(light.borderWidth);
    for (const name of ["sm", "md", "lg"] as const) {
      const shadow = brand.shape.shadows?.find((s) => s.name === name);
      expect(shadow?.layers.map((l) => [l.x, l.y, l.blur, l.spread])).toEqual(light.shadows[name].map((l) => [l.x, l.y, l.blur, l.spread]));
    }
    const h1 = brand.typeScale?.find((t) => t.name === "h1");
    expect(h1?.fontSize?.px).toBe(light.fontSizes.h1.px);
    expect(h1?.lineHeight).toBe(light.lineHeights.tight);
    expect(h1?.letterSpacing).toBeCloseTo(light.heading.tracking, 2);
  });

  it("toDTCGFull → applyImport → the same colors and shape in a new doc", async () => {
    const doc = brisaDoc();
    const brand = await reimport([{ name: "brisa.full.json", json: toDTCGFull(doc) }]);
    const target = createDesignDoc({ brand: { name: "Otra", seeds: { primary: "#16a34a" } }, brief: { locale: "es" }, provenance: { createdAt: NOW } });
    const result = applyImport(target, brand, defaultSelection(brand), { ownership: "own", rightsConfirmedAt: NOW });
    if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
    const before = themeWithOverrides(doc, resolveExport(doc).inputs.theme);
    const after = themeWithOverrides(result.doc, resolveExport(result.doc).inputs.theme);
    for (const mode of ["light", "dark"] as const) {
      for (const key of ROLE_KEYS) expect(deltaE(after[mode][key], before[mode][key]), `${mode} ${key}`).toBeLessThan(0.001);
    }
    expect(after.dark.border).toBe("#ffffff1a");
    expect(resolveExport(result.doc).light.radius).toEqual(resolveExport(doc).light.radius);
    expect(resolveExport(result.doc).light.space).toEqual(resolveExport(doc).light.space);
  });

  it("toFigmaNumberVars: radii, spacing steps, border width and font sizes", async () => {
    const doc = brisaDoc();
    const { light } = resolveExport(doc);
    const brand = await reimport([{ name: "Numbers.tokens.json", json: toFigmaNumberVars(doc) }]);
    expect(brand.sources[0]?.format).toBe("figma-native");
    for (const name of ["sm", "md", "lg", "xl"] as const) expect(brand.shape.radii?.[name]).toMatchObject({ px: light.radius[name], confidence: "exact" });
    expect(Object.entries(brand.spacing?.scale ?? {}).map(([k, d]) => [k, d.px])).toEqual(
      ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"].map((k, i) => [k, light.space[i]]),
    );
    expect(brand.shape.borderWidth?.px).toBe(light.borderWidth);
    expect(brand.typeScale?.map((t) => [t.name, t.fontSize?.px])).toEqual(
      (["display", "h1", "h2", "h3", "body", "small", "caption"] as const).map((n) => [n, light.fontSizes[n].px]),
    );
    expect(brand.colors).toHaveLength(0);
  });
});
