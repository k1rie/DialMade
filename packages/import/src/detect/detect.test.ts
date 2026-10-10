import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detectFormat, fileExtension } from "./detect";

const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const utf8 = (text: string) => new TextEncoder().encode(text);

function bytes(...parts: (number[] | string)[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") for (let i = 0; i < part.length; i++) out.push(part.charCodeAt(i));
    else out.push(...part);
  }
  return new Uint8Array(out);
}

const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const le16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
const le24 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff];

const png = (w: number, h: number) => bytes([0x89], "PNG\r\n\x1a\n", be32(13), "IHDR", be32(w), be32(h), [8, 6, 0, 0, 0]);
const jpeg = (w: number, h: number) =>
  bytes([0xff, 0xd8, 0xff, 0xe0], [0, 16], "JFIF\0", new Array(9).fill(0), [0xff, 0xc0, 0, 17, 8], [h >> 8, h & 0xff, w >> 8, w & 0xff], [3]);

describe("detectFormat: magic bytes", () => {
  it("reads image sizes from headers without decoding", () => {
    expect(detectFormat(png(1280, 800), "shot.png")).toMatchObject({ category: "image", format: "png", parserId: "screenshot", image: { width: 1280, height: 800 } });
    expect(detectFormat(jpeg(4000, 3000), "x")).toMatchObject({ format: "jpeg", mime: "image/jpeg", image: { width: 4000, height: 3000 } });
    expect(detectFormat(bytes("GIF89a", le16(320), le16(200), [0, 0, 0]), "a.gif")).toMatchObject({ format: "gif", image: { width: 320, height: 200 } });
    const vp8x = bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8X", be32(10), [0, 0, 0, 0], le24(1919), le24(1079), [0, 0]);
    expect(detectFormat(vp8x, "a.webp")).toMatchObject({ format: "webp", image: { width: 1920, height: 1080 } });
    const avif = bytes(be32(24), "ftyp", "avif", be32(0), "mif1", "miaf", be32(20), "ispe", be32(0), be32(10_000), be32(8_000));
    expect(detectFormat(avif, "a.avif")).toMatchObject({ format: "avif", parserId: "screenshot", image: { width: 10_000, height: 8_000 } });
  });

  it("recognizes later-version and unsupported binaries", () => {
    expect(detectFormat(utf8("%PDF-1.7\n..."), "brand.pdf")).toMatchObject({ format: "pdf", unsupported: "v1.1", kind: "pdf" });
    expect(detectFormat(utf8("ASEF\0\u0001"), "a.ase")).toMatchObject({ format: "ase", unsupported: "v1.1" });
    expect(detectFormat(bytes("wOF2", [0, 1, 0, 0]), "f.woff2")).toMatchObject({ category: "font", unsupported: "v1.1" });
    expect(detectFormat(bytes([0, 1, 0, 0, 0, 12]), "f.ttf")).toMatchObject({ format: "ttf" });
    expect(detectFormat(bytes("PK\u0003\u0004", [0, 0]), "a.zip")).toMatchObject({ format: "zip", unsupported: "v2" });
    expect(detectFormat(bytes([0, 1, 0, 2]), "swatches.aco")).toMatchObject({ format: "aco", unsupported: "v1.1" });
    const heic = bytes(be32(24), "ftyp", "heic", be32(0), "mif1", "heic");
    expect(detectFormat(heic, "IMG.heic")).toMatchObject({ format: "heic", unsupported: "never" });
    expect(detectFormat(bytes([1, 2, 0, 4, 5]), "blob.bin")).toMatchObject({ category: "binary", unsupported: "never" });
    expect(detectFormat(new Uint8Array(), "x.css")).toMatchObject({ category: "empty" });
  });

  it("never throws on truncated headers", () => {
    for (const sample of [png(10, 10), jpeg(10, 10), bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8L", [0, 0, 0])]) {
      for (let n = 0; n <= sample.length; n++) expect(() => detectFormat(sample.subarray(0, n), "x.png")).not.toThrow();
    }
  });
});

describe("detectFormat: content", () => {
  it.each([
    ["shadcn-oklch.css", "globals.css", "css", "shadcn-oklch"],
    ["shadcn-hsl.css", "globals.css", "css", "shadcn-hsl"],
    ["tailwind-v4.css", "app.css", "css", "tailwind-v4"],
    ["tokens.dtcg.json", "tokens.json", "tokens", "dtcg-2025.10"],
    ["figma-native.json", "Light.tokens.json", "tokens", "figma-native"],
    ["tokens-studio.json", "tokens.json", "tokens", "tokens-studio"],
    ["theme.resolver.json", "theme.resolver.json", "tokens", "dtcg-resolver"],
    ["DESIGN.md", "DESIGN.md", "design-md", "design-md"],
    ["colors.txt", "colors.txt", "paste", "color-list"],
    ["layout.tsx.txt", "layout.tsx", "fonts", "next-font"],
  ])("%s → %s/%s", (file, name, parserId, format) => {
    expect(detectFormat(fixture(file), name)).toMatchObject({ category: "text", parserId, format });
  });

  it("classifies pasted text and applies the paste limit", () => {
    expect(detectFormat(utf8("https://coolors.co/264653-2a9d8f-e9c46a"), "", { pasted: true })).toMatchObject({ parserId: "paste", format: "coolors", limit: "paste" });
    expect(detectFormat(utf8("rebeccapurple\nnavy"), "", { pasted: true })).toMatchObject({ format: "color-list" });
    expect(detectFormat(utf8("Inter\nGeist Mono"), "", { pasted: true })).toMatchObject({ parserId: "fonts", format: "font-names" });
    expect(detectFormat(utf8("bad\nfade\nadd"), "", { pasted: true }).format).not.toBe("color-list");
    expect(detectFormat(utf8("600\ncafe"), "", { pasted: true }).format).not.toBe("color-list");
    expect(detectFormat(utf8(":root { --brand: #3a5bd9; }"), "", { pasted: true })).toMatchObject({ parserId: "css", format: "css", limit: "paste" });
    expect(detectFormat(utf8("lorem ipsum dolor sit amet, 1234 !!!"), "")).toMatchObject({ parserId: "paste", format: "text" });
  });

  it("routes logos, configs and later formats", () => {
    expect(detectFormat(utf8('<?xml version="1.0"?>\n<!-- logo -->\n<svg viewBox="0 0 1 1"></svg>'), "logo.svg")).toMatchObject({ format: "svg", unsupported: "logo" });
    expect(detectFormat(utf8("export default { theme: { extend: {} } }"), "tailwind.config.ts")).toMatchObject({ format: "tailwind-config", unsupported: "v1.1" });
    expect(detectFormat(utf8("$brand: #3a5bd9;\n$radius: 4px;"), "_vars.scss")).toMatchObject({ format: "scss", unsupported: "v1.1" });
    expect(detectFormat(utf8("GIMP Palette\nName: Nimbo\n"), "nimbo.gpl")).toMatchObject({ format: "gpl", unsupported: "v1.1" });
    expect(detectFormat(utf8('{"meta":{"variableCollections":{},"variables":{}}}'), "vars.json")).toMatchObject({ format: "figma-rest", unsupported: "never" });
    expect(detectFormat(utf8("# Notes\n\nPlain markdown."), "README.md")).toMatchObject({ parserId: "design-md", format: "markdown" });
  });

  it("handles BOMs and UTF-16", () => {
    expect(detectFormat(bytes([0xef, 0xbb, 0xbf], ":root{--a:#fff}"), "a.css")).toMatchObject({ parserId: "css" });
    const utf16 = [0xff, 0xfe, ...Array.from(":root{--a:#fff}").flatMap((c) => [c.charCodeAt(0), 0])];
    expect(detectFormat(new Uint8Array(utf16), "a.css")).toMatchObject({ parserId: "css" });
  });

  it("stays fast on hostile text (megabyte lines, endless dashes)", () => {
    const hostile = [
      "--a".repeat(400_000),
      `:root{${"--x".repeat(300_000)}`,
      "{".repeat(1_000_000),
      `--${"-".repeat(1_000_000)}`,
      `#${"f".repeat(1_000_000)}`,
    ];
    for (const text of hostile) {
      const start = performance.now();
      detectFormat(utf8(text), "x");
      expect(performance.now() - start).toBeLessThan(1500);
    }
  });

  it("knows compound extensions", () => {
    expect(fileExtension("Theme.Resolver.JSON")).toBe("resolver.json");
    expect(fileExtension("globals.css")).toBe("css");
    expect(fileExtension("README")).toBe("");
  });
});
