import { readFileSync } from "node:fs";
import { createDesignDoc, resolveExport, toThemeCss } from "@dialmade/doc";
import { PALETTE_STYLE_IDS, ROLE_KEYS, deltaEOK, generateTheme, hexToOklch, toCssVars, toGlobalsCss, type Oklch } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { importBatch, type ImportFile } from "../../batch";
import { oklabOf } from "../../color";
import { detectFormat } from "../../detect";
import { IMPORT_LIMITS } from "../../limits";
import type { ParserContext, SniffedFile } from "../../registry";
import { fakeParser, pngHeader, utf8 } from "../../testing/fakes";
import type { ImportedBrand, ImportedColor, Mode, ParseOutput } from "../../types";
import { cssParser } from "./index";
import { parse } from "./parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const sniff = (bytes: Uint8Array, name: string): SniffedFile => ({ name, extension: name.split(".").pop() ?? "", bytes, detected: detectFormat(bytes, name), pasted: false });
const ctx: ParserContext = { limits: IMPORT_LIMITS, batch: [] };

async function parseCss(text: string, name = "globals.css"): Promise<ParseOutput> {
  const bytes = utf8(text);
  const detected = detectFormat(bytes, name);
  return parse({ name, extension: "css", bytes, text, detected, pasted: false, sourceId: "css-test", format: detected.format, ownership: "own" }, ctx);
}

/** next/font layouts are read by the fonts parser; a stand-in keeps them in the batch. */
const layoutParser = fakeParser("fonts", "font-name", {});

const importCss = (files: ImportFile[]): Promise<ImportedBrand> => importBatch(files, { ownership: "own", parsers: [cssParser, layoutParser] });
const file = (name: string, text = fixture(name)): ImportFile => ({ name, bytes: utf8(text) });

const role = (brand: ImportedBrand, key: string, mode: Mode = "light"): ImportedColor | undefined =>
  brand.colors.find((c) => c.role === key && (c.mode ?? "light") === mode && !c.overriddenBy);
const tokenOf = (c: ImportedColor) => (c.alpha === undefined ? c.hex : `${c.hex}${Math.round(c.alpha * 255).toString(16).padStart(2, "0")}`);
const deltaE = (a: Oklch, b: Oklch) => deltaEOK(oklabOf(a), oklabOf(b));

