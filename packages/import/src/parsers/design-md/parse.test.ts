import { createDesignDoc, resolveExport, toDesignMd, type DesignDoc } from "@dialmade/doc";
import { ROLE_KEYS, cssVarName } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { importBatch } from "../../batch";
import { deltaE, normalizeColor } from "../../color";
import type { FontMatcher } from "../../fonts";
import { effectiveMode } from "../../merge";
import { utf8 } from "../../testing/fakes";
import type { ParsedColor } from "../../types";
import { fixture, parseOne, sniff } from "../tokens/testing";
import { designMdParser } from "./index";
import type { DesignMdParseOutput } from "./parse";

const read = (rel: string) => fixture(new URL(".", import.meta.url), rel);
const parseMd = (text: string, name = "DESIGN.md") => parseOne(designMdParser, name, text) as Promise<DesignMdParseOutput>;
const hexOf = (c: ParsedColor | undefined) => {
  const n = c && normalizeColor(c.value);
  return n?.ok ? `${n.color.hex}${n.color.alpha !== undefined ? `@${n.color.alpha}` : ""}` : undefined;
};
const NOW = "2026-10-10T09:00:00.000Z";

describe("design-md parser: registration", () => {
  it("claims DESIGN.md and nothing else", () => {
    expect(designMdParser).toMatchObject({ id: "design-md", kind: "design-md", version: "1.0.0" });
    expect(designMdParser.detect(sniff('---\ncolors:\n  primary: "#3a5bd9"\n---\n\n## Overview\n', "DESIGN.md"))).toMatchObject({ format: "design-md" });
    const others = [sniff("%PDF-1.7", "x"), sniff(":root{--a:#fff}", "x"), sniff('{"a":{"$value":"#fff"}}', "x"), sniff("Inter\nGeist Mono", "x")];
    expect(others.filter((f) => designMdParser.detect(f) !== null)).toHaveLength(0);
  });

  it("never throws on empty input", async () => {
    expect(await parseMd(" ")).toEqual({ warnings: [{ code: "empty-file" }] });
    const output = await designMdParser.parse({ ...sniff(" ", "empty.txt"), sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });
});

describe("design-md parser: front matter", () => {
  it("reads colors with references, roles from names and scales", async () => {
    const out = await parseMd(read("brisa.DESIGN.md"));
    expect(out.format).toBe("design-md");
    const byRole = (role: string) => out.colors?.find((c) => c.role === role);
    expect(byRole("background")).toMatchObject({ name: "colors.background", value: "#f7f3ea", confidence: "high", locator: "DESIGN.md:10 colors.background" });
    expect(hexOf(byRole("foreground"))).toBe("#1b2560");
    expect(hexOf(byRole("border"))).toBe("#1b2560@0.12");
    expect(out.colors?.filter((c) => c.scale?.group === "ocean").map((c) => [c.scale!.step, c.value])).toEqual([
      [100, "#e0e8fc"],
      [500, "#3464d5"],
      [900, "#1b2560"],
    ]);
    expect(out.colors?.every((c) => c.mode === undefined)).toBe(true);
  });

  it("names roles from components: references take the role, literals come in as new colors", async () => {
    const out = await parseMd(read("brisa.DESIGN.md"));
    const byRole = (role: string) => out.colors?.find((c) => c.role === role);
    expect(byRole("primary")).toMatchObject({ name: "colors.ocean", value: "#3464d5", confidence: "medium" });
    expect(byRole("primaryForeground")).toMatchObject({ name: "components.button-primary.textColor", value: "#ffffff", confidence: "medium", locator: "DESIGN.md:51 components.button-primary.textColor" });
    expect(byRole("secondary")).toMatchObject({ name: "colors.coral" });
    expect(byRole("card")).toMatchObject({ value: "#ffffff" });
    expect(byRole("cardForeground")).toMatchObject({ name: "components.card.textColor", value: "#1b2560" });
    expect(byRole("input")).toMatchObject({ value: "rgb(27 37 96 / 12%)", confidence: "medium" });
    expect(out.system).toEqual([
      expect.objectContaining({ component: "button", key: "shape", value: "pill" }),
      expect.objectContaining({ component: "button", key: "weight", value: 500 }),
      expect.objectContaining({ component: "input", key: "shape", value: "rounded" }),
    ]);
  });

  it("reads typography, fonts, rounded and spacing", async () => {
    const out = await parseMd(read("brisa.DESIGN.md"));
    expect(out.typeScale?.map((t) => [t.name, t.fontSize?.px, t.weight, t.lineHeight, t.letterSpacing])).toEqual([
      ["headline-lg", 48, 600, 1.1, -0.02],
      ["body-md", 16, 400, 1.5, undefined],
      ["label-sm", 12, 500, undefined, undefined],
      ["caption", 12, 500, undefined, undefined],
      ["code", 14, undefined, undefined, undefined],
    ]);
    expect(out.fonts?.map((f) => [f.role, f.stack, f.weights, f.confidence])).toEqual([
      ["heading", "Brisa Grotesk", [600], "high"],
      ["body", "Inter", [400], "high"],
      ["mono", "Geist Mono", undefined, "high"],
    ]);
    expect(Object.entries(out.shape?.radii ?? {}).map(([k, d]) => [k, d.px, d.confidence])).toEqual([
      ["sm", 4, "high"],
      ["md", 8, "high"],
      ["lg", 12, "high"],
      ["full", 9999, "high"],
    ]);
    expect(Object.entries(out.spacing?.scale ?? {}).map(([k, d]) => [k, d.px])).toEqual([
      ["2xs", 2],
      ["xs", 4],
      ["sm", 8],
      ["md", 16],
      ["lg", 24],
    ]);
  });

  it("keeps the prose as notes, without the tables", async () => {
    const out = await parseMd(read("brisa.DESIGN.md"));
    expect(out.notes).toEqual([
      "Brisa: Calm tools for coastal teams.",
      "## Overview\n\nCalm, precise and coastal. Plenty of air; one accent per view.",
      "## Colors\n\n\nOcean is the brand color.",
      "## Do's and Don'ts\n\n- Do use ocean for the main action.\n- Don't put coral text on sand.",
    ]);
  });

  it("puts the colors in dark mode when the background is dark", async () => {
    const out = await parseMd('---\ncolors:\n  background: "#0b0f19"\n  foreground: "#f5f5f5"\n  primary: "#7aa2ff"\n  brand-500: "#3464d5"\n---\n');
    expect(out.colors?.filter((c) => c.role).every((c) => c.mode === "dark")).toBe(true);
    expect(out.colors?.find((c) => c.scale)?.mode).toBeUndefined();
    expect(out.warnings).toContainEqual({ code: "mode-inferred", detail: "dark" });
  });
});

describe("design-md parser: hostile and partial input", () => {
  it("stops YAML alias bombs at 50 aliases", async () => {
    const lines = ["---", 'a: &a ["x","x","x","x","x","x","x","x","x","x"]'];
    for (let i = 1; i < 9; i++) lines.push(`${String.fromCharCode(97 + i)}: &${String.fromCharCode(97 + i)} [${Array(10).fill(`*${String.fromCharCode(96 + i)}`).join(",")}]`);
    lines.push("colors:", '  primary: "#3464d5"', "---");
    const start = performance.now();
    const out = await parseMd(lines.join("\n"));
    expect(performance.now() - start).toBeLessThan(2000);
    expect(out.warnings?.[0]?.code).toBe("yaml-alias-limit");
    expect(out.colors).toBeUndefined();
  });

  it("reports duplicate keys and drops dangerous ones", async () => {
    const out = await parseMd('---\ncolors:\n  primary: "#111111"\n  primary: "#222222"\n  __proto__: "#333333"\n---\n');
    expect(out.warnings).toContainEqual({ code: "invalid-yaml", detail: "DUPLICATE_KEY line 4" });
    expect(out.warnings).toContainEqual({ code: "dangerous-key", detail: "/colors/__proto__" });
    expect(({} as Record<string, unknown>).constructor).toBe(Object);
  });

  it("reads a markdown file without front matter as notes only", async () => {
    const out = await parseMd("# Guía\n\n## Voz\n\nCercana y clara.\n", "guia.md");
    expect(out).toEqual({ format: "markdown", notes: ["## Voz\n\nCercana y clara."], warnings: [{ code: "no-front-matter" }] });
  });

  it("cuts megabyte lines before parsing", async () => {
    const out = await parseMd(`---\ncolors:\n  primary: "#3464d5"\n  long: "${"x".repeat(20_000)}"\n---\n`);
    expect(out.warnings?.[0]).toEqual({ code: "line-truncated", detail: "1" });
  });

  it("reports references it cannot resolve", async () => {
    const out = await parseMd('---\ncolors:\n  primary: "{colors.nope}"\n  a: "{colors.b}"\n  b: "{colors.a}"\n---\n');
    expect(out.unresolved?.map((u) => [u.path, u.reason.split(" at")[0]])).toEqual([
      ["DESIGN.md:3 colors.primary", "missing token {colors.nope}"],
      ["DESIGN.md:4 colors.a", "alias cycle"],
      ["DESIGN.md:5 colors.b", "alias cycle"],
    ]);
  });
});

describe("round trip: toDesignMd", () => {
  const fonts: FontMatcher = {
    match: () => ({ kind: "none" }),
    resolveStack: (stack) => {
      const family = (Array.isArray(stack) ? stack[0] : String(stack).split(",")[0])?.trim();
      return family ? { family, fallback: [], match: { kind: "none" } } : null;
    },
  };
  const brisa = (): DesignDoc =>
    createDesignDoc({
      brand: { name: "Brisa", seeds: { primary: "#3464d5", secondary: "#ef694a" } },
      brief: { productType: "saas-general", focus: "landing", locale: "es" },
      tokens: {
        radius: { md: 10 },
        typography: { heading: { family: "Brisa Grotesk", source: "local", weights: [600] }, body: { family: "Inter", source: "google", weights: [400] } },
      },
      provenance: { createdAt: NOW },
    });

  for (const mode of ["light", "dark"] as const) {
    it(`keeps every role (${mode}), the type scale, radii and spacing`, async () => {
      const doc = brisa();
      const t = resolveExport(doc)[mode];
      const brand = await importBatch([{ name: "DESIGN.md", bytes: utf8(toDesignMd(doc, { mode })) }], { ownership: "own", rightsConfirmedAt: NOW, fonts });
      expect(brand.sources[0]).toMatchObject({ kind: "design-md", format: "design-md", parser: "design-md@1.0.0" });
      for (const key of ROLE_KEYS) {
        const color = brand.colors.find((c) => c.role === key && effectiveMode(c) === mode && !c.overriddenBy);
        expect(color, key).toBeDefined();
        expect(deltaE(color!.hex, t.colors[cssVarName(key)]!), key).toBeLessThan(0.001);
      }
      expect(brand.fonts.map((f) => [f.role, f.family])).toEqual([
        ["heading", "Brisa Grotesk"],
        ["body", "Inter"],
      ]);
      for (const name of ["display", "h1", "h2", "h3", "body", "small", "caption"] as const) {
        expect(brand.typeScale?.find((s) => s.name === name)?.fontSize?.px, name).toBe(t.fontSizes[name].px);
      }
      for (const name of ["sm", "md", "lg", "xl"] as const) expect(brand.shape.radii?.[name]?.px).toBe(t.radius[name]);
      expect(Object.values(brand.spacing?.scale ?? {}).map((d) => d.px)).toEqual(t.space);
      expect(brand.notes.length).toBeGreaterThan(2);
    });
  }
});
