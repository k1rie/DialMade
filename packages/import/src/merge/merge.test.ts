import { describe, expect, it } from "vitest";
import { normalizeColor } from "../color";
import type { ImportedColor, ImportedFont, ImportSource, ImportSourceKind, Prov } from "../types";
import { findLogoConflicts, mergeColors, mergeFonts, mergeFragments, type SourceFragment } from "./merge";

const source = (id: string, kind: ImportSourceKind): ImportSource => ({
  id,
  kind,
  format: kind,
  fileName: `${id}.txt`,
  sha256: "0".repeat(64),
  bytes: 10,
  parser: `${kind}@1.0.0`,
  ownership: "own",
});

const SOURCES = [source("md", "design-md"), source("css", "css"), source("shot", "screenshot"), source("paste", "paste")];

let n = 0;
function color(sourceId: string, css: string, extra: Partial<ImportedColor> = {}): ImportedColor {
  const r = normalizeColor(css);
  if (!r.ok) throw new Error(css);
  return { id: `${sourceId}:c${n++}`, sourceId, locator: `${sourceId} ${css}`, confidence: "exact", method: "declared", ...r.color, ...extra };
}

describe("mergeColors", () => {
  it("merges near-identical colors and keeps both provenances, strongest first", () => {
    const fromMd = color("md", "#3a5bd9", { role: "primary" });
    const fromCss = color("css", "#3a5bda", { role: "primary", mode: "light", name: "--primary" });
    const merged = mergeColors([fromMd, fromCss], SOURCES);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: fromCss.id, hex: "#3a5bda", role: "primary", mode: "light" });
    expect(merged[0]!.also).toEqual([{ sourceId: "md", locator: fromMd.locator, confidence: "exact", method: "declared" }]);
  });

  it("never merges different roles, modes, scale steps or alphas", () => {
    const list = [
      color("css", "#ffffff", { role: "background" }),
      color("css", "#ffffff", { role: "card" }),
      color("css", "#ffffff", { role: "background", mode: "dark" }),
      color("css", "#ffffff", { scale: { group: "neutral", step: 50 } }),
      color("css", "#ffffff1a", { role: "border", mode: "dark" }),
      color("css", "#ffffff26", { role: "border", mode: "dark" }),
    ];
    const merged = mergeColors(list, SOURCES);
    expect(merged).toHaveLength(5);
    expect(merged.find((c) => c.alpha === 0.15)).toMatchObject({ overriddenBy: list[4]!.id });
  });

  it("within one source, a scale step next to a role keeps its exact value", () => {
    const role = color("css", "#3a5bd9", { role: "secondary" });
    const step = color("css", "#3c5cd8", { scale: { group: "brand", step: 50 } });
    const merged = mergeColors([role, step], SOURCES);
    expect(merged.map((c) => c.hex)).toEqual(["#3a5bd9", "#3c5cd8"]);
    const exact = mergeColors([color("css", "#3a5bd9", { role: "secondary" }), color("css", "#3a5bd9", { scale: { group: "brand", step: 50 } })], SOURCES);
    expect(exact).toHaveLength(1);
  });

  it("a role the vision AI suggests never lands on a declared color", () => {
    const declared = color("css", "#475569", { name: "slate" });
    const ai = color("shot", "#475569", { role: "border", method: "ai", confidence: "high" });
    const merged = mergeColors([declared, ai], SOURCES);
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.role === "border")).toMatchObject({ method: "ai", sourceId: "shot" });
    expect(merged.find((c) => c.sourceId === "css")!.role).toBeUndefined();
  });

  it("borrows a missing role from a weaker source at the weaker confidence", () => {
    const scale = color("css", "#3a5bd9", { scale: { group: "brand", step: 500 } });
    const pasted = color("paste", "#3a5bd9", { role: "primary", confidence: "medium" });
    const [merged] = mergeColors([pasted, scale], SOURCES);
    expect(merged).toMatchObject({ id: scale.id, role: "primary", scale: { group: "brand", step: 500 }, confidence: "medium" });
  });

  it("lets the stronger source hold a role; the others are overridden", () => {
    const md = color("md", "#16a34a", { role: "primary" });
    const css = color("css", "#3a5bd9", { role: "primary" });
    const shot = color("shot", "#ea580c", { role: "primary", method: "pixel", confidence: "low" });
    const ai = color("css", "#9333ea", { role: "secondary", method: "ai", confidence: "high" });
    const cssSecondary = color("shot", "#0891b2", { role: "secondary", method: "pixel", confidence: "low" });
    const merged = mergeColors([md, css, shot, ai, cssSecondary], SOURCES);
    expect(merged.map((c) => c.overriddenBy)).toEqual([css.id, undefined, css.id, cssSecondary.id, undefined]);
  });

  it("keeps input order and scales to thousands of colors", () => {
    const many = Array.from({ length: 5000 }, (_, i) => color("css", `oklch(0.6 0.15 ${(i * 0.07) % 360})`, { name: `c${i}` }));
    const start = performance.now();
    const merged = mergeColors(many, SOURCES);
    expect(performance.now() - start).toBeLessThan(2000);
    expect(merged.length).toBeLessThan(many.length);
    expect(merged[0]!.id).toBe(many[0]!.id);
  });
});

