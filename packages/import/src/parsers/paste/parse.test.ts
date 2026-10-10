import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importBatch } from "../../batch";
import { detectFormat } from "../../detect";
import { IMPORT_LIMITS } from "../../limits";
import { createRegistry, type SniffedFile } from "../../registry";
import { pngHeader, utf8 } from "../../testing/fakes";
import type { ParseOutput } from "../../types";
import { cssParser } from "../css";
import { pasteParser } from "./index";
import { MAX_PASTED_COLORS, parse } from "./parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const sniff = (bytes: Uint8Array, name: string, pasted = false): SniffedFile => ({
  name,
  extension: name.includes(".") ? (name.split(".").pop() ?? "") : "",
  bytes,
  detected: detectFormat(bytes, name, { pasted }),
  pasted,
  text: new TextDecoder().decode(bytes),
});

async function parsePaste(text: string, name = "paste"): Promise<ParseOutput> {
  const bytes = utf8(text);
  const detected = detectFormat(bytes, name, { pasted: true });
  return parse({ name, extension: "", bytes, text, detected, pasted: true, sourceId: "paste-test", format: detected.format, ownership: "own" }, { limits: IMPORT_LIMITS, batch: [] });
}

const summary = (out: ParseOutput) => (out.colors ?? []).map((c) => [c.name, c.value, c.role, c.mode, c.confidence]);

