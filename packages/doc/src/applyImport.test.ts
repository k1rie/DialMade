import { describe, expect, it } from "vitest";
import { applyImport, importPatch, shouldLockImported, type ApplyImportInput, type ImportedValue } from "./applyImport";
import { compileThemeVars } from "./compile";
import { cloneJson } from "./json";
import { isLocked } from "./locks";
import { applyPatch, diffDesignDocs, type PatchResult } from "./patch";
import type { DesignDoc } from "./schema";
import { CREATED_AT, IMPORT_SHA, acmeDoc, importedDoc } from "./testing/fixtures";

function expectOk(result: PatchResult): DesignDoc {
  if (!result.ok) throw new Error(`${result.error.reason}: ${result.error.message}`);
  return result.doc;
}

const source = (overrides: Partial<ApplyImportInput["source"]> = {}): ApplyImportInput["source"] => ({
  sourceId: "css-1",
  kind: "css",
  format: "shadcn-oklch",
  fileName: "globals.css",
  sha256: IMPORT_SHA,
  bytes: 2048,
  parser: "css@1.0.0",
  ownership: "own",
  rightsConfirmedAt: CREATED_AT,
  ...overrides,
});

const value = (path: ImportedValue["path"], v: unknown, extra: Partial<ImportedValue> = {}): ImportedValue => ({
  path,
  value: v,
  locator: `globals.css ${path}`,
  confidence: "exact",
  method: "declared",
  ...extra,
});

const shadcn: ImportedValue[] = [
  value("/tokens/color/light/primary", "#2f4fd0"),
  value("/tokens/color/dark/border", "#ffffff1a"),
  value("/tokens/radius/md", 10, { confidence: "high" }),
  value("/tokens/space/4", 18, { confidence: "medium" }),
  value("/tokens/typography/body", { family: "Inter", source: "google" }, { confidence: "medium", method: "named" }),
  value("/tokens/color/scales/brand", { "500": "#2f4fd0" }),
  value("/brief/dials/density", 7, { confidence: "high", method: "ai" }),
];

describe("shouldLockImported", () => {
  it("locks own exact/high values that are not from the AI, unless told otherwise", () => {
    expect(shouldLockImported(value("/tokens/radius/md", 1), "own")).toBe(true);
    expect(shouldLockImported(value("/tokens/radius/md", 1, { confidence: "high" }), "own")).toBe(true);
    expect(shouldLockImported(value("/tokens/radius/md", 1, { confidence: "medium" }), "own")).toBe(false);
    expect(shouldLockImported(value("/tokens/radius/md", 1, { method: "ai" }), "own")).toBe(false);
    expect(shouldLockImported(value("/tokens/radius/md", 1), "third-party")).toBe(false);
    expect(shouldLockImported(value("/tokens/radius/md", 1, { confidence: "low", lock: true }), "third-party")).toBe(true);
    expect(shouldLockImported(value("/tokens/radius/md", 1, { lock: false }), "own")).toBe(false);
  });
});