describe("mergeFonts", () => {
  const font = (sourceId: string, family: string, extra: Partial<ImportedFont> = {}): ImportedFont => ({
    id: `${sourceId}:f${n++}`,
    sourceId,
    locator: sourceId,
    confidence: "exact",
    method: "declared",
    family,
    role: "body",
    weights: [400],
    fallback: [],
    match: { kind: "google", family },
    ...extra,
  });

  it("joins the same family per role and overrides a different one", () => {
    const css = font("css", "Inter", { weights: [400, 600] });
    const md = font("md", " inter ", { weights: [500] });
    const other = font("md", "Lora");
    const heading = font("md", "Lora", { role: "heading" });
    const merged = mergeFonts([md, css, other, heading], SOURCES);
    expect(merged).toHaveLength(3);
    expect(merged.find((f) => f.id === css.id)).toMatchObject({ weights: [400, 500, 600], also: [expect.objectContaining({ sourceId: "md" })] });
    expect(merged.find((f) => f.id === other.id)?.overriddenBy).toBe(css.id);
    expect(merged.find((f) => f.id === heading.id)?.overriddenBy).toBeUndefined();
  });
});

describe("mergeFragments", () => {
  const prov = (sourceId: string, id: string): Prov & { id: string } => ({ sourceId, id, locator: id, confidence: "exact", method: "declared" });
  const empty = (s: ImportSource): SourceFragment => ({ source: s, colors: [], fonts: [], shape: {}, notes: [], warnings: [], unresolved: [] });

  it("takes shape, spacing and type from the strongest source and warns about the rest", () => {
    const css: SourceFragment = {
      ...empty(SOURCES[1]!),
      shape: { radius: { ...prov("css", "css:radius"), value: 0.5, unit: "rem", px: 8 } },
      typeScale: [{ ...prov("css", "css:h1"), name: "h1", step: "h1", weight: 700 }],
      notes: [],
    };
    const md: SourceFragment = {
      ...empty(SOURCES[0]!),
      shape: {
        radius: { ...prov("md", "md:radius"), value: 12, unit: "px", px: 12 },
        radii: { md: { ...prov("md", "md:radius-md"), value: 8, unit: "px", px: 8 } },
      },
      spacing: { base: { ...prov("md", "md:space"), value: 4, unit: "px", px: 4 } },
      typeScale: [{ ...prov("md", "md:h1"), name: "headline", step: "h1", weight: 700 }],
      notes: ["Calm and precise."],
    };
    const merged = mergeFragments([md, css]);
    expect(merged.shape.radius?.id).toBe("css:radius");
    expect(merged.shape.radii?.md?.id).toBe("md:radius-md");
    expect(merged.spacing?.base?.id).toBe("md:space");
    expect(merged.typeScale?.[0]).toMatchObject({ id: "css:h1", also: [expect.objectContaining({ sourceId: "md" })] });
    expect(merged.warnings).toContainEqual({ sourceId: "md", code: "overridden", detail: "radius: css:radius" });
    expect(merged.notes).toEqual(["Calm and precise."]);
    expect(merged.sources.map((s) => s.id)).toEqual(["md", "css"]);
  });
});

describe("findLogoConflicts", () => {
  it("raises a card only above ΔEok 0.06", () => {
    const colors = [color("css", "#3a5bd9", { role: "primary" }), color("css", "#f0a024", { role: "secondary" })];
    expect(findLogoConflicts(colors, { primary: "#3b5cda" })).toEqual([]);
    const [card] = findLogoConflicts(colors, { primary: "#e11d48", secondary: "#f0a024" });
    expect(card).toMatchObject({ role: "primary", guide: "#3a5bd9", logo: "#e11d48", choices: ["guide", "logo", "guide-primary-logo-secondary"] });
    expect(card!.deltaE).toBeGreaterThan(0.06);
  });
});