// Registration contract.
describe("paste parser", () => {
  it("claims its format and nothing else", () => {
    expect(pasteParser.id).toBe("paste");
    expect(pasteParser.version).toBe("1.0.0");
    expect(pasteParser.detect(sniff(utf8("Primary: #3A5BD9\nAccent: rgb(240 160 36)"), "colors.txt"))).toMatchObject({ format: "color-list" });
    const claimed = [utf8("%PDF-1.7"), pngHeader(10, 10), utf8(":root{--a:#fff}"), utf8('{"a":{"$value":"#fff"}}'), utf8("Inter\nGeist Mono")].filter((bytes) => pasteParser.detect(sniff(bytes, "x")) !== null);
    expect(claimed.length).toBeLessThanOrEqual(1);
  });

  it("loads its parse step lazily and never throws on empty input", async () => {
    const file = sniff(utf8(" "), "empty.txt");
    const output = await pasteParser.parse({ ...file, sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });

  it("takes a labeled list with one --variable line from the CSS parser; plain declarations stay CSS", () => {
    const registry = createRegistry([cssParser, pasteParser]);
    expect(registry.pick(sniff(utf8(fixture("labeled.txt")), "paste", true))?.parser.id).toBe("paste");
    expect(registry.pick(sniff(utf8("--primary: 222.2 47.4% 11.2%;\n--ring: #94a3b8;"), "paste", true))?.parser.id).toBe("css");
    expect(registry.pick(sniff(utf8(":root { --primary: #3a5bd9; }\nPrimary: #3a5bd9"), "paste", true))?.parser.id).toBe("css");
  });
});

describe("labeled lines", () => {
  it("names, roles (medium), CSS and SCSS variables, quoted hex and named colors as values", async () => {
    const out = await parsePaste(fixture("labeled.txt"), "brisa.txt");
    expect(out.format).toBe("color-list");
    expect(summary(out)).toEqual([
      ["Primary", "#3a5bd9", "primary", undefined, "medium"],
      ["Accent", "rgb(240 160 36)", "cta", undefined, "medium"],
      ["Background", "#fafaf7", "background", undefined, "medium"],
      ["Text", "oklch(0.21 0.02 264)", "foreground", undefined, "medium"],
      ["Border", "hsl(220 14% 90% / 0.6)", "border", undefined, "medium"],
      ["--brand-secondary", "#7c3aed", "secondary", undefined, "medium"],
      ["$danger", "#e5484d", "destructive", undefined, "medium"],
      ["success", "#2f9e44", "success", undefined, "medium"],
      ["Ocean 500", "lab(52% -10 -30)", undefined, undefined, "high"],
      ["Highlight", "rebeccapurple", "cta", undefined, "medium"],
      ["Fallback", "transparent", undefined, undefined, "high"],
      ["Background", "#0b0d12", "background", "dark", "medium"],
      ["Text", "#ecedee", "foreground", "dark", "medium"],
    ]);
    expect(out.colors?.[8]?.scale).toEqual({ group: "ocean", step: 500 });
    expect(out.colors?.[0]?.locator).toBe("brisa.txt:3 Primary");
  });

  it("Spanish labels and CSV rows", async () => {
    const out = await parsePaste(fixture("spanish.txt"));
    expect(summary(out)).toEqual([
      ["Primario", "#c2410c", "primary", undefined, "medium"],
      ["Secundario", "#0e7490", "secondary", undefined, "medium"],
      ["Fondo", "#fffbf5", "background", undefined, "medium"],
      ["Texto", "#1c1917", "foreground", undefined, "medium"],
      ["Fondo oscuro", "#1c1917", "background", "dark", "medium"],
      ["Borde", "#e7e5e4", "border", undefined, "medium"],
    ]);
  });

  it("labels after the color, several per line, and prose words are never colors", async () => {
    const out = await parsePaste("#3A5BD9 Primary\nPrimary: #3A5BD9, Accent: #F0A024\nThis is a red flag for navy teams\nFixes the blue button");
    expect(summary(out)).toEqual([
      ["Primary", "#3a5bd9", "primary", undefined, "medium"],
      ["Accent", "#f0a024", "cta", undefined, "medium"],
    ]);
  });
});

describe("unlabeled colors and Coolors", () => {
  it("values are high confidence; the first chromatic one is the primary candidate (low)", async () => {
    const out = await parsePaste(fixture("unlabeled.txt"));
    expect(summary(out)).toEqual([
      [undefined, "#ffffff", undefined, undefined, "high"],
      [undefined, "#f4f4f5", undefined, undefined, "high"],
      [undefined, "#3a5bd9", "primary", undefined, "low"],
      [undefined, "#111827", undefined, undefined, "high"],
      [undefined, "rgba(17, 24, 39, .5)", undefined, undefined, "high"],
      [undefined, "hsl(25 95% 53%)", undefined, undefined, "high"],
    ]);
  });

  it("reads Coolors URLs and palette slugs without fetching them, in order", async () => {
    const out = await parsePaste(fixture("coolors.txt"));
    expect(out.format).toBe("coolors");
    expect(out.colors?.map((c) => c.value)).toEqual(["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"]);
    expect(out.colors?.[0]).toMatchObject({ role: "primary", confidence: "low", locator: "paste:1 coolors #1" });
    const slug = await parsePaste("264653-2a9d8f-e9c46a");
    expect(slug.colors?.map((c) => c.value)).toEqual(["#264653", "#2a9d8f", "#e9c46a"]);
    const bare = await parsePaste("264653 and 2a9d8f are numbers here\ndecade facade");
    expect(bare.colors).toBeUndefined();
  });

  it("var(), color-mix() and relative colors are reported, not guessed", async () => {
    const out = await parsePaste("Brand: var(--brand)\nTint: color-mix(in oklab, #3a5bd9 20%, white)\nShade: oklch(from #3a5bd9 calc(l - 0.1) c h)");
    expect(out.colors).toBeUndefined();
    expect(out.unresolved?.map((u) => u.path)).toEqual(["Brand", "Tint", "Shade"]);
  });

  it(`keeps the first ${MAX_PASTED_COLORS} colors and says so`, async () => {
    const lines = Array.from({ length: 80 }, (_, i) => `#${(0x100000 + i * 997).toString(16).slice(-6)}`).join("\n");
    const out = await parsePaste(lines);
    expect(out.colors).toHaveLength(MAX_PASTED_COLORS);
    expect(out.warnings).toContainEqual({ code: "too-many-tokens", detail: `80 colors, kept ${MAX_PASTED_COLORS}` });
  });

  it("survives huge and hostile input", async () => {
    const out = await parsePaste(`${"(".repeat(50_000)}#3a5bd9\n${"#".repeat(30_000)}\nrgb(${"1 ".repeat(5000)})`);
    expect(out.warnings).toContainEqual({ code: "line-truncated", detail: "3" });
    expect(out).toBeTypeOf("object");
  });
});

describe("in a batch", () => {
  it("a paste becomes colors with alpha and roles", async () => {
    const brand = await importBatch([{ name: "", bytes: utf8("Primary: #3A5BD9\nBorder (dark): oklch(1 0 0 / 10%)\nAccent: rgb(240 160 36)"), pasted: true }], { ownership: "own" });
    expect(brand.sources[0]).toMatchObject({ kind: "paste", format: "color-list", parser: "paste@1.0.0", fileName: "paste" });
    expect(brand.colors.map((c) => [c.role, c.hex, c.alpha, c.mode])).toEqual([
      ["primary", "#3a5bd9", undefined, undefined],
      ["border", "#ffffff", 0.1, "dark"],
      ["cta", "#f0a024", undefined, undefined],
    ]);
  });
});
