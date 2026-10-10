import { describe, expect, it } from "vitest";
import { FONT_ALIASES, METRIC_COMPATIBLE, STYLE_ALTERNATIVES, SYSTEM_ALTERNATIVES } from "./alternatives";
import fontIndex from "./font-index.json";
import { createFontMatcher, googleFonts } from "./matcher";
import { familyVariants } from "./normalize";

const matcher = createFontMatcher();

describe("font index", () => {
  it("has every Google Fonts family of the CSV, without popularity or trending data", () => {
    expect(fontIndex.count).toBe(1934);
    expect(fontIndex.families).toHaveLength(1934);
    expect(fontIndex.columns).toEqual(["family", "category", "weights"]);
    expect(fontIndex.droppedColumns).toEqual(["Popularity Rank", "Trending Rank"]);
    expect(fontIndex.license).toBe("MIT");
    const inter = googleFonts().find((f) => f.family === "Inter");
    expect(inter).toMatchObject({ category: "sans-serif" });
    expect(inter?.weights).toContain(400);
  });

  it("every curated target is a Google Fonts family", () => {
    const targets = [
      ...Object.values(FONT_ALIASES),
      ...Object.values(METRIC_COMPATIBLE),
      ...Object.values(STYLE_ALTERNATIVES).flat(),
      ...Object.values(SYSTEM_ALTERNATIVES).flat(),
    ];
    for (const family of targets) expect(matcher.lookup(family), family).toBe(family);
  });
});

describe("match", () => {
  it("exact, case- and punctuation-insensitive, PostScript names and style suffixes", () => {
    expect(matcher.match("Inter")).toEqual({ kind: "google", family: "Inter" });
    expect(matcher.match("open-sans")).toEqual({ kind: "google", family: "Open Sans" });
    expect(matcher.match("Geist_Mono")).toEqual({ kind: "google", family: "Geist Mono" });
    expect(matcher.match("PlusJakartaSans-Bold")).toEqual({ kind: "google", family: "Plus Jakarta Sans" });
    expect(matcher.match("Roboto Variable")).toEqual({ kind: "google", family: "Roboto" });
    expect(matcher.match("ABCDEF+Lora-Italic")).toEqual({ kind: "google", family: "Lora" });
    expect(matcher.match("Source Sans 3")).toEqual({ kind: "google", family: "Source Sans 3" });
  });

  it("aliases: renamed and packaged names", () => {
    expect(matcher.match("Source Sans Pro")).toEqual({ kind: "alias", family: "Source Sans 3" });
    expect(matcher.match("Inter var")).toEqual({ kind: "alias", family: "Inter" });
    expect(matcher.match("InterVariable")).toEqual({ kind: "alias", family: "Inter" });
    expect(matcher.match("Geist Sans")).toEqual({ kind: "alias", family: "Geist" });
  });

  it("metric-compatible free families", () => {
    const pairs: [string, string][] = [
      ["Arial", "Arimo"],
      ["Helvetica", "Arimo"],
      ["Times New Roman", "Tinos"],
      ["Courier New", "Cousine"],
      ["Calibri", "Carlito"],
      ["Cambria", "Caladea"],
      ["Georgia", "Gelasio"],
      ["ArialMT", "Arimo"],
    ];
    for (const [family, free] of pairs) expect(matcher.match(family), family).toEqual({ kind: "metric-compatible", family: free });
  });

  it("style alternatives for proprietary families", () => {
    expect(matcher.match("Futura")).toEqual({ kind: "style-alt", family: "Jost", candidates: ["Jost"] });
    expect(matcher.match("Proxima Nova")).toEqual({ kind: "style-alt", family: "Figtree", candidates: ["Figtree", "Montserrat"] });
    expect(matcher.match("Helvetica Neue")).toMatchObject({ kind: "style-alt", family: "Inter" });
  });

  it("system families, with a free alternative to offer", () => {
    expect(matcher.match("SF Pro Text")).toEqual({ kind: "system", candidates: ["Inter"] });
    expect(matcher.match("Segoe UI")).toEqual({ kind: "system", candidates: ["Open Sans", "Noto Sans"] });
    expect(matcher.match("-apple-system")).toEqual({ kind: "system", candidates: ["Inter"] });
    expect(matcher.match("sans-serif")).toEqual({ kind: "system" });
  });

  it("fuzzy: a unique close match is taken; otherwise up to 3 candidates, ties by name", () => {
    expect(matcher.match("Plus Jakarta Snas")).toMatchObject({ kind: "google", family: "Plus Jakarta Sans" });
    const typo = matcher.match("Montserat");
    expect(typo.kind).toBe("none");
    expect(typo.candidates?.[0]).toBe("Montserrat");
    expect(typo.candidates!.length).toBeLessThanOrEqual(3);
    expect(matcher.match("Josefin").candidates?.slice(0, 2)).toEqual(["Josefin Sans", "Josefin Slab"]);
    expect(matcher.match("Brand Grotesk").kind).toBe("none");
    expect(matcher.match("Qwxzv Kprt")).toEqual({ kind: "none" });
    expect(matcher.match("")).toEqual({ kind: "none" });
  });
});

