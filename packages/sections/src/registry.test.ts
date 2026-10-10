import { describe, expect, it } from "vitest";
import { appSections } from "./app";
import { brandSections } from "./brand";
import { landingSections } from "./landing";
import { SectionRegistryError, createRegistry, getSection, listSections, sectionRegistry, validateSections } from "./registry";
import { TEST_SECTIONS, heroSection, kpiSection, navbarSection, shellSection } from "./testing/fixtures";
import type { AnySectionDefinition } from "./types";
import { uiSections } from "./ui";

describe("registro central", () => {
  it("agrega las secciones de los tres kinds y las ui.* y es válido", () => {
    expect(sectionRegistry.size).toBe(brandSections.length + landingSections.length + appSections.length + uiSections.length);
    expect(validateSections([...brandSections, ...landingSections, ...appSections, ...uiSections])).toEqual([]);
    for (const kind of ["brand", "landing", "app"] as const) {
      for (const def of listSections(kind)) {
        expect(def.kind).toBe(kind);
        expect(getSection(def.type)).toBe(def);
      }
    }
  });

  it("devuelve undefined para tipos desconocidos", () => {
    expect(getSection("landing.nope")).toBeUndefined();
  });
});

describe("createRegistry", () => {
  const registry = createRegistry(TEST_SECTIONS);

  it("busca por tipo y lista por kind en orden de registro", () => {
    expect(registry.get("landing.hero")).toBe(heroSection);
    expect(registry.list("landing").map((def) => def.type)).toEqual(["landing.navbar", "landing.hero", "landing.features"]);
    expect(registry.list("app")).toEqual([shellSection, kpiSection]);
    expect(registry.list("brand")).toEqual([]);
    expect(registry.list()).toHaveLength(TEST_SECTIONS.length);
  });

  it("rechaza definiciones incoherentes", () => {
    const bad = (patch: Partial<AnySectionDefinition>): AnySectionDefinition => ({ ...navbarSection, ...patch });
    const cases: [AnySectionDefinition[], RegExp][] = [
      [[navbarSection, navbarSection], /registered twice/],
      [[bad({ type: "hero" })], /namespaced/],
      [[bad({ type: "app.navbar" })], /does not match kind/],
      [[bad({ variants: [] })], /at least one variant/],
      [[bad({ variants: [navbarSection.variants[0]!, navbarSection.variants[0]!] })], /variant ids must be unique/],
      [[bad({ knobs: [{ key: "align", label: { es: "a", en: "a" }, control: "select", scope: "section" }] })], /needs options/],
      [[bad({ knobs: [{ key: "gap", label: { es: "a", en: "a" }, control: "slider", min: 4, max: 2, scope: "section" }] })], /min < max/],
      [[bad({ defaultChildren: ["landing.hero"] })], /only containers/],
    ];
    for (const [definitions, message] of cases) {
      expect(() => createRegistry(definitions)).toThrow(SectionRegistryError);
      expect(validateSections(definitions).join("\n")).toMatch(message);
    }
  });

  it("admite secciones ui.* en cualquier kind", () => {
    expect(validateSections([{ ...navbarSection, type: "ui.banner", kind: "app" }])).toEqual([]);
  });
});
