import { describe, expect, it } from "vitest";
import { contrastRatio, hueDelta, oklchOf } from "./color";
import { toCssVars, toDTCG, toFigmaTokens, toTailwindTheme } from "./exporters";
import { PALETTE_STYLES, PALETTE_STYLE_IDS, type PaletteStyleId } from "./styles";
import { CONTRAST_PAIRS, generateTheme, type GenerateThemeInput, type Theme, type ThemeRoles } from "./theme";
import { mulberry32, randomHex } from "./testing/fixtures";

const HEX = /^#[0-9a-f]{6}$/;

function seedInputs(count: number): Omit<GenerateThemeInput, "style">[] {
  const rand = mulberry32(20261009);
  return Array.from({ length: count }, (_, i) => {
    if (i % 25 === 0) {
      const v = Math.floor(rand() * 256).toString(16).padStart(2, "0");
      return { primary: `#${v}${v}${v}` };
    }
    const primary = randomHex(rand);
    return i % 3 === 0 ? { primary, secondary: randomHex(rand) } : { primary };
  });
}

const SEEDS = seedInputs(200);

function hueErrors(theme: Theme): string[] {
  const seed = oklchOf(theme.seeds.primary);
  if (theme.achromatic || seed.c < 0.04) return [];
  return (["light", "dark"] as const).flatMap((mode) => {
    const primary = oklchOf(theme[mode].primary);
    // Below C 0.04 hue is not perceptible and hex rounding makes it unstable.
    if (primary.c < 0.04) return [];
    const d = Math.abs(hueDelta(seed.h, primary.h));
    return d > 15 ? [`${theme.seeds.primary} ${theme.styleId} ${mode} ΔH=${d.toFixed(1)}`] : [];
  });
}

describe("generateTheme × 200 seeds × 8 styles", () => {
  it.each(PALETTE_STYLE_IDS)("%s: every contrast pair passes, hue stays within ±15°, no NaN", (style) => {
    const failures: string[] = [];
    for (const input of SEEDS) {
      const theme = generateTheme({ ...input, style });
      expect(theme.contrast).toHaveLength(CONTRAST_PAIRS.length * 2);
      for (const check of theme.contrast) {
        if (!check.pass || check.ratio < check.required) {
          failures.push(`${input.primary} ${style} ${check.mode} ${check.pair} ${check.ratio}`);
        }
        expect(contrastRatio(check.fg, check.bg)).toBeGreaterThanOrEqual(check.required);
      }
      failures.push(...hueErrors(theme));
      for (const mode of ["light", "dark"] as const) {
        for (const value of Object.values(theme[mode])) expect(value).toMatch(HEX);
      }
      const serialized = JSON.stringify([theme, toDTCG(theme), toFigmaTokens(theme, "dark")]) + toCssVars(theme) + toTailwindTheme(theme);
      expect(serialized).not.toMatch(/NaN|undefined|Infinity/);
    }
    expect(failures).toEqual([]);
  }, 60_000);
});

