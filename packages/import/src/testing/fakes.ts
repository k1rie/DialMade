import { detectedBy, type Parser, type ParserInput } from "../registry";
import type { ImportSourceKind, ParseOutput, ParserId } from "../types";

/** A parser that claims what the detector gives it and returns a fixed (or computed) output. */
export function fakeParser(id: ParserId, kind: ImportSourceKind, output: ParseOutput | ((input: ParserInput) => ParseOutput)): Parser {
  return {
    id,
    kind,
    version: "1.0.0",
    detect: detectedBy(id),
    parse: async (input) => (typeof output === "function" ? output(input) : output),
  };
}

export const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

/** A PNG signature + IHDR with the given size (enough for the header reader, not a decodable image). */
export function pngHeader(width: number, height: number): Uint8Array {
  const out = new Uint8Array(33);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(out.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  out.set([8, 6, 0, 0, 0], 24);
  return out;
}

const decl = (locator: string) => ({ locator, confidence: "exact" as const, method: "declared" as const });

/** What a CSS parser would return for a shadcn globals.css of the fictional brand «Nimbo». */
export const nimboCss: ParseOutput = {
  format: "shadcn-oklch",
  colors: [
    { value: "oklch(1 0 0)", name: "--background", role: "background", mode: "light", ...decl("globals.css:7 --background") },
    { value: "oklch(0.145 0 0)", name: "--foreground", role: "foreground", mode: "light", ...decl("globals.css:8 --foreground") },
    { value: "oklch(0.55 0.2 264)", name: "--primary", role: "primary", mode: "light", ...decl("globals.css:13 --primary") },
    { value: "oklch(0.985 0 0)", name: "--primary-foreground", role: "primaryForeground", mode: "light", ...decl("globals.css:14 --primary-foreground") },
    { value: "oklch(0.72 0.16 60)", name: "--secondary", role: "secondary", mode: "light", ...decl("globals.css:15 --secondary") },
    { value: "oklch(0.145 0 0)", name: "--background", role: "background", mode: "dark", ...decl("globals.css:30 --background") },
    { value: "oklch(1 0 0 / 10%)", name: "--border", role: "border", mode: "dark", ...decl("globals.css:31 --border") },
    { value: "oklch(1 0 0 / 15%)", name: "--input", role: "input", mode: "dark", ...decl("globals.css:32 --input") },
    { value: "transparent", name: "--sidebar-ring", ...decl("globals.css:33 --sidebar-ring") },
    { value: "color-mix(in oklab, red, blue)", name: "--ring", role: "ring", mode: "dark", ...decl("globals.css:34 --ring") },
    ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step, i) => ({
      value: step === 600 ? "oklch(0.55 0.2 264)" : `oklch(${(0.97 - i * 0.07).toFixed(2)} ${(0.04 + (i < 5 ? i : 10 - i) * 0.03).toFixed(2)} 264)`,
      name: `--color-nimbo-${step}`,
      scale: { group: "nimbo", step },
      ...decl(`globals.css:${40 + i} --color-nimbo-${step}`),
    })),
  ],
  fonts: [
    { role: "body", stack: "var(--font-inter), Inter, system-ui, sans-serif", weights: [400, 500], ...decl("globals.css:60 --font-sans") },
    { role: "heading", stack: '"Inter", sans-serif', weights: [600, 700], ...decl("globals.css:61 --font-heading") },
    { role: "mono", stack: "'Geist Mono', ui-monospace, monospace", ...decl("globals.css:62 --font-mono") },
  ],
  shape: {
    radius: { value: 0.625, unit: "rem", px: 10, assumed: true, ...decl("globals.css:6 --radius") },
    shadows: [{ name: "md", layers: [{ x: 0, y: 4, blur: 6, spread: -1, color: "rgb(0 0 0 / 0.1)", alpha: 1 }], ...decl("globals.css:70 --shadow-md") }],
  },
  spacing: { base: { value: 0.25, unit: "rem", px: 4, assumed: true, ...decl("globals.css:71 --spacing") } },
  typeScale: [{ name: "--text-h1", step: "h1", fontSize: { value: 3, unit: "rem", px: 48, assumed: true }, lineHeight: 1.1, weight: 700, letterSpacing: -0.02, ...decl("globals.css:80 --text-h1") }],
};
