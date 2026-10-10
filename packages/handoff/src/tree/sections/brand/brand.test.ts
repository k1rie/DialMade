import { describe, expect, it } from "vitest";
import type { DesignDoc } from "@dialmade/doc";
import { FigmaPlanSchema } from "../../../figma/schema";
import { toFigmaPlan } from "../../../figma/toFigmaPlan";
import { themeSnapshot } from "../../../theme";
import { legacyDoc, screensDoc } from "../../../testing/fixtures";
import { buildDesignTree } from "../../build";
import type { DesignNode, DesignTree, FrameNode, Paint } from "../../types";
import { BRAND_BUILDERS } from ".";

/** Root names the brand builders give their sections (the generic fallback is named after the section label). */
const ROOT_NAMES: Record<string, string> = {
  "brand.cover": "Cover",
  "brand.identity": "Identity",
  "brand.palette": "Palette",
  "brand.type": "Type",
  "brand.shape": "Shape",
  "brand.components": "Components",
  "brand.artDirection": "Art direction",
};

type Sectioned = FrameNode & { section?: string };

function walk(node: DesignNode, visit: (node: DesignNode) => void) {
  visit(node);
  if (node.type === "frame") for (const child of node.children) walk(child, visit);
}

function brandSections(tree: DesignTree): Sectioned[] {
  const page = tree.pages.find((entry) => entry.pageKind === "brand");
  expect(page).toBeDefined();
  const out: Sectioned[] = [];
  walk(page!.root, (node) => {
    const section = (node as Sectioned).section;
    if (node.type === "frame" && section?.startsWith("brand.")) out.push(node as Sectioned);
  });
  return out;
}

const paintColors = (paint: Paint | undefined): string[] =>
  !paint ? [] : "color" in paint ? [paint.color] : paint.gradient.stops.map((stop) => stop.color);

function colorsOf(node: DesignNode): string[] {
  const out: string[] = [];
  walk(node, (entry) => {
    if (entry.type === "text" || entry.type === "icon") out.push(entry.color ?? "foreground");
    else {
      out.push(...paintColors(entry.fill));
      if (entry.stroke) out.push(entry.stroke.color);
    }
  });
  return out;
}

/** Every brand section with its alternative variant and its toggles off (or on), to cover the other paths. */
function withVariants(doc: DesignDoc): DesignDoc {
  const page = doc.pages.brand!;
  const alt: Record<string, Record<string, unknown>> = {
    "brand.cover": { variant: "centered", showIndex: false },
    "brand.identity": { variant: "spotlight", showClearSpace: false },
    "brand.palette": { variant: "swatches", showContrast: false },
    "brand.type": { variant: "scale" },
    "brand.shape": { variant: "summary", showSpacing: false },
    "brand.components": { variant: "states" },
    "brand.artDirection": { variant: "guidelines", showApplications: false, dos: ["Una regla propia"] },
  };
  const elements = Object.fromEntries(
    Object.entries(page.elements).map(([id, element]) => [id, alt[element.type] ? { ...element, props: { ...element.props, ...alt[element.type] } } : element]),
  );
  return { ...doc, pages: { ...doc.pages, brand: { ...page, elements } } };
}

const DOCS: [string, () => DesignDoc][] = [
  ["screensDoc", screensDoc],
  ["legacyDoc", legacyDoc],
  ["screensDoc (variants)", () => withVariants(screensDoc())],
];

describe("brand builders", () => {
  it("registers a builder per brand section", () => {
    expect(Object.keys(BRAND_BUILDERS).sort()).toEqual(Object.keys(ROOT_NAMES).sort());
  });

  describe.each(DOCS)("%s", (_, make) => {
    const doc = make();
    const errors: string[] = [];
    const tree = buildDesignTree(doc, { onSectionError: (id, type, error) => errors.push(`${id} ${type}: ${String(error)}`) });
    const sections = brandSections(tree);

    it("builds every brand section with its own builder, without errors", () => {
      expect(errors).toEqual([]);
      const types = Object.values(doc.pages.brand!.elements).map((element) => element.type).filter((type) => type in ROOT_NAMES);
      expect(sections.map((node) => node.section).sort()).toEqual([...types].sort());
      for (const node of sections) expect(node.name).toBe(ROOT_NAMES[node.section!]);
    });

    it("paints only with color variables of the theme", () => {
      const known = new Set(Object.keys(themeSnapshot(doc).colors.light));
      for (const node of sections) {
        for (const color of colorsOf(node)) {
          expect(color, `${node.section} uses ${color}`).not.toMatch(/^#|rgb|oklch/);
          expect(known.has(color), `${node.section} uses unknown ${color}`).toBe(true);
        }
      }
    });

    it("paints the palette swatches with role and scale variables", () => {
      const palette = sections.find((node) => node.section === "brand.palette")!;
      const swatches: string[] = [];
      walk(palette, (node) => {
        if (node.type !== "text" && node.type !== "icon" && (node.name === "Swatch" || /^[a-z]+-\d+$/.test(node.name))) swatches.push(...paintColors(node.fill));
      });
      expect(swatches).toContain("primary");
      expect(swatches).toContain("background");
      if (palette.name === "Palette" && JSON.stringify(palette).includes("color-brand-500")) expect(swatches).toContain("color-brand-500");
      for (const color of swatches) expect(color).toMatch(/^[a-z][a-z0-9-]*$/);
      // The roles table's other-mode column binds the real role variables inside a subtree pinned to that mode.
      if (JSON.stringify(palette).includes('"name":"Roles"')) {
        const pinned: string[] = [];
        walk(palette, (node) => {
          if (node.type === "frame" && node.mode === "dark") walk(node, (child) => child.type === "shape" && pinned.push(...paintColors(child.fill)));
        });
        expect(pinned).toContain("background");
        expect(pinned).toContain("primary");
      }
      // Hex values are text labels.
      const texts: string[] = [];
      walk(palette, (node) => node.type === "text" && texts.push(node.text));
      expect(texts.some((value) => /^#[0-9A-F]{6}$/.test(value))).toBe(true);
    });

    it("turns into a valid figma-plan", () => {
      expect(() => FigmaPlanSchema.parse(toFigmaPlan(doc))).not.toThrow();
    });
  });
});
