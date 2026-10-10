import { describe, expect, it } from "vitest";
import { createDesignDoc, parseDesignDoc, safeParseDesignDoc } from "./doc";
import { cloneJson } from "./json";
import { applyPatch } from "./patch";
import { ImportRecordSchema, ReferenceSchema, type ImportRecordInput } from "./schema";
import { CREATED_AT, IMPORT_SHA, acmeDoc, acmeInput, importedDoc, importedInput } from "./testing/fixtures";

type Mutable = Record<string, any>;

function invalidPaths(doc: unknown): string[] {
  const result = safeParseDesignDoc(doc);
  return result.success ? [] : result.issues.map((issue) => issue.path.join("/"));
}

function mutate(fn: (doc: Mutable) => void): Mutable {
  const doc = cloneJson(importedDoc()) as Mutable;
  fn(doc);
  return doc;
}

const record = (overrides: Mutable = {}): Mutable => ({
  sourceId: "src-2",
  kind: "tokens",
  format: "dtcg-2025.10",
  fileName: "tokens.json",
  sha256: IMPORT_SHA,
  bytes: 120,
  parser: "dtcg@1.0.0",
  ownership: "own",
  ...overrides,
});

describe("tokens from an import", () => {
  it("round-trips the imported fixture unchanged", () => {
    const doc = importedDoc();
    expect(parseDesignDoc(cloneJson(doc))).toEqual(doc);
    expect(doc.tokens.color.dark.border).toBe("#ffffff1a");
    expect(doc.tokens.typography.heading?.family).toBe("Brand Grotesk");
    expect(doc.tokens.typography.mono).toBeUndefined();
    expect(doc.tokens.elevation.lg).toEqual([]);
    expect(doc.tokens.elevation.md).toBeUndefined();
  });

  it("accepts every token group a guide can bring", () => {
    const doc = mutate((d) => {
      d.tokens.color.light.ring = "#2F4FD0CC";
      d.tokens.color.scales = { brand: { "50": "#eef2ff", "500": "#2f4fd0", "950": "#0b1240" }, accent: { "500": "#f0a024" } };
      d.tokens.typography.mono = { family: "Geist Mono", source: "google", weights: [400] };
      d.tokens.typography.body.fallback = ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"];
      d.tokens.typography.scale.display = { lineHeight: 1, letterSpacing: -0.04, weight: 800 };
      d.tokens.typography.scale.caption = {};
      d.tokens.elevation.md = [
        { x: 0, y: 4, blur: 6, spread: -1, color: "#000000", alpha: 0.1 },
        { x: 0, y: 2, blur: 4, spread: -2, color: "#000000", alpha: 0.1 },
      ];
      d.tokens.fontSize = { h1: 48, body: 16 };
    });
    expect(invalidPaths(doc)).toEqual([]);
  });

  it.each([
    ["a 3-digit color", (d: Mutable) => (d.tokens.color.dark.border = "#fff"), "tokens/color/dark/border"],
    ["a color with a 4-digit tail", (d: Mutable) => (d.tokens.color.dark.border = "#ffffff1a00"), "tokens/color/dark/border"],
    ["a color function", (d: Mutable) => (d.tokens.color.dark.border = "oklch(1 0 0 / 10%)"), "tokens/color/dark/border"],
    ["alpha in a scale", (d: Mutable) => (d.tokens.color.scales = { brand: { "500": "#2f4fd080" } }), "tokens/color/scales/brand/500"],
    ["an unknown scale step", (d: Mutable) => (d.tokens.color.scales = { brand: { "550": "#2f4fd0" } }), "tokens/color/scales/brand"],
    ["an unknown scale", (d: Mutable) => (d.tokens.color.scales = { neutral: {} }), "tokens/color/scales"],
    ["a quoted family", (d: Mutable) => (d.tokens.typography.heading.family = '"Inter"'), "tokens/typography/heading/family"],
    ["CSS in a family", (d: Mutable) => (d.tokens.typography.body.family = "Inter;}body{color:red"), "tokens/typography/body/family"],
    ["a blank family", (d: Mutable) => (d.tokens.typography.body.family = " "), "tokens/typography/body/family"],
    ["a 65-character family", (d: Mutable) => (d.tokens.typography.body.family = "A".repeat(65)), "tokens/typography/body/family"],
    ["an unknown font source", (d: Mutable) => (d.tokens.typography.body.source = "adobe"), "tokens/typography/body/source"],
    ["duplicate weights", (d: Mutable) => (d.tokens.typography.body.weights = [400, 400]), "tokens/typography/body/weights"],
    ["a fractional weight", (d: Mutable) => (d.tokens.typography.body.weights = [450.5]), "tokens/typography/body/weights/0"],
    ["an unknown family key", (d: Mutable) => (d.tokens.typography.body.url = "https://x"), "tokens/typography/body"],
    ["an unknown type step", (d: Mutable) => (d.tokens.typography.scale.h7 = {}), "tokens/typography/scale"],
    ["a huge line height", (d: Mutable) => (d.tokens.typography.scale.h1.lineHeight = 9), "tokens/typography/scale/h1/lineHeight"],
    ["a size inside the scale", (d: Mutable) => (d.tokens.typography.scale.h1.size = 48), "tokens/typography/scale/h1"],
    ["an unknown elevation level", (d: Mutable) => (d.tokens.elevation.xl = []), "tokens/elevation"],
    ["a shadow with alpha > 1", (d: Mutable) => (d.tokens.elevation.sm[0].alpha = 2), "tokens/elevation/sm/0/alpha"],
    ["a negative blur", (d: Mutable) => (d.tokens.elevation.sm[0].blur = -1), "tokens/elevation/sm/0/blur"],
    ["too many shadow layers", (d: Mutable) => (d.tokens.elevation.sm = Array(7).fill(d.tokens.elevation.sm[0])), "tokens/elevation/sm"],
  ])("rejects %s", (_label, fn, path) => {
    expect(invalidPaths(mutate(fn))).toContain(path);
  });

  it("creates the token groups so patches can write into them", () => {
    const next = applyPatch(acmeDoc(), [
      { op: "add", path: "/tokens/typography/body", value: { family: "Inter", source: "google" } },
      { op: "add", path: "/tokens/typography/scale/h1", value: { lineHeight: 1.1 } },
      { op: "add", path: "/tokens/elevation/md", value: [] },
      { op: "add", path: "/tokens/color/dark/border", value: "#ffffff1a" },
    ]);
    expect(next.ok).toBe(true);
  });
});