// Registration contract.
describe("css parser", () => {
  it("claims its format and nothing else", () => {
    expect(cssParser.id).toBe("css");
    expect(cssParser.version).toBe("1.0.0");
    expect(cssParser.detect(sniff(utf8(":root { --popover: oklch(1 0 0); --card-foreground: oklch(0.1 0 0); --border: oklch(1 0 0 / 10%); }"), "globals.css"))).toMatchObject({ format: "shadcn-oklch" });
    const claimed = [utf8("%PDF-1.7"), pngHeader(10, 10), utf8(":root{--a:#fff}"), utf8('{"a":{"$value":"#fff"}}'), utf8("Inter\nGeist Mono")].filter((bytes) => cssParser.detect(sniff(bytes, "x")) !== null);
    expect(claimed.length).toBeLessThanOrEqual(1);
  });

  it("loads its parse step lazily and never throws on empty input", async () => {
    const file = sniff(utf8(" "), "empty.txt");
    const output = await cssParser.parse({ ...file, sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });
});

describe("shadcn (current, oklch)", () => {
  it("reads every role in :root and .dark, keeping the alpha of the dark border and input", async () => {
    const brand = await importCss([file("shadcn-oklch.css")]);
    expect(brand.sources[0]).toMatchObject({ format: "shadcn-oklch", parser: "css@1.0.0" });
    expect(brand.unresolved).toEqual([]);
    for (const key of ["background", "foreground", "card", "popover", "primary", "secondary", "muted", "accent", "destructive", "border", "input", "ring", "chart1", "chart5"]) {
      expect(role(brand, key, "light"), `light ${key}`).toBeDefined();
      expect(role(brand, key, "dark"), `dark ${key}`).toBeDefined();
    }
    expect(role(brand, "border", "dark")).toMatchObject({ hex: "#ffffff", alpha: 0.1, confidence: "exact", locator: "shadcn-oklch.css:98 --border" });
    expect(role(brand, "input", "dark")).toMatchObject({ hex: "#ffffff", alpha: 0.15 });
    expect(role(brand, "border", "light")?.alpha).toBeUndefined();
    expect(role(brand, "accent", "light")?.role).toBe("accent");
    expect(brand.colors.some((c) => c.role === "cta")).toBe(false);
  });

  it("marks what is still shadcn's default, but not the brand's primary", async () => {
    const brand = await importCss([file("shadcn-oklch.css")]);
    expect(role(brand, "primary")?.isFrameworkDefault).toBeUndefined();
    expect(role(brand, "background")?.isFrameworkDefault).toBe(true);
    expect(role(brand, "border", "dark")?.isFrameworkDefault).toBe(true);
  });

  it("the @theme inline aliases add nothing; the radius scale is computed from --radius", async () => {
    const out = await parseCss(fixture("shadcn-oklch.css"));
    expect(out.colors?.filter((c) => c.name?.startsWith("--color-"))).toEqual([]);
    expect(out.shape?.radius).toMatchObject({ value: 0.625, unit: "rem", px: 10, assumed: true });
    expect(Object.fromEntries(Object.entries(out.shape?.radii ?? {}).map(([k, v]) => [k, v.px]))).toEqual({ sm: 6, md: 8, lg: 10, xl: 14 });
  });

  it("fonts come from next/font variables: Geist and Geist Mono, deduced (medium)", async () => {
    const brand = await importCss([file("shadcn-oklch.css")]);
    expect(brand.fonts.map((f) => [f.role, f.family, f.match.kind, f.confidence])).toEqual([
      ["body", "Geist", "google", "medium"],
      ["mono", "Geist Mono", "google", "medium"],
    ]);
  });
});

describe("shadcn (legacy HSL channels)", () => {
  it("wraps bare channels in hsl() because the format is shadcn-hsl", async () => {
    const brand = await importCss([file("shadcn-hsl.css")]);
    expect(brand.sources[0]?.format).toBe("shadcn-hsl");
    expect(role(brand, "primary")).toMatchObject({ hex: "#7c3aed", confidence: "exact" });
    expect(role(brand, "foreground")?.hex).toBe("#020817");
    expect(role(brand, "destructive", "dark")?.hex).toBe("#7f1d1d");
    expect(role(brand, "destructiveForeground", "light")).toBeDefined();
    expect(brand.shape.radius).toMatchObject({ px: 8 });
  });

  it("a pasted fragment of shadcn role variables in channels is shadcn-hsl too", async () => {
    const out = await parseCss("--background: 0 0% 100%;\n--foreground: 222.2 84% 4.9%;\n--primary: 262.1 83.3% 57.8%;\n--radius: 0.5rem;", "paste");
    expect(out.format).toBe("shadcn-hsl");
    expect(out.colors?.map((c) => [c.role, c.value])).toEqual([
      ["background", "hsl(0 0% 100%)"],
      ["foreground", "hsl(222.2 84% 4.9%)"],
      ["primary", "hsl(262.1 83.3% 57.8%)"],
    ]);
  });

  it("the same channels in any other CSS are not colors", async () => {
    const out = await parseCss(":root { --brand-hue: 262.1 83.3% 57.8%; --primary: #7c3aed; }", "vars.css");
    expect(out.format).toBe("css");
    expect(out.colors?.map((c) => c.value)).toEqual(["#7c3aed"]);
  });
});

describe("Tailwind v4 @theme", () => {
  it("scales without a mode, roles from names, fonts by role", async () => {
    const out = await parseCss(fixture("tailwind-v4.css"), "app.css");
    expect(out.format).toBe("tailwind-v4");
    const scale = out.colors?.filter((c) => c.scale?.group === "vereda") ?? [];
    expect(scale.map((c) => c.scale?.step)).toEqual([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
    expect(scale.every((c) => c.mode === undefined && c.confidence === "exact")).toBe(true);
    expect(out.colors?.find((c) => c.name === "--color-brand")).toMatchObject({ role: "primary", value: "oklch(0.53 0.17 150)", confidence: "medium" });
    expect(out.colors?.find((c) => c.name === "--color-cta")).toMatchObject({ role: "cta" });
    expect(out.colors?.some((c) => c.name === "--color-white")).toBe(false);
    expect(out.colors?.filter((c) => c.name === "--surface").map((c) => [c.mode, c.role])).toEqual([
      ["light", "card"],
      ["dark", "card"],
    ]);
    expect(out.fonts?.map((f) => [f.role, f.stack, f.confidence])).toEqual([
      ["heading", '"Satoshi", ui-sans-serif, sans-serif', "high"],
      ["body", '"Inter", ui-sans-serif, system-ui, sans-serif', "high"],
      ["mono", '"JetBrains Mono", ui-monospace, monospace', "exact"],
    ]);
  });

  it("type scale with its line height (unitless), tracking (em) and weight; Tailwind defaults left out", async () => {
    const out = await parseCss(fixture("tailwind-v4.css"), "app.css");
    expect(out.typeScale?.map((t) => [t.name, t.step, t.fontSize?.px, t.lineHeight, t.letterSpacing, t.weight])).toEqual([
      ["--text-display", "display", 64, 1, -0.04, 700],
      ["--text-h1", "h1", 48, 1.1, -0.02, 700],
      ["--text-body", "body", 16, 1.5, undefined, undefined],
      ["--leading-snug", undefined, undefined, 1.3, undefined, undefined],
    ]);
  });

  it("shape and spacing, with calc() on lengths", async () => {
    const out = await parseCss(fixture("tailwind-v4.css"), "app.css");
    expect(Object.fromEntries(Object.entries(out.shape?.radii ?? {}).map(([k, v]) => [k, v.px]))).toEqual({ md: 8, lg: 14, xl: 18, full: 9999 });
    expect(out.shape?.radii?.xl).toMatchObject({ unit: "px", assumed: true });
    expect(out.shape?.borderWidth).toMatchObject({ px: 1.5, unit: "px" });
    expect(out.spacing?.base).toMatchObject({ value: 0.3, unit: "rem", px: 4.8 });
    expect(out.shape?.shadows?.map((s) => [s.name, s.layers.length])).toEqual([
      ["sm", 1],
      ["md", 2],
      ["glow", 2],
    ]);
    expect(out.shape?.shadows?.[2]?.layers[0]).toEqual({ x: 0, y: 0, blur: 0, spread: 1, color: "oklch(0.71 0.16 150)", alpha: 1 });
  });

  it("color-mix(), light-dark() and relative colors go to unresolved", async () => {
    const out = await parseCss(fixture("tailwind-v4.css"), "app.css");
    expect(out.unresolved).toEqual([
      { path: "--color-tint", reason: "color-mix() is not evaluated" },
      { path: "--color-adaptive", reason: "light-dark() is not evaluated" },
      { path: "--color-relative", reason: "relative color is not evaluated" },
    ]);
  });
});

describe("compiled CSS", () => {
  it("Tailwind v4 output: theme variables in :root,:host, fonts from preflight, framework stacks skipped", async () => {
    const out = await parseCss(fixture("tailwind-compiled.css"), "styles.css");
    expect(out.format).toBe("css-compiled");
    expect(out.colors?.filter((c) => c.scale?.group === "ember").map((c) => c.value)).toEqual(["#d9480f", "#b93d0c"]);
    expect(out.fonts?.map((f) => [f.role, f.stack])).toEqual([["body", '"Lora",ui-serif,serif']]);
  });

  it("a site without variables: body colors and fonts, then its most used colors (low confidence)", async () => {
    const out = await parseCss(fixture("site-compiled.css"), "site.css");
    const byRole = Object.fromEntries((out.colors ?? []).filter((c) => c.role).map((c) => [c.role, [c.value, c.confidence]]));
    expect(byRole).toEqual({ background: ["#fbfaf7", "high"], foreground: ["#1f2430", "high"], primaryText: ["#d9480f", "medium"] });
    const literals = (out.colors ?? []).filter((c) => !c.role);
    expect(literals[0]).toMatchObject({ value: "#b93d0c", confidence: "low", locator: "site.css:6 border" });
    expect(literals.every((c) => c.confidence === "low")).toBe(true);
    expect(out.fonts?.map((f) => [f.role, f.stack, f.weights])).toEqual([
      ["heading", '"Work Sans",Arial,sans-serif', [700]],
      ["body", '"Lora",Georgia,"Times New Roman",serif', undefined],
      ["mono", '"IBM Plex Mono",Menlo,monospace', undefined],
    ]);
  });
});

describe("Dialmade's own globals.css (+ layout.tsx)", () => {
  it("with the layout: Inter body and Geist Mono mono from next/font, the SF stack as fallback", async () => {
    const brand = await importCss([file("dialmade-globals.css", fixture("dialmade-globals.css")), file("layout.tsx", fixture("dialmade-layout.tsx.txt"))]);
    const body = brand.fonts.find((f) => f.role === "body" && !f.overriddenBy);
    const mono = brand.fonts.find((f) => f.role === "mono" && !f.overriddenBy);
    expect(body).toMatchObject({ family: "Inter", match: { kind: "google", family: "Inter" }, confidence: "high" });
    expect(body?.fallback).toEqual(["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "SF Pro Text", "system-ui", "sans-serif"]);
    expect(mono).toMatchObject({ family: "Geist Mono", match: { kind: "google" }, fallback: ["ui-monospace", "SF Mono", "JetBrains Mono", "monospace"] });
  });

  it("without it: the same fonts, deduced from var(--font-inter) with medium confidence", async () => {
    const brand = await importCss([file("dialmade-globals.css")]);
    const body = brand.fonts.find((f) => f.role === "body");
    expect(body).toMatchObject({ family: "Inter", confidence: "medium", match: { kind: "google" } });
    expect(body?.fallback[0]).toBe("-apple-system");
    expect(brand.fonts.find((f) => f.role === "mono")).toMatchObject({ family: "Geist Mono", confidence: "medium" });
  });

  it("a dark-only theme (color-scheme: dark), alpha kept, roles behind the --app- prefix", async () => {
    const brand = await importCss([file("dialmade-globals.css")]);
    expect(role(brand, "background", "dark")).toMatchObject({ name: "--app-bg", confidence: "medium" });
    expect(role(brand, "border", "dark")).toMatchObject({ hex: "#ffffff", alpha: 0.08 });
    expect(role(brand, "background", "light")).toBeUndefined();
    expect(brand.colors.find((c) => c.name === "--app-glow-white")).toMatchObject({ alpha: 0.1, mode: "dark" });
    expect(brand.colors.find((c) => c.name === "--app-overlay")?.alpha).toBe(0.72);
  });

  it("its type scale and named radii", async () => {
    const out = await parseCss(fixture("dialmade-globals.css"));
    const h1 = out.typeScale?.find((t) => t.name === "--text-h1");
    expect(h1).toMatchObject({ step: "h1", fontSize: { px: 40 }, lineHeight: 1.1, letterSpacing: -0.03, weight: 600 });
    expect(out.typeScale?.find((t) => t.name === "--text-small")).toMatchObject({ step: "small", weight: 450, letterSpacing: 0 });
    expect(Object.keys(out.shape?.radii ?? {})).toEqual(["chip", "control", "card", "panel"]);
    expect(out.colors?.some((c) => /^\d+$/.test(c.value))).toBe(false);
    expect(out.shape?.shadows?.map((s) => s.name)).toEqual(["surface", "lift", "glow-white", "glow-purple"]);
  });
});

describe("var() resolution", () => {
  it("resolves across the batch, with fallbacks", async () => {
    const brand = await importCss([
      file("tokens.css", ":root { --brand-600: #2f4fd0; }"),
      file("globals.css", ":root { --primary: var(--brand-600); --ring: var(--missing, #94a3b8); }"),
    ]);
    const primary = role(brand, "primary");
    expect(primary?.hex).toBe("#2f4fd0");
    expect([primary?.locator, ...(primary?.also ?? []).map((p) => p.locator)]).toContain("globals.css:1 --primary");
    expect(role(brand, "ring")?.hex).toBe("#94a3b8");
  });

  it("reports cycles, undefined variables and chains over 32 hops", async () => {
    const chain = Array.from({ length: 40 }, (_, i) => `--c${i}: var(--c${i + 1});`).join(" ");
    const out = await parseCss(`:root { --primary: var(--secondary); --secondary: var(--primary); --ring: var(--nope); --border: var(--c0); ${chain} --c40: #fff; }`);
    const reasons = Object.fromEntries((out.unresolved ?? []).map((u) => [u.path, u.reason]));
    expect(reasons["--primary"]).toMatch(/^var\(\) cycle/);
    expect(reasons["--ring"]).toBe("undefined variable --nope");
    expect(reasons["--border"]).toBe("more than 32 var() hops");
  });

  it("a .dark value never leaks into light; :root values apply under .dark", async () => {
    const out = await parseCss(":root { --ocean: #3a5bd9; } .dark { --primary: var(--ocean); } :root { --primary: #111111; }");
    expect(out.colors?.filter((c) => c.role === "primary").map((c) => [c.mode, c.value])).toEqual([
      ["dark", "#3a5bd9"],
      ["light", "#111111"],
    ]);
  });
});

describe("cascade", () => {
  it("the last declaration of a variable wins (!important first); the surest name keeps a role", async () => {
    const out = await parseCss(
      ":root { --primary: #111111 !important; --ring: #222222; } :root { --primary: #3a5bd9; --ring: #333333; --brand: #ff00aa; }",
    );
    expect(out.colors?.map((c) => [c.name, c.value, c.role ?? null, c.confidence])).toEqual([
      ["--primary", "#111111", "primary", "exact"],
      ["--ring", "#333333", "ring", "exact"],
      ["--brand", "#ff00aa", null, "exact"],
    ]);
  });
});

describe("modes", () => {
  it("prefers-color-scheme, data attributes and :not(.dark)", async () => {
    const out = await parseCss(
      [
        ":root:not(.dark) { --background: #ffffff; }",
        "@media (prefers-color-scheme: dark) { :root { --background: #0b0b0f; } }",
        '[data-theme="dark"] { --primary: #93a8ff; }',
        "html.light { --primary: #3a5bd9; }",
        "@media (min-width: 768px) { :root { --primary: #ff0000; } }",
        ".card { --primary: #00ff00; &.dark { --primary: #0000ff; } }",
      ].join("\n"),
    );
    expect(out.colors?.map((c) => [c.role, c.mode, c.value])).toEqual([
      ["background", "light", "#ffffff"],
      ["background", "dark", "#0b0b0f"],
      ["primary", "dark", "#93a8ff"],
      ["primary", "light", "#3a5bd9"],
    ]);
  });

  it("calc() inside a color is reported", async () => {
    const out = await parseCss(":root { --primary: oklch(calc(0.5 + 0.1) 0.2 264); }");
    expect(out.unresolved).toEqual([{ path: "--primary", reason: "calc() inside a color is not evaluated" }]);
  });
});

describe("robustness", () => {
  it("non-colors and transparency are reported by the core, not imported", async () => {
    const brand = await importCss([file("g.css", ":root { --ring: transparent; --accent: currentColor; --primary: #3a5bd9; }")]);
    expect(brand.colors.map((c) => c.role)).toEqual(["primary"]);
    expect(brand.warnings.filter((w) => w.code === "non-color").map((w) => w.detail)).toEqual(["--ring", "--accent"]);
  });

  it("comments inside values are ignored", async () => {
    const out = await parseCss(":root { --primary: /* brand */ #3a5bd9 /* 600 */; }");
    expect(out.colors?.map((c) => c.value)).toEqual(["#3a5bd9"]);
  });

  it("never follows @import or url()", async () => {
    const out = await parseCss(`@import url("https://example.invalid/theme.css"); :root { --primary: #3a5bd9; --bg-image: url("https://example.invalid/x.png"); }`);
    expect(out.colors?.map((c) => c.value)).toEqual(["#3a5bd9"]);
    expect(out.unresolved).toBeUndefined();
  });

  it("recovers from truncated or broken files", async () => {
    const out = await parseCss(":root {\n  --primary: #3a5bd9;\n  --secondary: #f0a024;\n  --ring: 'unclosed");
    expect(out.colors?.map((c) => c.name)).toEqual(["--primary", "--secondary"]);
    expect(out.warnings?.[0]).toMatchObject({ code: "parse-error" });
    const stray = await parseCss(":root { --primary: #3a5bd9; } } .dark { --primary: #93a8ff; }");
    expect(stray.colors?.map((c) => c.mode)).toEqual(["light", "dark"]);
  });

  it("hostile values stay linear", async () => {
    const start = performance.now();
    await parseCss(`:root { --primary: ${"1".repeat(9000)}x; --ring: ${"1".repeat(9000)} 5% 5%x; --radius: calc(${"(".repeat(4000)}1px); }`);
    const chain = Array.from({ length: 60 }, (_, i) => `--v${i}: var(--v${i + 1}) var(--v${i + 1});`).join("\n");
    const out = await parseCss(`:root {\n${chain}\n--v60: #fff;\n--primary: var(--v0);\n}`);
    expect(out.unresolved?.find((u) => u.path === "--primary")?.reason).toMatch(/too long|more than 32/);
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it("minified CSS is read whole: a role after the first 10,000 characters is kept", async () => {
    const prefix = Array.from({ length: 1000 }, (_, i) => `--tw-x${i}:${i}px`).join(";");
    expect(prefix.length).toBeGreaterThan(IMPORT_LIMITS.maxLineLength);
    const out = await parseCss(`@layer theme{:root{${prefix}}}:root{--background:#fff;--primary:#3a5bd9}.dark{--primary:#93a8ff}`);
    expect(out.colors?.filter((c) => c.role === "primary").map((c) => [c.value, c.mode])).toEqual([
      ["#3a5bd9", "light"],
      ["#93a8ff", "dark"],
    ]);
    const broken = await parseCss(`:root{${prefix};--x:'a';--primary:#3a5bd9;}}.dark{--primary:#93a8ff}`);
    expect(broken.colors?.map((c) => c.value)).toEqual(["#3a5bd9", "#93a8ff"]);
  });

  it("a dark :root without .dark or color-scheme is a dark guide", async () => {
    const out = await parseCss(":root { --background: #1d2a24; --foreground: #f1f5f2; --primary: #3a5bd9; }");
    expect(out.colors?.map((c) => c.mode)).toEqual(["dark", "dark", "dark"]);
    expect(out.warnings).toContainEqual({ code: "mode-inferred", detail: "dark" });
    const light = await parseCss(":root { --background: #fbfbf9; --primary: #3a5bd9; }");
    expect(light.colors?.map((c) => c.mode)).toEqual(["light", "light"]);
  });

  it("deep nesting, huge lines and odd names do not throw", async () => {
    const deep = await parseCss(`${"a{".repeat(10_000)}--x:1px${"}".repeat(10_000)}`);
    expect(deep).toBeTypeOf("object");
    const long = await parseCss(`:root { --primary: #3a5bd9; --junk: ${"x".repeat(20_000)}; }`);
    expect(long.warnings).toContainEqual({ code: "line-truncated", detail: "1" });
    const odd = await parseCss(":root { --__proto__: #fff; --radius-constructor: 4px; --primary: #3a5bd9; }");
    expect(odd.shape?.radii?.constructor).toMatchObject({ px: 4 });
    expect(Object.getPrototypeOf(odd.shape?.radii)).toBe(Object.prototype);
  });
});

describe("round trip with our exporters", () => {
  const seeds = ["#3a5bd9", "#e11d48", "#0f766e", "#171717", "#f59e0b"];

  it("toGlobalsCss → import gives every role back (ΔEok < 0.001, alpha kept)", async () => {
    for (const [i, primary] of seeds.entries()) {
      const style = PALETTE_STYLE_IDS[i % PALETTE_STYLE_IDS.length]!;
      const theme = generateTheme({ primary, style, pinned: { dark: { border: "oklch(1 0 0 / 10%)", input: "oklch(1 0 0 / 15%)" } } });
      const brand = await importCss([file("globals.css", toGlobalsCss(theme))]);
      for (const mode of ["light", "dark"] as const) {
        for (const key of ROLE_KEYS) {
          const got = role(brand, key, mode);
          const want = theme[mode][key];
          expect(got, `${primary} ${style} ${mode} ${key}`).toBeDefined();
          expect(deltaE(got!.oklch, hexToOklch(want.slice(0, 7))!)).toBeLessThan(0.001);
          expect(tokenOf(got!)).toBe(want);
        }
      }
      expect(role(brand, "border", "dark")?.alpha).toBe(0.1);
      const scale = brand.colors.filter((c) => c.scale?.group === "brand");
      expect(scale.map((c) => c.scale!.step).sort((a, b) => a - b)).toEqual(theme.scales.brand.map((s) => s.step));
    }
  });

  it("toCssVars in hex gives the same roles", async () => {
    const theme = generateTheme({ primary: "#3a5bd9", secondary: "#f0a024" });
    const brand = await importCss([file("vars.css", toCssVars(theme, { format: "hex" }))]);
    for (const key of ROLE_KEYS) expect(tokenOf(role(brand, key, "dark")!), key).toBe(theme.dark[key]);
  });

  it("toThemeCss (DesignDoc) gives radius, spacing, shadows, border and font sizes back", async () => {
    const doc = createDesignDoc({
      brand: { name: "Nimbo", seeds: { primary: "#3a5bd9" } },
      brief: { productType: "saas-general", locale: "en" },
      tokens: { radius: { md: 10 }, color: { light: {}, dark: { border: "#ffffff1a" } } },
      provenance: { createdAt: "2026-10-09T12:00:00.000Z" },
    });
    const { light } = resolveExport(doc);
    const brand = await importCss([file("theme.css", toThemeCss(doc))]);
    const radii = brand.shape.radii ?? {};
    for (const [key, px] of Object.entries(light.radius)) expect(radii[key]?.px, key).toBe(px);
    expect(Object.values(brand.spacing?.scale ?? {}).map((d) => d.px)).toEqual(light.space);
    expect(brand.shape.borderWidth?.px).toBe(light.borderWidth);
    for (const shadow of brand.shape.shadows ?? []) {
      const want = light.shadows[shadow.name as "sm" | "md" | "lg"];
      expect(shadow.layers.map(({ x, y, blur, spread, color, alpha }) => ({ x, y, blur, spread, color, alpha }))).toEqual(want);
    }
    for (const style of brand.typeScale ?? []) expect(style.fontSize?.px, style.name).toBe(light.fontSizes[style.step!].px);
    expect(role(brand, "border", "dark")).toMatchObject({ hex: "#ffffff", alpha: 0.1 });
    expect(brand.fonts.find((f) => f.role === "heading")).toMatchObject({ family: "Inter", match: { kind: "google" } });
  });
});
