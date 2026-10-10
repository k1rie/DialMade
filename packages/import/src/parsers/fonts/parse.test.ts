import { describe, expect, it } from "vitest";
import { importBatch, type ImportFile } from "../../batch";
import { detectFormat } from "../../detect";
import type { SniffedFile } from "../../registry";
import { pngHeader, utf8 } from "../../testing/fakes";
import type { ImportedBrand } from "../../types";
import { fontsParser } from "./index";

const sniff = (bytes: Uint8Array, name: string): SniffedFile => ({ name, extension: name.split(".").pop() ?? "", bytes, detected: detectFormat(bytes, name), pasted: false });

// Registration contract; the parser's own tests go next to its implementation.
describe("fonts parser", () => {
  it("claims its format and nothing else", () => {
    expect(fontsParser.id).toBe("fonts");
    expect(fontsParser.detect(sniff(utf8('import { Inter } from "next/font/google";'), "layout.tsx"))).toMatchObject({ format: "next-font" });
    const claimed = [utf8("%PDF-1.7"), pngHeader(10, 10), utf8(":root{--a:#fff}"), utf8('{"a":{"$value":"#fff"}}'), utf8("Inter\nGeist Mono")].filter((bytes) => fontsParser.detect(sniff(bytes, "x")) !== null);
    expect(claimed.length).toBeLessThanOrEqual(1);
  });

  it("loads its parse step lazily and never throws on empty input", async () => {
    const file = sniff(utf8(" "), "empty.txt");
    const output = await fontsParser.parse({ ...file, sourceId: "s-1", format: "x", ownership: "own" }, { limits: {} as never, batch: [] });
    expect(output).toBeTypeOf("object");
  });
});

describe("fonts parser: names and next/font", () => {
  const brandOf = (files: ImportFile[]) => importBatch(files, { ownership: "own" });
  const winner = (brand: ImportedBrand, role: string) => brand.fonts.find((f) => f.role === role && !f.overriddenBy);

  it("a .txt of families: body by default, aliases and free alternatives", async () => {
    const brand = await brandOf([{ name: "fonts.txt", bytes: utf8("Inter\nSource Sans Pro\nArial") }]);
    expect(brand.sources[0]).toMatchObject({ kind: "font-name", format: "font-names", parser: "fonts@1.0.0" });
    expect(brand.warnings.some((w) => w.code === "parser-not-implemented")).toBe(false);
    expect(winner(brand, "body")).toMatchObject({ family: "Inter", match: { kind: "google", family: "Inter" } });
    const others = brand.fonts.filter((f) => f.overriddenBy).map((f) => [f.family, f.match.kind, f.match.family]);
    expect(others).toEqual([
      ["Source Sans Pro", "alias", "Source Sans 3"],
      ["Arial", "metric-compatible", "Arimo"],
    ]);
  });

  it("pasted names, comma-separated; mono from the name", async () => {
    const brand = await brandOf([{ name: "", bytes: utf8("Inter, Roboto Mono"), pasted: true }]);
    expect(brand.files[0]).toMatchObject({ status: "parsed", format: "font-names" });
    expect(winner(brand, "body")).toMatchObject({ family: "Inter", confidence: "medium", method: "named", locator: "línea 1 Inter" });
    expect(winner(brand, "mono")).toMatchObject({ family: "Roboto Mono", confidence: "high" });
  });

  it("labels set the role (es/en); a whole CSS stack stays one family", async () => {
    const brand = await brandOf([{ name: "", bytes: utf8("Títulos: Newsreader\nTexto: Inter, system-ui, sans-serif\nCode = JetBrains Mono"), pasted: true }]);
    expect(winner(brand, "heading")).toMatchObject({ family: "Newsreader", confidence: "high" });
    expect(winner(brand, "body")).toMatchObject({ family: "Inter", fallback: ["system-ui", "sans-serif"] });
    expect(winner(brand, "mono")).toMatchObject({ family: "JetBrains Mono" });
  });

  it("a layout.tsx with next/font: families, variables and weights, nothing executed", async () => {
    const layout = [
      'import { Inter, Geist_Mono, Newsreader as Display } from "next/font/google";',
      'const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "600"] });',
      'const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });',
      'const display = Display({ subsets: ["latin"], variable: "--font-heading" });',
    ].join("\n");
    const brand = await brandOf([{ name: "layout.tsx", bytes: utf8(layout) }]);
    expect(brand.sources[0]).toMatchObject({ format: "next-font" });
    expect(winner(brand, "body")).toMatchObject({ family: "Inter", weights: [400, 600], locator: "layout.tsx:2 --font-inter" });
    expect(winner(brand, "mono")).toMatchObject({ family: "Geist Mono", confidence: "exact" });
    expect(winner(brand, "heading")).toMatchObject({ family: "Newsreader", confidence: "exact" });
  });

  it("a file marked «Fuente por nombre» is read as names", async () => {
    const brand = await brandOf([{ name: "brand.css", bytes: utf8(":root { --x: 1px }\n"), role: "font" }]);
    expect(brand.sources[0]).toMatchObject({ kind: "font-name" });
    const named = await brandOf([{ name: "notes.txt", bytes: utf8("Lora\nIBM Plex Mono"), role: "font" }]);
    expect(winner(named, "body")).toMatchObject({ family: "Lora" });
    expect(winner(named, "mono")).toMatchObject({ family: "IBM Plex Mono" });
  });
});