describe("references", () => {
  const parse = (value: unknown) => ReferenceSchema.safeParse(value);

  it("defaults ownership to third-party and usedFor to []", () => {
    const result = parse({ id: "ref-1", kind: "upload" });
    expect(result.success && result.data).toEqual({ id: "ref-1", kind: "upload", ownership: "third-party", usedFor: [] });
  });

  it("accepts an own screenshot with hash, AI fingerprint and uses", () => {
    const result = parse({
      id: "ref-2",
      kind: "upload",
      origin: "screenshot",
      ownership: "own",
      contentHash: IMPORT_SHA,
      label: "Dashboard",
      fingerprint: {
        method: "ai",
        model: "claude-haiku-5-5",
        mode: "dark",
        density: "compact",
        radius: "md",
        elevation: "soft",
        surface: "layered",
        headingClass: "grotesque",
        bodyClass: "humanist",
        recipeId: "minimal-swiss",
        pairingId: "inter-neo-grotesque",
        layoutId: "app-shell",
        colors: ["#0b1020", "#2f4fd0"],
        colorRoles: [{ swatchIndex: 0, role: "background" }, { swatchIndex: 1, role: "primary" }],
        confidence: "high",
      },
      usedFor: ["recipe", "density", "/brief/recipeId"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a Mobbin link as a bare card", () => {
    expect(parse({ id: "m-1", kind: "mobbin-link", sourceUrl: "https://mobbin.com/screens/abc", usedFor: ["layout"] }).success).toBe(true);
  });

  it.each([
    ["a link without sourceUrl", { id: "r", kind: "url" }, "sourceUrl"],
    ["a data: URL", { id: "r", kind: "url", sourceUrl: "data:image/png;base64,AAAA" }, "sourceUrl"],
    ["a blob: URL", { id: "r", kind: "url", sourceUrl: "blob:https://x/1" }, "sourceUrl"],
    ["credentials in the URL", { id: "r", kind: "url", sourceUrl: "https://user:pass@example.com" }, "sourceUrl"],
    ["an origin on a link", { id: "r", kind: "url", sourceUrl: "https://example.com", origin: "screenshot" }, "origin"],
    ["a fingerprint on a Mobbin link", { id: "r", kind: "mobbin-link", sourceUrl: "https://mobbin.com/x", fingerprint: { mode: "dark" } }, "fingerprint"],
    ["a hash on a Mobbin link", { id: "r", kind: "mobbin-link", sourceUrl: "https://mobbin.com/x", contentHash: IMPORT_SHA }, "contentHash"],
    ["bytes", { id: "r", kind: "upload", bytes: "iVBORw0KGgo=" }, ""],
    ["a thumbnail", { id: "r", kind: "upload", thumbnail: "data:image/png;base64,AAAA" }, ""],
    ["a bad hash", { id: "r", kind: "upload", contentHash: "ABC" }, "contentHash"],
    ["an unknown ownership", { id: "r", kind: "upload", ownership: "mine" }, "ownership"],
    ["an unknown origin", { id: "r", kind: "upload", origin: "video" }, "origin"],
    ["an unknown recipe", { id: "r", kind: "upload", fingerprint: { recipeId: "baroque" } }, "fingerprint/recipeId"],
    ["an unknown pairing", { id: "r", kind: "upload", fingerprint: { pairingId: "comic" } }, "fingerprint/pairingId"],
    ["a display body class", { id: "r", kind: "upload", fingerprint: { bodyClass: "display" } }, "fingerprint/bodyClass"],
    ["a role past the swatches", { id: "r", kind: "upload", fingerprint: { colors: ["#000000"], colorRoles: [{ swatchIndex: 1, role: "primary" }] } }, "fingerprint/colorRoles/0/swatchIndex"],
    ["duplicate uses", { id: "r", kind: "upload", usedFor: ["recipe", "recipe"] }, "usedFor"],
    ["a multi-line label", { id: "r", kind: "upload", label: "a\nb" }, "label"],
  ])("rejects %s", (_label, value, path) => {
    const result = parse(value);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path.join("/"))).toContain(path);
  });

  it("keeps legacy references valid inside a doc", () => {
    const doc = createDesignDoc({
      ...acmeInput,
      references: [{ id: "ref-1", kind: "url", sourceUrl: "https://example.com", fingerprint: { colors: ["#000000"], tags: ["dark"] } }],
    });
    expect(doc.references[0]).toMatchObject({ ownership: "third-party", usedFor: [] });
  });
});

describe("provenance.imports", () => {
  it("stores what was accepted and from where, never the file", () => {
    const doc = importedDoc();
    const [imported] = doc.provenance.imports!;
    expect(imported).toMatchObject({ sourceId: "src-1", fileName: "globals.css", sha256: IMPORT_SHA, bytes: 4096, ownership: "own" });
    expect(imported!.fields.map((f) => f.path)).toContain("/tokens/color/dark/border");
    expect(imported!.dismissed).toEqual(["globals.css:20 --chart-1"]);
    expect(JSON.stringify(doc)).not.toMatch(/data:|blob:/);
  });

  it("defaults fields and dismissed, and imports stays optional", () => {
    const parsed = ImportRecordSchema.parse(record());
    expect(parsed.fields).toEqual([]);
    expect(parsed.dismissed).toEqual([]);
    expect(acmeDoc().provenance.imports).toBeUndefined();
  });

  it.each([
    ["an unknown kind", { kind: "zip" }, "kind"],
    ["an uppercase format", { format: "DTCG" }, "format"],
    ["a multi-line file name", { fileName: "a\nb.css" }, "fileName"],
    ["a bidi file name", { fileName: "evil‮gnp.css" }, "fileName"],
    ["a 129-character file name", { fileName: `${"a".repeat(125)}.css` }, "fileName"],
    ["a short sha256", { sha256: "abc" }, "sha256"],
    ["negative bytes", { bytes: -1 }, "bytes"],
    ["a parser without version", { parser: "css" }, "parser"],
    ["a bad rightsConfirmedAt", { rightsConfirmedAt: "yesterday" }, "rightsConfirmedAt"],
    ["a field outside the doc", { fields: [{ path: "/version", locator: "x", confidence: "exact", method: "declared" }] }, "fields/0/path"],
    ["a relative field path", { fields: [{ path: "tokens/radius/md", locator: "x", confidence: "exact", method: "declared" }] }, "fields/0/path"],
    ["an unknown confidence", { fields: [{ path: "/tokens/radius/md", locator: "x", confidence: "sure", method: "declared" }] }, "fields/0/confidence"],
    ["an unknown method", { fields: [{ path: "/tokens/radius/md", locator: "x", confidence: "low", method: "guess" }] }, "fields/0/method"],
    ["duplicate dismissed locators", { dismissed: ["a", "a"] }, "dismissed"],
    ["the file contents", { content: ":root{}" }, ""],
  ])("rejects %s", (_label, overrides, path) => {
    const result = ImportRecordSchema.safeParse(record(overrides));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((i) => i.path.join("/"))).toContain(path);
  });

  it("rejects duplicate source ids", () => {
    const doc = mutate((d) => d.provenance.imports.push(record({ sourceId: "src-1" })));
    expect(invalidPaths(doc)).toContain("provenance/imports/1/sourceId");
  });

  it("lets a third-party source bring attributes only (no colors, fonts or brand)", () => {
    const attrs = mutate((d) =>
      d.provenance.imports.push(
        record({
          ownership: "third-party",
          fields: [
            { path: "/tokens/radius/md", locator: "ref.json radius", confidence: "high", method: "declared" },
            { path: "/brief/dials/density", locator: "captura 1", confidence: "medium", method: "ai" },
            { path: "/tokens/typography/scale/h1", locator: "ref.json h1", confidence: "high", method: "declared" },
          ],
        }),
      ),
    );
    expect(invalidPaths(attrs)).toEqual([]);

    for (const path of ["/tokens/color/light/primary", "/tokens/color", "/tokens", "/tokens/typography/body/family", "/brand/seeds/primary", "/brand"]) {
      const bad = mutate((d) =>
        d.provenance.imports.push(record({ ownership: "third-party", fields: [{ path, locator: "x", confidence: "exact", method: "declared" }] })),
      );
      expect(invalidPaths(bad), path).toContain("provenance/imports/1/fields/0/path");
    }
  });

  it("is accepted by createDesignDoc with timestamps", () => {
    const doc = createDesignDoc({
      ...importedInput,
      provenance: { createdAt: CREATED_AT, imports: [record({ rightsConfirmedAt: CREATED_AT }) as ImportRecordInput] },
    });
    expect(doc.provenance.imports?.[0]?.rightsConfirmedAt).toBe(CREATED_AT);
  });
});
