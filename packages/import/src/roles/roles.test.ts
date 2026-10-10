import { describe, expect, it } from "vitest";
import { detectVocabulary, mapRoleName, modeFromName, modeFromSelector, normalizeTokenName, parseScaleName, scaleSystem } from "./roles";

describe("normalizeTokenName", () => {
  it("drops prefixes, splits camelCase and finds the mode", () => {
    expect(normalizeTokenName("--color-primaryForeground")).toMatchObject({ key: "primary-foreground" });
    expect(normalizeTokenName("color.dark.background")).toMatchObject({ key: "background", mode: "dark" });
    expect(normalizeTokenName("colors.primary.DEFAULT")).toMatchObject({ key: "primary" });
    expect(normalizeTokenName("semantic/dark-mode/bg")).toMatchObject({ key: "bg", mode: "dark" });
    expect(normalizeTokenName("--bs-body-bg")).toMatchObject({ key: "body-bg", bootstrap: true });
    expect(normalizeTokenName("--pri‮mary")).toMatchObject({ key: "primary" });
  });
});

describe("mapRoleName", () => {
  it("maps the shadcn and Dialmade vocabulary exactly", () => {
    expect(mapRoleName("--primary-foreground")).toEqual({ role: "primaryForeground", confidence: "exact", source: "shadcn" });
    expect(mapRoleName("--chart-3")).toMatchObject({ role: "chart3", confidence: "exact" });
    expect(mapRoleName("color.chart.5")).toMatchObject({ role: "chart5" });
    expect(mapRoleName("--border-strong")).toEqual({ role: "borderStrong", confidence: "exact", source: "dialmade" });
    expect(mapRoleName("--color-primary")).toMatchObject({ role: "primary", confidence: "exact" });
  });

  it("sends accent to cta unless the file speaks shadcn", () => {
    expect(mapRoleName("--accent", { vocabulary: "shadcn" })).toMatchObject({ role: "accent", confidence: "exact" });
    expect(mapRoleName("--accent-foreground", { vocabulary: "dialmade" })).toMatchObject({ role: "accentForeground" });
    expect(mapRoleName("--color-accent")).toMatchObject({ role: "cta", confidence: "high" });
    expect(mapRoleName("accent.foreground")).toMatchObject({ role: "ctaForeground" });
  });

  it("knows Bootstrap and common heuristic names", () => {
    expect(mapRoleName("--bs-danger")).toMatchObject({ role: "destructive", confidence: "high", source: "bootstrap" });
    expect(mapRoleName("--bs-body-bg")).toMatchObject({ role: "background" });
    expect(mapRoleName("--bs-unknown")).toBeNull();
    expect(mapRoleName("brand")).toMatchObject({ role: "primary", confidence: "medium" });
    expect(mapRoleName("brand", { vocabulary: "dialmade" })).toMatchObject({ role: "brand", confidence: "exact" });
    expect(mapRoleName("text.muted")).toMatchObject({ role: "mutedForeground", confidence: "medium" });
    expect(mapRoleName("onPrimary")).toMatchObject({ role: "primaryForeground" });
    expect(mapRoleName("color.dark.surface")).toMatchObject({ role: "card", mode: "dark" });
  });

  it("returns null for steps, sidebar variables and unknown names", () => {
    expect(mapRoleName("--color-brand-500")).toBeNull();
    expect(mapRoleName("--sidebar-primary")).toBeNull();
    expect(mapRoleName("c7")).toBeNull();
    expect(mapRoleName("")).toBeNull();
  });
});

describe("scales", () => {
  it("parses steps and tells the convention", () => {
    expect(parseScaleName("--color-brand-500")).toEqual({ group: "brand", step: 500 });
    expect(parseScaleName("blue.9")).toEqual({ group: "blue", step: 9 });
    expect(parseScaleName("Primary/40")).toEqual({ group: "primary", step: 40 });
    expect(parseScaleName("--chart-1")).toBeNull();
    expect(parseScaleName("--primary")).toBeNull();
    expect(scaleSystem([50, 100, 500, 950])).toBe("tailwind");
    expect(scaleSystem([1, 2, 12])).toBe("radix");
    expect(scaleSystem([0, 10, 40, 99])).toBe("material");
    expect(scaleSystem([1, 500, 2000])).toBeNull();
  });
});

describe("vocabulary and modes", () => {
  it("detects shadcn and our own export", () => {
    expect(detectVocabulary(["--background", "--popover", "--card-foreground"])).toBe("shadcn");
    expect(detectVocabulary(["--popover", "--card-foreground", "--primary-text", "--border-strong"])).toBe("dialmade");
    expect(detectVocabulary(["--color-primary", "--color-accent"])).toBeUndefined();
  });

  it("reads modes from selectors and file names", () => {
    expect(modeFromSelector(".dark")).toBe("dark");
    expect(modeFromSelector(":root.dark")).toBe("dark");
    expect(modeFromSelector('[data-theme="dark"]')).toBe("dark");
    expect(modeFromSelector("@media (prefers-color-scheme: dark)")).toBe("dark");
    expect(modeFromSelector(":root, :host")).toBe("light");
    expect(modeFromSelector("@theme inline")).toBe("light");
    expect(modeFromSelector(".darker")).toBeUndefined();
    expect(modeFromSelector(".card")).toBeUndefined();
    expect(modeFromName("Dark.tokens.json")).toBe("dark");
    expect(modeFromName("theme-light")).toBe("light");
    expect(modeFromName("tokens.json")).toBeUndefined();
  });
});
