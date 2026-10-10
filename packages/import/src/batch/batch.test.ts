import { describe, expect, it } from "vitest";
import { screenshotParser } from "../parsers";
import { notImplemented } from "../registry";
import { fakeParser, nimboCss, pngHeader, utf8 } from "../testing/fakes";
import type { FontMatcher } from "../fonts";
import { ImportAbortedError, importBatch } from "./batch";

const CSS = utf8(":root { --popover: #fff; --card-foreground: #000; --primary: oklch(0.55 0.2 264); }");
const NOW = "2026-10-10T09:00:00.000Z";

describe("importBatch with the default parsers", () => {
  it("detects, hashes, parses and reports every file", async () => {
    const brand = await importBatch([{ name: "globals.css", bytes: CSS }], { ownership: "own", rightsConfirmedAt: NOW });
    expect(brand.version).toBe(1);
    expect(brand.sources).toHaveLength(1);
    expect(brand.sources[0]).toMatchObject({ kind: "css", format: "shadcn-oklch", fileName: "globals.css", parser: "css@1.0.0", ownership: "own", rightsConfirmedAt: NOW, bytes: CSS.length });
    expect(brand.sources[0]!.id).toMatch(/^css-[0-9a-f]{10}$/);
    expect(brand.sources[0]!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(brand.files).toEqual([{ index: 0, name: "globals.css", sourceId: brand.sources[0]!.id, status: "parsed", format: "shadcn-oklch", parserId: "css" }]);
    expect(brand.warnings.some((w) => w.code === "parser-not-implemented")).toBe(false);
    expect(brand.colors.find((c) => c.role === "primary")).toMatchObject({ mode: "light", locator: "globals.css:1 --primary", confidence: "exact" });
    expect(brand.conflicts).toEqual([]);
  });

  it("a stub parser is reported, not fatal", async () => {
    const stub = { ...fakeParser("css", "css", {}), parse: async () => notImplemented("css") };
    const brand = await importBatch([{ name: "globals.css", bytes: CSS }], { parsers: [stub] });
    expect(brand.files[0]).toMatchObject({ status: "parsed" });
    expect(brand.warnings).toContainEqual({ sourceId: brand.sources[0]!.id, code: "parser-not-implemented", detail: "css" });
    expect(brand.colors).toEqual([]);
  });

  it("an image whose size the header does not give is never decoded", async () => {
    let decodes = 0;
    const webp = utf8("RIFF\u0000\u0000\u0000\u0000WEBPVP8X");
    const brand = await importBatch([{ name: "shot.webp", bytes: webp }], {
      decodeImage: async () => {
        decodes++;
        return { data: new Uint8Array(4), width: 1, height: 1 };
      },
    });
    expect(decodes).toBe(0);
    expect(brand.files[0]).toMatchObject({ status: "skipped", code: "unsupported-format", detail: "no-size" });
  });
});

describe("importBatch", () => {
  const css = fakeParser("css", "css", nimboCss);
  const md = fakeParser("design-md", "design-md", {
    colors: [{ value: "#16a34a", name: "primary", role: "primary", locator: "DESIGN.md colors.primary", confidence: "exact", method: "declared" }],
    fonts: [{ role: "body", stack: "Inter", weights: [600], locator: "DESIGN.md typography.body", confidence: "exact", method: "declared" }],
    notes: ["Calm and precise.‮"],
  });

  it("merges sources by precedence, flags framework defaults and matches the nearest recipe", async () => {
    const brand = await importBatch(
      [
        { name: "DESIGN.md", bytes: utf8("---\ncolors:\n  primary: '#16a34a'\n---\n") },
        { name: "globals.css", bytes: CSS },
      ],
      { ownership: "own", rightsConfirmedAt: NOW, parsers: [css, md], logo: { primary: "#e11d48" } },
    );
    const cssId = brand.sources.find((s) => s.kind === "css")!.id;
    const primary = brand.colors.find((c) => c.role === "primary" && !c.overriddenBy)!;
    expect(primary).toMatchObject({ sourceId: cssId, hex: expect.stringMatching(/^#/), locator: "globals.css:13 --primary", confidence: "exact" });
    expect(brand.colors.find((c) => c.role === "primary" && c.overriddenBy)).toMatchObject({ hex: "#16a34a", overriddenBy: primary.id });
    expect(brand.colors.find((c) => c.role === "border")).toMatchObject({ hex: "#ffffff", alpha: 0.1, mode: "dark" });
    expect(brand.colors.find((c) => c.role === "background" && c.mode === "light")).toMatchObject({ isFrameworkDefault: true });
    expect(primary.isFrameworkDefault).toBeUndefined();
    expect(brand.warnings).toContainEqual({ sourceId: cssId, code: "non-color", detail: "--sidebar-ring" });
    expect(brand.unresolved).toEqual([{ sourceId: cssId, path: "--ring", reason: "not evaluated: color-mix(in oklab, red, blue)", code: "not-evaluated" }]);
    expect(brand.fonts.find((f) => f.role === "body" && !f.overriddenBy)).toMatchObject({ family: "Inter", weights: [400, 500, 600], fallback: ["system-ui", "sans-serif"] });
    expect(brand.notes).toEqual(["Calm and precise."]);
    expect(brand.shape.radius).toMatchObject({ px: 10, id: `${cssId}:radius` });
    expect(brand.recipe).toMatchObject({ id: expect.any(String), basis: expect.arrayContaining(["radius", "shadow"]) });
    expect(brand.conflicts).toEqual([expect.objectContaining({ role: "primary", guideId: primary.id, logo: "#e11d48" })]);
    expect(brand.warnings.some((w) => w.code === "mode-generated")).toBe(false);
  });

  it("reports per file: limits, duplicates, logos, unsupported formats and parser errors", async () => {
    const boom = fakeParser("tokens", "tokens", () => {
      throw new Error("bad ‮token");
    });
    const files = [
      { name: "a.css", bytes: CSS },
      { name: "copy.css", bytes: CSS },
      { name: "", bytes: new Uint8Array() },
      { name: "huge.png", bytes: pngHeader(10_000, 8_000) },
      { name: "logo.svg", bytes: utf8("<svg viewBox='0 0 1 1'/>") },
      { name: "mark.png", bytes: pngHeader(512, 512), role: "logo" as const },
      { name: "brand.pdf", bytes: utf8("%PDF-1.7") },
      { name: "tokens.json", bytes: utf8('{"a":{"$value":"#fff"}}') },
      { name: "big.css", bytes: utf8(`:root{--a:#fff}${" ".repeat(2048)}`) },
    ];
    const brand = await importBatch(files, { parsers: [css, boom], limits: { bytes: { css: 1024 } } });
    const byName = Object.fromEntries(brand.files.map((f) => [f.name, f]));
    expect(byName["a.css"]).toMatchObject({ status: "parsed" });
    expect(byName["copy.css"]).toMatchObject({ status: "skipped", code: "duplicate-file", detail: "a.css" });
    expect(byName["file"]).toMatchObject({ status: "skipped", code: "empty-file" });
    expect(byName["huge.png"]).toMatchObject({ code: "image-too-large", detail: "10000×8000" });
    expect(byName["logo.svg"]).toMatchObject({ code: "logo-file" });
    expect(byName["mark.png"]).toMatchObject({ code: "logo-file" });
    expect(byName["brand.pdf"]).toMatchObject({ code: "unsupported-format", detail: "v1.1" });
    expect(byName["tokens.json"]).toMatchObject({ status: "failed", code: "parse-error", detail: "Error: bad token" });
    expect(byName["big.css"]).toMatchObject({ code: "file-too-large" });
    expect(brand.files.map((f) => f.index)).toEqual(files.map((_, i) => i));
  });

  it("caps the batch at 20 files and 12 images", async () => {
    const many = Array.from({ length: 22 }, (_, i) => ({ name: `c${i}.css`, bytes: utf8(`:root{--x${i}:#fff}`) }));
    const brand = await importBatch(many, { parsers: [css] });
    expect(brand.files.filter((f) => f.code === "too-many-files")).toHaveLength(2);
    expect(brand.warnings).toContainEqual({ sourceId: "batch", code: "too-many-files", detail: "22/20" });

    const shots = Array.from({ length: 3 }, (_, i) => ({ name: `s${i}.png`, bytes: pngHeader(100 + i, 100) }));
    const limited = await importBatch(shots, { parsers: [screenshotParser], limits: { maxImages: 2 } });
    expect(limited.files.map((f) => f.code ?? f.status)).toEqual(["parsed", "parsed", "too-many-images"]);
  });

  it("is third-party unless the batch declares ownership; references are always third-party", async () => {
    const parsers = [css];
    const anonymous = await importBatch([{ name: "a.css", bytes: CSS }], { parsers, rightsConfirmedAt: NOW });
    expect(anonymous.sources[0]).toMatchObject({ ownership: "third-party" });
    expect(anonymous.sources[0]!.rightsConfirmedAt).toBeUndefined();
    const reference = await importBatch([{ name: "a.css", bytes: CSS, role: "reference" }], { parsers, ownership: "own", rightsConfirmedAt: NOW });
    expect(reference.sources[0]!.ownership).toBe("third-party");
    const badDate = await importBatch([{ name: "a.css", bytes: CSS }], { parsers, ownership: "own", rightsConfirmedAt: "yesterday" });
    expect(badDate.sources[0]!.rightsConfirmedAt).toBeUndefined();
  });

  it("parses pasted text with the paste limit", async () => {
    const pasted = fakeParser("paste", "paste", { colors: [{ value: "#3A5BD9", role: "primary", locator: "línea 1", confidence: "high", method: "named" }] });
    const brand = await importBatch([{ name: "", bytes: utf8("Primary: #3A5BD9"), pasted: true }], { parsers: [pasted], ownership: "own" });
    expect(brand.files[0]).toMatchObject({ name: "paste", status: "parsed", format: "color-list" });
    expect(brand.colors[0]).toMatchObject({ hex: "#3a5bd9", role: "primary", confidence: "high" });
    const tooBig = await importBatch([{ name: "", bytes: utf8(`#fff ${"x".repeat(2000)}`), pasted: true }], { parsers: [pasted], limits: { bytes: { paste: 1000 } } });
    expect(tooBig.files[0]).toMatchObject({ code: "file-too-large" });
  });

  it("passes batch context to parsers (siblings, limits, decoder)", async () => {
    let seen: string[] = [];
    const tokens = fakeParser("tokens", "tokens", (input) => {
      seen = [input.sourceId, input.format, input.text ?? ""];
      return {};
    });
    await importBatch([{ name: "theme.resolver.json", bytes: utf8('{"resolutionOrder":[]}') }], { parsers: [tokens] });
    expect(seen).toEqual([expect.stringMatching(/^tokens-/), "dtcg-resolver", '{"resolutionOrder":[]}']);
  });

  it("uses the font matcher it is given", async () => {
    const matcher: FontMatcher = {
      match: () => ({ kind: "google", family: "Inter" }),
      resolveStack: () => ({ family: "Inter", fallback: ["sans-serif"], match: { kind: "google", family: "Inter" }, deduced: true }),
    };
    const brand = await importBatch([{ name: "a.css", bytes: CSS }], { parsers: [css], fonts: matcher, ownership: "own" });
    expect(brand.fonts.every((f) => f.match.kind === "google" && f.confidence === "medium")).toBe(true);
  });

  it("stops when cancelled", async () => {
    const signal = { aborted: false };
    const slow = fakeParser("css", "css", () => {
      signal.aborted = true;
      return {};
    });
    await expect(importBatch([{ name: "a.css", bytes: CSS }, { name: "b.css", bytes: utf8(":root{--b:#000}") }], { parsers: [slow], signal })).rejects.toBeInstanceOf(
      ImportAbortedError,
    );
  });
});
