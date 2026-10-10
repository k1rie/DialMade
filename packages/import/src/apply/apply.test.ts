import { applyPatch, createDesignDoc, isLocked, lock, type DesignDoc } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import { importBatch } from "../batch";
import { fakeParser, nimboCss, pngHeader, utf8 } from "../testing/fakes";
import type { ImportedBrand } from "../types";
import { applyImport, defaultSelection, editedFont, fontToken, typeStepFor, type ImportPatchResult } from "./apply";

const NOW = "2026-10-10T09:00:00.000Z";
const CSS = utf8(":root{--popover:#fff;--card-foreground:#000}");

const doc = (): DesignDoc =>
  createDesignDoc({
    brand: { name: "Nimbo", seeds: { primary: "#e11d48" } },
    brief: { productType: "saas-general", focus: "landing", locale: "es" },
    provenance: { createdAt: NOW },
  });

const shot = fakeParser("screenshot", "screenshot", {
  screenshot: { width: 1280, height: 800, mode: "dark", neutralTint: { h: 264, c: 0.01 }, vibrancy: { c: 0.12, l: 0.6 }, swatches: ["#0a0a0a", "#3a5bd9"], accentCandidate: "#3a5bd9" },
  colors: [{ value: "#3a5bd9", role: "primary", mode: "dark", locator: "captura 1", confidence: "low", method: "pixel" }],
});

async function nimbo(ownership: "own" | "third-party" = "own"): Promise<ImportedBrand> {
  return importBatch(
    [
      { name: "globals.css", bytes: CSS },
      { name: "app.png", bytes: pngHeader(1280, 800) },
    ],
    { ownership, rightsConfirmedAt: NOW, parsers: [fakeParser("css", "css", nimboCss), shot] },
  );
}

function ok(result: ImportPatchResult) {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result;
}

