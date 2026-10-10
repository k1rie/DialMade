import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readNextFonts } from "./nextFont";

const layout = readFileSync(new URL("../parsers/css/fixtures/dialmade-layout.tsx.txt", import.meta.url), "utf8");

describe("readNextFonts", () => {
  it("reads next/font/google imports and the variables they define", () => {
    expect(readNextFonts(layout)).toEqual([
      { family: "Inter", variable: "--font-inter", weights: [], source: "google", line: 10 },
      { family: "Geist Mono", variable: "--font-geist-mono", weights: [], source: "google", line: 11 },
    ]);
  });

  it("aliased imports, weights, next/font/local and the geist package", () => {
    const text = [
      `import { Inter as FontSans, Lora } from "next/font/google";`,
      `import localFont from "next/font/local";`,
      `import { GeistMono } from "geist/font/mono";`,
      `const sans = FontSans({ subsets: ["latin"], variable: "--font-sans" });`,
      `const serif = Lora({ weight: ["400", "700"], variable: "--font-serif" });`,
      `const brand = localFont({ src: "./fonts/Satoshi-Variable.woff2", variable: "--font-brand" });`,
    ].join("\n");
    expect(readNextFonts(text)).toEqual([
      { family: "Geist Mono", variable: "--font-geist-mono", weights: [], source: "google", line: 3 },
      { family: "Inter", variable: "--font-sans", weights: [], source: "google", line: 4 },
      { family: "Lora", variable: "--font-serif", weights: [400, 700], source: "google", line: 5 },
      { family: "Satoshi", variable: "--font-brand", weights: [], source: "local", deduced: true, line: 6 },
    ]);
  });

  it("ignores calls to anything that was not imported from next/font, and never runs code", () => {
    expect(readNextFonts(`const x = Inter({ variable: "--font-inter" });`)).toEqual([]);
    expect(readNextFonts(`import { Inter } from "next/font/google";\nconst a = Inter({ variable: "--font-a" + evil() });`)).toEqual([
      { family: "Inter", variable: "--font-a", weights: [], source: "google", line: 2 },
    ]);
    expect(readNextFonts("x".repeat(50_000))).toEqual([]);
  });
});