describe("deduceFromVariable", () => {
  it("reads the family from next/font-style variable names", () => {
    expect(matcher.deduceFromVariable("--font-inter")).toBe("Inter");
    expect(matcher.deduceFromVariable("--font-geist-mono")).toBe("Geist Mono");
    expect(matcher.deduceFromVariable("--font-geist-sans")).toBe("Geist");
    expect(matcher.deduceFromVariable("--font-jetbrains-mono")).toBe("JetBrains Mono");
    expect(matcher.deduceFromVariable("--font-source-sans-pro")).toBe("Source Sans 3");
    expect(matcher.deduceFromVariable("--font-satoshi")).toBe("Satoshi");
  });

  it("role names say nothing about the family", () => {
    for (const name of ["--font-sans", "--font-heading", "--font-mono", "--font-body", "--font-display", "--font-brand", "--font-1"]) {
      expect(matcher.deduceFromVariable(name), name).toBeNull();
    }
  });
});

describe("resolveStack", () => {
  it("the app's own stack: Inter from var(--font-inter), the SF stack as fallback", () => {
    const body = matcher.resolveStack(`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", var(--font-inter), system-ui, sans-serif`);
    expect(body).toEqual({
      family: "Inter",
      fallback: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "system-ui", "sans-serif"],
      match: { kind: "google", family: "Inter" },
      deduced: true,
    });
    const mono = matcher.resolveStack(`ui-monospace, "SF Mono", var(--font-geist-mono), "JetBrains Mono", monospace`);
    expect(mono).toMatchObject({ family: "Geist Mono", fallback: ["ui-monospace", "SF Mono", "JetBrains Mono", "monospace"], match: { kind: "google" }, deduced: true });
  });

  it("a declared family is not deduced", () => {
    expect(matcher.resolveStack(`"Inter", system-ui, sans-serif`)).toEqual({ family: "Inter", fallback: ["system-ui", "sans-serif"], match: { kind: "google", family: "Inter" } });
    expect(matcher.resolveStack(["Roboto", "sans-serif"])).toMatchObject({ family: "Roboto", match: { kind: "google" } });
  });

  it("system stacks (Tailwind's, Bootstrap's) stay system: Roboto or Arial there are platform fonts", () => {
    const tailwind = matcher.resolveStack(
      `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'`,
    );
    expect(tailwind).toMatchObject({ family: "-apple-system", match: { kind: "system" } });
    expect(tailwind?.deduced).toBeUndefined();
    expect(matcher.resolveStack(`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif`)).toMatchObject({
      family: "system-ui",
      match: { kind: "system" },
    });
    expect(matcher.resolveStack("ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace")).toMatchObject({
      match: { kind: "system" },
    });
  });

  it("a stack that starts with a real family keeps it, whatever it is", () => {
    expect(matcher.resolveStack(`"Helvetica Neue", Arial, sans-serif`)).toMatchObject({ family: "Helvetica Neue", match: { kind: "style-alt" }, fallback: ["Arial", "sans-serif"] });
    expect(matcher.resolveStack("Arial, sans-serif")).toMatchObject({ family: "Arial", match: { kind: "metric-compatible", family: "Arimo" } });
  });

  it("undefined variables: deduced from the name, else their fallback, else dropped", () => {
    expect(matcher.resolveStack(`var(--font-sans, "Lora", serif)`)).toMatchObject({ family: "Lora", fallback: ["serif"], match: { kind: "google" } });
    expect(matcher.resolveStack(`var(--font-satoshi), sans-serif`)).toMatchObject({ family: "Satoshi", match: { kind: "none" }, deduced: true });
    expect(matcher.resolveStack("var(--font-heading)")).toBeNull();
    expect(matcher.resolveStack("inherit")).toBeNull();
    expect(matcher.resolveStack("--theme(--font-sans, initial)")).toBeNull();
  });

  it("a fuzzy family is marked as deduced", () => {
    expect(matcher.resolveStack(`"Plus Jakarta Snas", sans-serif`)).toMatchObject({ family: "Plus Jakarta Snas", match: { kind: "google", family: "Plus Jakarta Sans" }, deduced: true });
  });
});

describe("familyVariants", () => {
  it("cleans and splits PostScript and style names", () => {
    expect(familyVariants(`"Inter Variable"`)).toEqual({ display: "Inter Variable", variants: ["Inter Variable", "Inter"] });
    expect(familyVariants("IBMPlexSans-SemiBold").variants).toContain("IBM Plex Sans");
    expect(familyVariants("TimesNewRomanPSMT").variants).toContain("Times New Roman");
  });
});