describe("applyImport", () => {
  it("writes the accepted guide, locks what is sure and records provenance (one patch)", async () => {
    const imported = await nimbo();
    const before = doc();
    const result = ok(applyImport(before, imported, defaultSelection(imported), { ownership: "own", rightsConfirmedAt: NOW }));
    const after = result.doc;
    const { light, dark } = after.tokens.color;

    expect(light.primary).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark.border).toBe("#ffffff1a");
    expect(dark.input).toBe("#ffffff26");
    expect(light.background).toBe("#ffffff");
    expect(after.tokens.color.scales?.brand).toMatchObject({ "50": expect.any(String), "950": expect.any(String) });
    expect(after.brand.seeds.primary).toBe(light.primary);
    expect(after.brand.seeds.secondary).toBe(light.secondary);
    expect(after.brand.achromatic).toBe(false);

    expect(isLocked(after, "/tokens/color/light/primary")).toBe(true);
    expect(isLocked(after, "/tokens/color/light/secondary")).toBe(true);
    // shadcn's own defaults are applied but stay unlocked: they are not the brand.
    expect(isLocked(after, "/tokens/color/dark/border")).toBe(false);
    expect(isLocked(after, "/tokens/color/light/background")).toBe(false);
    expect(isLocked(after, "/brief/recipeId")).toBe(false);
    expect(isLocked(after, "/brand/achromatic")).toBe(false);
    expect(isLocked(after, "/tokens/color/dark/primary")).toBe(false);
    expect(result.locks).toContain("/tokens/color/light/primary");

    expect(after.tokens.radius).toEqual({ sm: 6, md: 8, lg: 10, xl: 14 });
    expect(after.tokens.space).toEqual({});
    expect(result.skipped).toContainEqual(expect.objectContaining({ reason: "framework-default", path: "/tokens/space" }));
    expect(after.tokens.fontSize.h1).toBe(48);
    expect(after.tokens.typography.scale.h1).toEqual({ lineHeight: 1.1, letterSpacing: -0.02, weight: 700 });
    expect(after.tokens.elevation.md).toEqual([{ x: 0, y: 4, blur: 6, spread: -1, color: "#000000", alpha: 0.1 }]);
    expect(after.brief.pairingId).toBe("inter-neo-grotesque");
    expect(after.tokens.typography.heading).toBeUndefined();
    expect(after.tokens.typography.mono).toMatchObject({ family: "Geist Mono", fallback: ["ui-monospace", "monospace"] });
    expect(after.brief.recipeId).toBe(imported.recipe!.id);

    const record = after.provenance.imports?.find((r) => r.kind === "css");
    expect(record).toMatchObject({ format: "shadcn-oklch", fileName: "globals.css", ownership: "own", rightsConfirmedAt: NOW, parser: "css@1.0.0" });
    expect(record!.fields).toContainEqual({ path: "/tokens/color/dark/border", locator: "globals.css:31 --border", confidence: "exact", method: "declared" });
    expect(after.references).toEqual([
      expect.objectContaining({ kind: "upload", origin: "screenshot", ownership: "own", label: "app.png", fingerprint: expect.objectContaining({ colors: ["#0a0a0a", "#3a5bd9"], mode: "dark", method: "pixel" }) }),
    ]);
    expect(JSON.stringify(after)).not.toMatch(/data:|blob:/);

    const replay = applyPatch(before, result.ops);
    expect(replay.ok && replay.doc).toEqual(after);
    expect(before.tokens.color.light).toEqual({});
  });

  it("is idempotent: importing the same files again changes nothing", async () => {
    const imported = await nimbo();
    const first = ok(applyImport(doc(), imported, defaultSelection(imported), { ownership: "own", rightsConfirmedAt: NOW }));
    const again = ok(applyImport(first.doc, imported, defaultSelection(imported), { ownership: "own", rightsConfirmedAt: NOW }));
    expect(again.doc.tokens).toEqual(first.doc.tokens);
    expect(again.doc.brief.locks).toEqual(first.doc.brief.locks);
    expect(again.doc.provenance.imports).toHaveLength(first.doc.provenance.imports!.length);
    expect(again.doc.references).toHaveLength(1);
    expect(again.skipped).toContainEqual(expect.objectContaining({ reason: "duplicate-reference" }));
  });

  it("brings only attributes from a third-party source", async () => {
    const imported = await nimbo("third-party");
    const selection = { ...defaultSelection(imported), accept: [...imported.colors.map((c) => c.id), ...imported.fonts.map((f) => f.id), ...defaultSelection(imported).accept] };
    const result = ok(applyImport(doc(), imported, selection, { ownership: "own" }));
    expect(result.doc.tokens.color.light).toEqual({});
    expect(result.doc.tokens.typography.body).toBeUndefined();
    expect(result.doc.brand.seeds.primary).toBe("#e11d48");
    expect(result.doc.tokens.radius.md).toBe(8);
    expect(result.doc.brief.locks).toEqual([]);
    expect(result.doc.provenance.imports?.[0]).toMatchObject({ ownership: "third-party" });
    expect(result.doc.provenance.imports?.[0]?.rightsConfirmedAt).toBeUndefined();
    expect(result.doc.references[0]).toMatchObject({ ownership: "third-party" });
    expect(result.skipped.filter((s) => s.reason === "third-party").length).toBeGreaterThan(5);
  });

  it("the batch declaration can only downgrade ownership", async () => {
    const imported = await nimbo("own");
    const result = ok(applyImport(doc(), imported, defaultSelection(imported), { ownership: "third-party" }));
    expect(result.doc.tokens.color.light).toEqual({});
  });

  it("skips values that would change a locked one, unless the user unlocked", async () => {
    const imported = await nimbo();
    const locked = lock(doc(), "/tokens/color/light/primary", { value: "#111111" });
    if (!locked.ok) throw new Error(locked.error.message);
    const selection = defaultSelection(imported);
    const result = ok(applyImport(locked.doc, imported, selection, { ownership: "own" }));
    expect(result.doc.tokens.color.light.primary).toBe("#111111");
    expect(result.skipped).toContainEqual(expect.objectContaining({ reason: "locked", path: "/tokens/color/light/primary" }));
    const forced = ok(applyImport(locked.doc, imported, selection, { ownership: "own", allowLocked: true }));
    expect(forced.doc.tokens.color.light.primary).not.toBe("#111111");
  });

  it("applies chip edits as exact user values, honors lock toggles, dismissals and unknown ids", async () => {
    const imported = await nimbo();
    const primary = imported.colors.find((c) => c.role === "primary" && c.mode === "light")!;
    const background = imported.colors.find((c) => c.role === "background" && c.mode === "light")!;
    const border = imported.colors.find((c) => c.role === "border")!;
    const selection = {
      accept: [primary.id, background.id, "nope"],
      edits: { [primary.id]: { color: "#0f766e" }, [background.id]: { role: "card" as const } },
      locks: { [background.id]: true },
      dismissed: [border.id],
      seeds: false,
      recipe: false,
    };
    const result = ok(applyImport(doc(), imported, selection, { ownership: "own" }));
    expect(result.doc.tokens.color.light).toEqual({ primary: "#0f766e", card: "#ffffff" });
    expect(isLocked(result.doc, "/tokens/color/light/card")).toBe(true);
    const record = result.doc.provenance.imports![0]!;
    expect(record.fields).toContainEqual(expect.objectContaining({ path: "/tokens/color/light/primary", method: "edited", confidence: "exact" }));
    expect(record.dismissed).toEqual(["globals.css:31 --border"]);
    expect(result.doc.brand.seeds.primary).toBe("#e11d48");
    expect(result.skipped).toContainEqual({ id: "nope", reason: "unknown-id" });
  });

  it("derives the radius steps from an edited base radius", async () => {
    const imported = await nimbo();
    const base = imported.shape.radius!;
    const result = ok(applyImport(doc(), imported, { accept: [base.id], edits: { [base.id]: { px: 12 } }, recipe: false }, { ownership: "own" }));
    expect(result.doc.tokens.radius).toEqual({ sm: 8, md: 10, lg: 12, xl: 16 });
    expect(result.doc.provenance.imports![0]!.fields.every((f) => f.method === "edited")).toBe(true);
  });

  it("marks an achromatic primary and takes the secondary seed from the accent", async () => {
    const css = fakeParser("css", "css", {
      colors: [
        { value: "#171717", role: "primary", locator: "--primary", confidence: "exact", method: "declared" },
        { value: "#f5f5f5", role: "secondary", locator: "--secondary", confidence: "exact", method: "declared" },
        { value: "#f97316", role: "cta", locator: "--accent", confidence: "high", method: "declared" },
      ],
    });
    const imported = await importBatch([{ name: "a.css", bytes: CSS }], { ownership: "own", parsers: [css] });
    const result = ok(applyImport(doc(), imported, defaultSelection(imported), { ownership: "own" }));
    expect(result.doc.brand).toMatchObject({ achromatic: true, seeds: { primary: "#171717", secondary: "#f97316" } });
  });

  it("two sources in one import replay identically (the ops are never mutated)", async () => {
    const css = fakeParser("css", "css", { colors: [{ value: "#3a5bd9", role: "primary", locator: "globals.css:3 --primary", confidence: "exact", method: "declared" }] });
    const md = fakeParser("design-md", "design-md", {
      colors: [{ value: "#f97316", role: "cta", locator: "DESIGN.md colors.cta", confidence: "high", method: "declared" }],
      system: [{ component: "button", key: "shape", value: "pill", locator: "DESIGN.md components.button", confidence: "medium", method: "declared" }],
    });
    const imported = await importBatch(
      [
        { name: "globals.css", bytes: CSS },
        { name: "DESIGN.md", bytes: utf8("---\ncolors:\n  cta: '#f97316'\n---\n") },
      ],
      { ownership: "own", rightsConfirmedAt: NOW, parsers: [css, md] },
    );
    const before = doc();
    const result = ok(applyImport(before, imported, defaultSelection(imported), { ownership: "own", rightsConfirmedAt: NOW }));
    expect(result.doc.provenance.imports).toHaveLength(2);
    const ops = JSON.stringify(result.ops);
    const replay = applyPatch(before, result.ops);
    expect(replay.ok && replay.doc).toEqual(result.doc);
    expect(JSON.stringify(result.ops)).toBe(ops);
    expect(applyPatch(before, [...result.ops, { op: "replace", path: "/brief/dials/density", value: 6 }]).ok).toBe(true);
    // DESIGN.md components → /system, unlocked.
    expect(result.doc.system.button.shape).toBe("pill");
    expect(isLocked(result.doc, "/system/button/shape")).toBe(false);
  });

  it("a recipe needs more than radii: shadcn's --radius alone keeps the current one", async () => {
    const radiusOnly = fakeParser("css", "css", {
      colors: [{ value: "#3a5bd9", role: "primary", locator: "globals.css:3 --primary", confidence: "exact", method: "declared" }],
      shape: { radius: { value: 0.625, unit: "rem", px: 10, locator: "globals.css:6 --radius", confidence: "exact", method: "declared" } },
    });
    const imported = await importBatch([{ name: "globals.css", bytes: CSS }], { ownership: "own", parsers: [radiusOnly] });
    expect(imported.recipe).toBeDefined();
    const before = doc();
    const result = ok(applyImport(before, imported, defaultSelection(imported), { ownership: "own" }));
    expect(result.doc.brief.recipeId).toBe(before.brief.recipeId);
    expect(result.doc.tokens.radius.lg).toBe(10);
  });

  it("a picked free alternative loads: substitute for a proprietary family, Google family for a candidate", () => {
    const base = { id: "f", sourceId: "s", locator: "l", confidence: "exact" as const, method: "declared" as const, role: "body" as const, weights: [], fallback: [] };
    const arial = { ...base, family: "Arial", match: { kind: "metric-compatible" as const, family: "Arimo" } };
    expect(fontToken(editedFont(arial, { family: "Arimo" }))).toMatchObject({ family: "Arial", source: "local", substitute: "Arimo" });
    const circular = { ...base, family: "Circular", match: { kind: "style-alt" as const, family: "Figtree", candidates: ["Figtree", "DM Sans"] } };
    expect(fontToken(editedFont(circular, { family: "DM Sans" }))).toMatchObject({ family: "Circular", source: "local", substitute: "DM Sans" });
    const typo = { ...base, family: "Interr", match: { kind: "none" as const, candidates: ["Inter", "Inter Tight"] } };
    expect(fontToken(editedFont(typo, { family: "Inter Tight" }))).toMatchObject({ family: "Inter Tight", source: "google" });
    expect(fontToken(editedFont(typo, { family: "Brand Sans" }))).toMatchObject({ family: "Brand Sans", source: "unknown" });
    expect(fontToken(editedFont(typo, { family: "Lora", match: { kind: "google", family: "Lora" } }))).toMatchObject({ family: "Lora", source: "google" });
  });

  it("keeps own families with their free substitute when no pairing matches", () => {
    const base = { id: "x", sourceId: "s", locator: "l", confidence: "exact" as const, method: "declared" as const, role: "heading" as const, weights: [700, 600, 700], fallback: ["Helvetica Neue", "sans-serif", "bad;name"] };
    expect(fontToken({ ...base, family: "Arial", match: { kind: "metric-compatible", family: "Arimo" } })).toEqual({
      family: "Arial",
      source: "local",
      substitute: "Arimo",
      fallback: ["Helvetica Neue", "sans-serif"],
      weights: [700, 600],
    });
    expect(fontToken({ ...base, family: "Source Sans Pro", match: { kind: "alias", family: "Source Sans 3" } })).toMatchObject({ family: "Source Sans 3", source: "google" });
    expect(fontToken({ ...base, family: "-apple-system", match: { kind: "system" } })).toMatchObject({ source: "system" });
    expect(fontToken({ ...base, family: "Brand Grotesk", match: { kind: "none" } })).toMatchObject({ source: "unknown" });
  });

  it("maps type names to DesignDoc steps", () => {
    expect(typeStepFor({ name: "--text-h2" })).toBe("h2");
    expect(typeStepFor({ name: "heading.1" })).toBe("h1");
    expect(typeStepFor({ name: "text-sm" })).toBe("small");
    expect(typeStepFor({ name: "body" })).toBe("body");
    expect(typeStepFor({ name: "label" })).toBe("caption");
    expect(typeStepFor({ name: "headline-lg" })).toBe("h1");
    expect(typeStepFor({ name: "headline-md" })).toBe("h2");
    expect(typeStepFor({ name: "headline-sm" })).toBe("h3");
    expect(typeStepFor({ name: "title-lg" })).toBe("h3");
    expect(typeStepFor({ name: "label-sm" })).toBe("caption");
    expect(typeStepFor({ name: "body-lg" })).toBe("body");
    expect(typeStepFor({ name: "code" })).toBeUndefined();
    expect(typeStepFor({ name: "whatever", step: "display" })).toBe("display");
  });
});