describe("generateTheme", () => {
  it("survives extreme seeds, forced achromatic and achromatic secondaries in every style", () => {
    const extremes = ["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#fffff0", "#010203"];
    const inputs: Omit<GenerateThemeInput, "style">[] = [
      ...extremes.map((primary) => ({ primary })),
      ...extremes.map((primary, i) => ({ primary, secondary: extremes[(i + 3) % extremes.length]! })),
      { primary: "#3a5bd9", achromatic: true },
      { primary: "#3a5bd9", secondary: "#000000" },
    ];
    for (const style of PALETTE_STYLE_IDS) {
      for (const input of inputs) {
        const theme = generateTheme({ ...input, style });
        expect(theme.contrast.filter((c) => !c.pass), `${input.primary} ${style}`).toEqual([]);
        expect(hueErrors(theme)).toEqual([]);
      }
    }
  });

  it("keeps the exact brand hex in the brand style", () => {
    for (const { primary } of SEEDS) {
      const theme = generateTheme({ primary });
      expect(theme.light.brand).toBe(primary);
      expect(theme.dark.brand).toBe(primary);
      expect(theme.scales.brand.find((s) => s.step === theme.anchors.brand)?.hex).toBe(primary);
    }
  });

  it("uses the brand hex as primary when it already passes 3:1, and fixes text with primaryText", () => {
    const theme = generateTheme({ primary: "#e11d48" });
    expect(theme.light.primary).toBe("#e11d48");
    expect(theme.light.primaryForeground).toBe("#ffffff");
    const orange = generateTheme({ primary: "#ff9900" });
    expect(orange.light.brand).toBe("#ff9900");
    expect(orange.light.primary).not.toBe("#ff9900");
    expect(contrastRatio(orange.light.primaryText, orange.light.background)).toBeGreaterThanOrEqual(4.5);
    expect(orange.dark.primary).toBe("#ff9900");
  });

  it("is deterministic and normalizes input colors", () => {
    expect(generateTheme({ primary: "#3A5BD9", style: "neon" })).toEqual(generateTheme({ primary: "rgb(58, 91, 217)", style: "neon" }));
    expect(generateTheme({ primary: "#3A5BD9" }).seeds).toEqual({ primary: "#3a5bd9" });
  });

  it("achromatic logo: shadcn-like neutral theme, light primary in dark mode", () => {
    const theme = generateTheme({ primary: "#171717" });
    expect(theme.achromatic).toBe(true);
    expect(theme.scales.accent).toBeUndefined();
    for (const s of theme.scales.neutral) expect(oklchOf(s.hex).c).toBeLessThan(0.002);
    expect(theme.light.primary).toBe("#171717");
    expect(theme.light.background).toBe("#ffffff");
    expect(theme.dark.background).toBe("#0a0a0a");
    expect(oklchOf(theme.dark.primary).l).toBeGreaterThan(0.85);
    expect(theme.light.cta).toBe(theme.light.primary);
  });

  it("achromatic logo + chosen accent: cta, ring and accent surfaces follow the accent", () => {
    const theme = generateTheme({ primary: "#000000", secondary: "#e2581a" });
    expect(theme.achromatic).toBe(true);
    expect(theme.scales.accent).toBeDefined();
    const accentHue = oklchOf("#e2581a").h;
    for (const role of ["cta", "ring", "accent"] as const) {
      expect(Math.abs(hueDelta(accentHue, oklchOf(theme.light[role]).h))).toBeLessThan(15);
    }
  });

  it("achromatic logo picks up the style's own accent hue", () => {
    const hueOf = (style: PaletteStyleId) => oklchOf(generateTheme({ primary: "#111111", style }).dark.cta).h;
    expect(Math.abs(hueDelta(195, hueOf("neon")))).toBeLessThan(10);
    expect(Math.abs(hueDelta(42, hueOf("earthy")))).toBeLessThan(10);
    expect(Math.abs(hueDelta(85, hueOf("dark-luxury")))).toBeLessThan(10);
  });

  it("secondary seed becomes the CTA", () => {
    const theme = generateTheme({ primary: "#3a5bd9", secondary: "#f0a024" });
    expect(theme.dark.cta).toBe("#f0a024");
    expect(theme.anchors.accent).toBeDefined();
    expect(theme.scales.accent?.find((s) => s.step === theme.anchors.accent)?.hex).toBe("#f0a024");
  });

  it("style transforms move OKLCH in the documented direction", () => {
    const seed = oklchOf("#3a5bd9");
    const brandOf = (style: PaletteStyleId) => oklchOf(generateTheme({ primary: "#3a5bd9", style }).light.brand);
    expect(brandOf("vibrant").c).toBeGreaterThan(seed.c);
    expect(brandOf("pastel").l).toBeGreaterThan(seed.l + 0.15);
    expect(brandOf("pastel").c).toBeLessThan(seed.c);
    expect(brandOf("earthy").c).toBeLessThanOrEqual(0.121);
    expect(brandOf("corporate").c).toBeLessThanOrEqual(0.171);
    expect(brandOf("dark-luxury").c).toBeCloseTo(seed.c * 0.7, 2);
    expect(brandOf("mono")).toEqual(seed);
    const earthyShift = Math.abs(hueDelta(oklchOf("#e11d48").h, oklchOf(generateTheme({ primary: "#e11d48", style: "earthy" }).light.brand).h));
    expect(earthyShift).toBeGreaterThan(5);
    expect(earthyShift).toBeLessThanOrEqual(13.5);
  });

  it("neon pushes chroma to the gamut edge", () => {
    const neon = oklchOf(generateTheme({ primary: "#c04040", style: "neon" }).dark.brand);
    expect(neon.c).toBeGreaterThan(oklchOf("#c04040").c);
  });

  it("mono keeps a single hue and moves the CTA in lightness", () => {
    const theme = generateTheme({ primary: "#3a5bd9", secondary: "#f0a024", style: "mono" });
    const hue = oklchOf("#3a5bd9").h;
    for (const role of ["primary", "cta", "ring", "primaryText"] as const) {
      expect(Math.abs(hueDelta(hue, oklchOf(theme.light[role]).h))).toBeLessThan(3);
    }
    expect(theme.light.cta).not.toBe(theme.light.primary);
  });

  it("dark-by-default styles and surfaces", () => {
    expect(generateTheme({ primary: "#3a5bd9", style: "dark-luxury" }).defaultMode).toBe("dark");
    expect(generateTheme({ primary: "#3a5bd9", style: "neon" }).defaultMode).toBe("dark");
    expect(generateTheme({ primary: "#3a5bd9" }).defaultMode).toBe("light");
    const luxury = generateTheme({ primary: "#3a5bd9", style: "dark-luxury" });
    const bg = oklchOf(luxury.dark.background);
    expect(bg.l).toBeGreaterThan(0.14);
    expect(bg.l).toBeLessThan(0.19);
    expect(bg.c).toBeLessThanOrEqual(0.01);
  });

  it("harmonizes status colors toward the brand by at most 15°", () => {
    const theme = generateTheme({ primary: "#3a5bd9" });
    const hueAt600 = (scale: keyof Theme["scales"]) => oklchOf(theme.scales[scale]!.find((s) => s.step === 600)!.hex).h;
    expect(Math.abs(hueDelta(150, hueAt600("success")))).toBeLessThanOrEqual(16);
    expect(Math.abs(hueDelta(27, hueAt600("error")))).toBeLessThanOrEqual(16);
    expect(Math.abs(hueDelta(240, hueAt600("info")))).toBeLessThanOrEqual(16);
    expect(hueDelta(240, hueAt600("info"))).toBeGreaterThan(5);
  });

  it("lists every pair once per mode", () => {
    const theme = generateTheme({ primary: "#3a5bd9" });
    const keys = new Set(Object.keys(theme.light) as (keyof ThemeRoles)[]);
    for (const pair of CONTRAST_PAIRS) {
      expect(keys.has(pair.fg) && keys.has(pair.bg)).toBe(true);
    }
    expect(theme.contrast.filter((c) => c.mode === "light")).toHaveLength(CONTRAST_PAIRS.length);
    expect(theme.contrast.find((c) => c.pair === "primaryForeground/primary")?.required).toBe(4.5);
    expect(theme.contrast.find((c) => c.pair === "input/background")?.required).toBe(3);
  });

  it("rejects invalid input", () => {
    expect(() => generateTheme({ primary: "nope" })).toThrow(TypeError);
    expect(() => generateTheme({ primary: "#fff", secondary: "nope" })).toThrow(TypeError);
    expect(() => generateTheme({ primary: "#fff", style: "nope" as PaletteStyleId })).toThrow(TypeError);
  });
});

describe("PALETTE_STYLES", () => {
  it("has the 8 styles with es/en copy", () => {
    expect(PALETTE_STYLES.map((s) => s.id)).toEqual(["brand", "vibrant", "pastel", "mono", "dark-luxury", "earthy", "neon", "corporate"]);
    for (const style of PALETTE_STYLES) {
      expect(style.label.es && style.label.en && style.description.es && style.description.en).toBeTruthy();
    }
  });
});