describe("applyImport", () => {
  it("writes accepted values to tokens, locks the sure ones and records the source", () => {
    const doc = acmeDoc();
    const next = expectOk(applyImport(doc, { source: source({ dismissed: ["globals.css:20 --chart-1"] }), values: shadcn }));
    expect(next.tokens.color.light.primary).toBe("#2f4fd0");
    expect(next.tokens.color.dark.border).toBe("#ffffff1a");
    expect(next.tokens.radius.md).toBe(10);
    expect(next.tokens.space["4"]).toBe(18);
    expect(next.tokens.typography.body).toEqual({ family: "Inter", source: "google" });
    expect(next.tokens.color.scales).toEqual({ brand: { "500": "#2f4fd0" } });
    expect(next.brief.dials.density).toBe(7);
    expect(next.brief.locks).toEqual(["/tokens/color/light/primary", "/tokens/color/dark/border", "/tokens/radius/md", "/tokens/color/scales/brand"]);
    expect(isLocked(next, "/tokens/space/4")).toBe(false);
    expect(isLocked(next, "/brief/dials/density")).toBe(false);
    const [record] = next.provenance.imports!;
    expect(record).toMatchObject({ sourceId: "css-1", fileName: "globals.css", ownership: "own", rightsConfirmedAt: CREATED_AT, dismissed: ["globals.css:20 --chart-1"] });
    expect(record!.fields).toEqual(shadcn.map(({ path, locator, confidence, method }) => ({ path, locator, confidence, method })));
  });

  it("feeds compileThemeVars", () => {
    const next = expectOk(applyImport(acmeDoc(), { source: source(), values: shadcn }));
    const dark = compileThemeVars(next, { mode: "dark" });
    const light = compileThemeVars(next, { mode: "light" });
    expect(dark["--border"]).toBe("oklch(1 0 0 / 0.1)");
    expect(light["--dl-radius-md"]).toBe("10px");
    expect(light["--dl-space-4"]).toBe("18px");
    expect(light["--dl-font-body"]?.startsWith('"Inter", ')).toBe(true);
  });

  it("is one step: the inverse diff restores the original doc", () => {
    const doc = acmeDoc();
    const before = cloneJson(doc);
    const next = expectOk(applyImport(doc, { source: source(), values: shadcn }));
    expect(doc).toEqual(before);
    expect(expectOk(applyPatch(next, diffDesignDocs(next, doc), { allowLocked: true }))).toEqual(doc);
  });

  it("rejects a value that would change a locked one, unless allowLocked", () => {
    const doc = importedDoc();
    const input = { source: source(), values: [value("/tokens/color/light/primary", "#ff0000"), value("/tokens/radius/lg", 16)] };
    const result = applyImport(doc, input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatchObject({ reason: "locked", lock: "/tokens/color/light/primary" });
    const forced = expectOk(applyImport(doc, input, { allowLocked: true }));
    expect(forced.tokens.color.light.primary).toBe("#ff0000");
    expect(forced.brief.locks.filter((l) => l === "/tokens/color/light/primary")).toHaveLength(1);
  });

  it("accepts the same value at a locked pointer and does not duplicate locks", () => {
    const doc = importedDoc();
    const next = expectOk(applyImport(doc, { source: source(), values: [value("/tokens/color/light/primary", "#2f4fd0"), value("/tokens/typography/heading/weights", [600, 700])] }));
    expect(next.brief.locks).toEqual(doc.brief.locks);
  });

  it("updates a re-imported source: new fields replace old ones at the same path, dismissed merges", () => {
    const first = expectOk(applyImport(acmeDoc(), { source: source({ dismissed: ["a"] }), values: shadcn.slice(0, 3) }));
    const second = expectOk(
      applyImport(first, {
        source: source({ bytes: 2100, dismissed: ["b", "a"] }),
        values: [value("/tokens/radius/md", 10, { locator: "globals.css:41 --radius" }), value("/tokens/radius/lg", 14)],
      }),
    );
    expect(second.provenance.imports).toHaveLength(1);
    const record = second.provenance.imports![0]!;
    expect(record.bytes).toBe(2100);
    expect(record.dismissed).toEqual(["a", "b"]);
    expect(record.fields.map((f) => [f.path, f.locator])).toEqual([
      ["/tokens/color/light/primary", "globals.css /tokens/color/light/primary"],
      ["/tokens/color/dark/border", "globals.css /tokens/color/dark/border"],
      ["/tokens/radius/md", "globals.css:41 --radius"],
      ["/tokens/radius/lg", "globals.css /tokens/radius/lg"],
    ]);
  });

  it("drops another source's fields under a path the new source sets", () => {
    const first = expectOk(
      applyImport(acmeDoc(), {
        source: source(),
        values: [value("/tokens/typography/body/family", "Inter", { confidence: "medium" }), value("/tokens/radius/md", 8, { confidence: "medium" })],
      }),
    );
    const second = expectOk(
      applyImport(first, {
        source: source({ sourceId: "tokens-1", kind: "tokens", format: "dtcg-2025.10", fileName: "tokens.json", parser: "dtcg@1.0.0" }),
        values: [value("/tokens/typography/body", { family: "Geist", source: "google" }, { confidence: "medium" })],
      }),
    );
    expect(second.provenance.imports!.map((r) => [r.sourceId, r.fields.map((f) => f.path)])).toEqual([
      ["css-1", ["/tokens/radius/md"]],
      ["tokens-1", ["/tokens/typography/body"]],
    ]);
    expect(second.tokens.typography.body?.family).toBe("Geist");
  });

  it("keeps the last value for a repeated path", () => {
    const next = expectOk(applyImport(acmeDoc(), { source: source(), values: [value("/tokens/radius/md", 4), value("/tokens/radius/md", 6)] }));
    expect(next.tokens.radius.md).toBe(6);
    expect(next.provenance.imports![0]!.fields).toHaveLength(1);
  });

  it("lets a third-party source bring attributes only, unlocked", () => {
    const thirdParty = source({ sourceId: "ref-1", ownership: "third-party", rightsConfirmedAt: undefined });
    delete thirdParty.rightsConfirmedAt;
    const next = expectOk(applyImport(acmeDoc(), { source: thirdParty, values: [value("/tokens/radius/md", 12)] }));
    expect(next.tokens.radius.md).toBe(12);
    expect(next.brief.locks).toEqual([]);
    const colors = applyImport(acmeDoc(), { source: thirdParty, values: [value("/tokens/color/light/primary", "#ff0000")] });
    expect(colors.ok).toBe(false);
    if (!colors.ok) expect(colors.error.reason).toBe("invalid-document");
  });

  it("rejects invalid values and writes to the lock list", () => {
    const bad = applyImport(acmeDoc(), { source: source(), values: [value("/tokens/color/dark/border", "oklch(1 0 0 / 10%)")] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.reason).toBe("invalid-document");
    const locks = applyImport(acmeDoc(), { source: source(), values: [value("/brief/locks/-", "/tokens/radius/md")] });
    expect(locks.ok).toBe(false);
    if (!locks.ok) expect(locks.error.reason).toBe("invalid-operation");
    expect(() => importPatch(acmeDoc(), { source: source(), values: [value("/brief/locks", [])] })).toThrow(TypeError);
  });

  it("skips locks already covered by an ancestor lock and honors lock: true", () => {
    const doc = expectOk(applyPatch(acmeDoc(), [{ op: "add", path: "/brief/locks/-", value: "/tokens/color/light" }]));
    const input = { source: source(), values: [value("/tokens/color/light/primary", "#2f4fd0", { lock: true })] };
    expect(applyImport(doc, input).ok).toBe(false);
    const next = expectOk(applyImport(doc, input, { allowLocked: true }));
    expect(next.brief.locks).toEqual(["/tokens/color/light"]);
    const pageLock = expectOk(applyImport(acmeDoc(), { source: source(), values: [value("/brand/name", "Acme", { lock: true })] }));
    expect(pageLock.brief.locks).toEqual(["/brand/name"]);
  });
});
