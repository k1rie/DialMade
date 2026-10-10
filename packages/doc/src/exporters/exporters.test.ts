import { getStyleRecipe } from "@dialmade/catalog";
import { describe, expect, it } from "vitest";
import { compileThemeVars } from "../compile";
import { EXPORT_FILES } from "../constants";
import { applyImport } from "../applyImport";
import { applyPatch, lock, unlock } from "../patch";
import type { DesignDoc } from "../schema";
import { CONTRACT_VARS } from "../testing/contract";
import { IMPORT_SHA, acmeDoc, importedDoc, monoDoc } from "../testing/fixtures";
import { resolveThemeInputs, resolveTokens } from "../tokens";
import { toDTCGFull } from "./dtcg";
import { toDesignMd } from "./designMd";
import { toFigmaNumberVars } from "./figma";
import { PROMPT_TARGETS, toPromptPack } from "./promptPack";
import { toThemeCss } from "./themeCss";
import { toYaml } from "./yaml";

function patched(doc: DesignDoc, ops: unknown[]): DesignDoc {
  const result = applyPatch(doc, ops);
  if (!result.ok) throw new Error(result.error.message);
  return result.doc;
}

function cssBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = css.slice(start + selector.length + 2, css.indexOf("\n}", start));
  return new Map(
    body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const colon = line.indexOf(":");
        return [line.slice(0, colon), line.slice(colon + 1).trim().replace(/;$/, "")] as [string, string];
      }),
  );
}

type Node = { $type?: string; $value?: unknown; [key: string]: unknown };

function collectTokens(node: unknown, path: string[] = [], out = new Map<string, Node>()): Map<string, Node> {
  if (typeof node !== "object" || node === null) return out;
  if ("$value" in node) {
    out.set(path.join("."), node as Node);
    return out;
  }
  for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) collectTokens(child, [...path, key], out);
  return out;
}

function aliasesIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    const match = /^\{(.+)\}$/.exec(value);
    if (match) out.push(match[1]!);
  } else if (Array.isArray(value)) value.forEach((v) => aliasesIn(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => aliasesIn(v, out));
  return out;
}

/** Parses the YAML subset emitted by `toYaml` (nested maps of JSON scalars). */
function parseYaml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  const stack: { indent: number; node: Record<string, unknown> }[] = [{ indent: -1, node: root }];
  for (const line of text.split("\n")) {
    const indent = line.length - line.trimStart().length;
    const match = /^("(?:[^"\\]|\\.)*"|[A-Za-z_][\w-]*):(?: (.*))?$/.exec(line.trim());
    if (!match) throw new Error(`Bad YAML line: ${line}`);
    const key = match[1]!.startsWith('"') ? (JSON.parse(match[1]!) as string) : match[1]!;
    while (stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parent = stack[stack.length - 1]!.node;
    if (match[2] === undefined) {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, node: child });
    } else {
      parent[key] = JSON.parse(match[2]);
    }
  }
  return root;
}

function frontmatter(md: string): { data: Record<string, any>; body: string } {
  expect(md.startsWith("---\n")).toBe(true);
  const end = md.indexOf("\n---\n", 4);
  return { data: parseYaml(md.slice(4, end)), body: md.slice(end + 5) };
}

describe("toThemeCss", () => {
  it("emits every contract variable in :root and .dark, equal to compileThemeVars", () => {
    const doc = acmeDoc();
    const css = toThemeCss(doc);
    const inputs = resolveThemeInputs(doc);
    for (const [selector, mode] of [[":root", "light"], [".dark", "dark"]] as const) {
      const block = cssBlock(css, selector);
      const vars = compileThemeVars(doc, { ...inputs, mode });
      expect(Object.fromEntries(block)).toEqual(vars);
      for (const name of CONTRACT_VARS) expect(block.has(name), `${selector} ${name}`).toBe(true);
    }
    expect(css.endsWith("}\n")).toBe(true);
    expect(css).not.toContain("@import");
  });

  it("supports custom selectors, hex colors and the font import", () => {
    const doc = acmeDoc();
    const css = toThemeCss(doc, { selector: "[data-dl-theme]", darkSelector: "[data-dl-theme].dark", colorFormat: "hex", includeFontImport: true });
    expect(css).toContain("[data-dl-theme] {");
    expect(css).toContain("[data-dl-theme].dark {");
    expect(cssBlock(css, "[data-dl-theme]").get("--primary")).toMatch(/^#[0-9a-f]{6}$/);
    expect(css).toMatch(/@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^"]+"\);/);
    expect(css.indexOf("@import")).toBeLessThan(css.indexOf("{"));
  });

  it("is deterministic and reflects page dials", () => {
    const doc = acmeDoc();
    expect(toThemeCss(doc)).toBe(toThemeCss(acmeDoc()));
    const dense = toThemeCss(doc, { pageDials: doc.pages.app!.dials! });
    expect(cssBlock(dense, ":root").get("--dl-space-4")).not.toBe(cssBlock(toThemeCss(doc), ":root").get("--dl-space-4"));
  });

  it("cannot be broken out of its comment by the brand name", () => {
    const doc = patched(acmeDoc(), [{ op: "replace", path: "/brand/name", value: "Evil */ body{}" }]);
    expect(toThemeCss(doc).split("\n")[0]).toBe("/* Evil  body{} · Dialmade theme (DesignDoc v2) */");
  });
});

describe("toDTCGFull", () => {
  const doc = acmeDoc();
  const dtcg = toDTCGFull(doc);
  const tokens = collectTokens(dtcg);

  it("has every group", () => {
    expect(Object.keys(dtcg)).toEqual([
      "$description",
      "$extensions",
      "primitives",
      "semantic",
      "font",
      "font-weight",
      "typography",
      "dimension",
      "shadow",
      "duration",
      "cubic-bezier",
      "component",
    ]);
    for (const group of ["button", "card", "input", "badge", "nav", "table", "sidebar"]) expect(dtcg.component[group]).toBeDefined();
  });

  it("gives every token a valid $type and value", () => {
    const types = new Set(["color", "fontFamily", "fontWeight", "typography", "dimension", "shadow", "duration", "cubicBezier", "border"]);
    for (const [path, token] of tokens) {
      expect(types.has(token.$type!), `${path}: ${token.$type}`).toBe(true);
      if (token.$type === "dimension" && typeof token.$value === "object") {
        expect(token.$value, path).toMatchObject({ unit: "px" });
        expect(Number.isFinite((token.$value as { value: number }).value), path).toBe(true);
      }
      if (token.$type === "duration") expect(token.$value).toMatchObject({ unit: "ms" });
      if (token.$type === "fontFamily") expect(Array.isArray(token.$value)).toBe(true);
    }
    expect(tokens.get("cubic-bezier.ease")!.$value).toEqual([0.215, 0.61, 0.355, 1]);
  });

  it("only uses aliases that resolve to tokens of the same document", () => {
    const aliases = [...tokens.values()].flatMap((token) => aliasesIn(token.$value));
    expect(aliases.length).toBeGreaterThan(20);
    for (const alias of aliases) expect(tokens.has(alias), alias).toBe(true);
    expect(tokens.get("component.button.radius")!.$value).toBe("{dimension.radius.full}");
    expect(tokens.get("component.input.height")!.$value).toBe("{component.button.height-md}");
    expect(tokens.get("component.card.border")!.$value).toEqual({ color: "{semantic.border}", width: "{dimension.border-width}", style: "solid" });
    expect(tokens.get("typography.display")!.$value).toMatchObject({ fontFamily: "{font.heading}", fontSize: "{dimension.font-size.display}" });
  });

  it("matches the resolved tokens and keeps both modes for shadows", () => {
    const t = resolveTokens(doc, { ...resolveThemeInputs(doc), mode: "light" });
    expect(tokens.get("dimension.radius.md")!.$value).toEqual({ value: t.radius.md, unit: "px" });
    expect(tokens.get("dimension.space.4")!.$value).toEqual({ value: t.space[3], unit: "px" });
    expect(tokens.get("duration.base")!.$value).toEqual({ value: t.motion.base, unit: "ms" });
    expect(tokens.get("component.nav.height")!.$value).toEqual({ value: t.components.nav.h, unit: "px" });
    const shadow = tokens.get("shadow.md")!;
    const modes = (shadow.$extensions as any)["design.dialmade"].modes;
    expect(shadow.$value).toEqual(modes.light);
    expect(modes.dark[0].color.alpha).toBeGreaterThan(modes.light[0].color.alpha);
    expect(tokens.get("dimension.font-size.display")!.$extensions).toBeDefined();
  });

  it("applies color overrides to the semantic tokens", () => {
    const edited = patched(doc, [
      { op: "add", path: "/tokens/color/light/primary", value: "#ff0000" },
      { op: "add", path: "/tokens/color/dark/primary", value: "#00ff00" },
    ]);
    const semantic = toDTCGFull(edited).semantic.primary!;
    expect(semantic.$value.hex).toBe("#ff0000");
    expect((semantic.$extensions as any)["design.dialmade"].modes.dark.hex).toBe("#00ff00");
  });

  it("represents flat recipes with transparent shadows", () => {
    const flat = toDTCGFull(doc, { recipe: getStyleRecipe("minimal-swiss")! });
    const value = (flat.shadow.sm as Node).$value as { color: { alpha: number } }[];
    expect(value).toHaveLength(1);
    expect(value[0]!.color.alpha).toBe(0);
    expect(JSON.parse(JSON.stringify(flat))).toEqual(flat);
  });
});

describe("toDTCGFull: locks and provenance", () => {
  const doc = importedDoc();
  const dtcg = toDTCGFull(doc);
  const tokens = collectTokens(dtcg);
  const meta = (path: string) => (tokens.get(path)?.$extensions as Record<string, any> | undefined)?.["design.dialmade"];

  it("marks locked semantic colors with their modes and where they came from", () => {
    expect(meta("semantic.primary")).toMatchObject({
      locked: ["light"],
      provenance: [
        { sourceId: "src-1", fileName: "globals.css", format: "shadcn-oklch", locator: "globals.css:12 --primary", confidence: "exact", method: "declared", mode: "light" },
      ],
    });
    expect(meta("semantic.primary").modes.light.hex).toBe("#2f4fd0");
    const border = meta("semantic.border");
    expect(border.locked).toEqual(["dark"]);
    expect(border.provenance[0]).toMatchObject({ locator: "globals.css:58 --border", mode: "dark" });
    expect(border.modes.dark).toMatchObject({ hex: "#ffffff", alpha: 0.1 });
  });

  it("marks locked dimensions and fonts, with provenance from fields at or below them", () => {
    expect(meta("dimension.radius.md")).toEqual({
      locked: true,
      provenance: [{ sourceId: "src-1", fileName: "globals.css", format: "shadcn-oklch", locator: "globals.css:40 --radius", confidence: "high", method: "declared" }],
    });
    expect(tokens.get("dimension.radius.md")!.$value).toEqual({ value: 10, unit: "px" });
    expect(meta("font.heading")).toMatchObject({ locked: true, provenance: [{ locator: "globals.css:129 --font-heading", confidence: "medium", method: "named" }] });
    expect(tokens.get("font.heading")!.$value).toEqual(["Brand Grotesk", "Arimo", "system-ui", "sans-serif"]);
    expect(tokens.get("typography.h1")!.$value).toMatchObject({ lineHeight: 1.1, fontWeight: 700 });
  });

  it("leaves stored but unlocked values without provenance unannotated", () => {
    expect(tokens.get("dimension.space.4")!.$value).toEqual({ value: 18, unit: "px" });
    expect(meta("dimension.space.4")).toBeUndefined();
    expect(meta("semantic.input")).not.toHaveProperty("locked");
    expect(meta("semantic.input")).not.toHaveProperty("provenance");
    expect(meta("dimension.radius.sm")).toBeUndefined();
  });

  it("lists the locks and the imported files (never fields or contents) at the root", () => {
    const root = dtcg.$extensions["design.dialmade"] as Record<string, any>;
    expect(root.locks).toEqual(doc.brief.locks);
    expect(root.imports).toEqual([
      {
        sourceId: "src-1",
        kind: "css",
        format: "shadcn-oklch",
        fileName: "globals.css",
        sha256: IMPORT_SHA,
        bytes: 4096,
        parser: "css@1.0.0",
        ownership: "own",
        rightsConfirmedAt: doc.provenance.createdAt,
      },
    ]);
  });

  it("only uses aliases that resolve, also with imported values", () => {
    for (const alias of [...tokens.values()].flatMap((token) => aliasesIn(token.$value))) expect(tokens.has(alias), alias).toBe(true);
  });

  it("drops the lock marks after «Desbloquear» and adds provenance for new imports", () => {
    const unlocked = unlock(doc, "/tokens/radius/md");
    if (!unlocked.ok) throw new Error(unlocked.error.message);
    const after = collectTokens(toDTCGFull(unlocked.doc));
    expect((after.get("dimension.radius.md")!.$extensions as any)["design.dialmade"]).not.toHaveProperty("locked");
    const imported = applyImport(doc, {
      source: { sourceId: "src-2", kind: "tokens", format: "dtcg-2025.10", fileName: "tokens.json", sha256: IMPORT_SHA, bytes: 900, parser: "dtcg@1.0.0", ownership: "own" },
      values: [{ path: "/tokens/space/4", value: 20, locator: "#/space/4", confidence: "exact", method: "declared" }],
    });
    if (!imported.ok) throw new Error(imported.error.message);
    const space = (collectTokens(toDTCGFull(imported.doc)).get("dimension.space.4")!.$extensions as any)["design.dialmade"];
    expect(space).toEqual({
      locked: true,
      provenance: [{ sourceId: "src-2", fileName: "tokens.json", format: "dtcg-2025.10", locator: "#/space/4", confidence: "exact", method: "declared" }],
    });
  });

  it("marks the steps of a locked 50–950 scale", () => {
    const locked = lock(acmeDoc(), "/tokens/color/scales/brand", { value: { "500": "#2f4fd0" } });
    if (!locked.ok) throw new Error(locked.error.message);
    const out = collectTokens(toDTCGFull(locked.doc));
    expect((out.get("primitives.brand.500")!.$value as { hex: string }).hex).toBe("#2f4fd0");
    expect((out.get("primitives.brand.500")!.$extensions as any)["design.dialmade"]).toEqual({ locked: true });
    expect((out.get("primitives.brand.600")!.$extensions as any)?.["design.dialmade"]).toEqual({ locked: true });
    expect(out.get("primitives.neutral.500")!.$extensions).toBeUndefined();
  });

  it("adds nothing to a doc without imports or locks", () => {
    const plain = JSON.stringify(toDTCGFull(acmeDoc()));
    expect(plain).not.toContain('"locked"');
    expect(plain).not.toContain('"provenance"');
    expect(plain).not.toContain('"imports"');
  });
});

describe("toThemeCss: imported colors", () => {
  it("keeps the alpha of the imported dark --border and --input", () => {
    const css = toThemeCss(importedDoc());
    const dark = cssBlock(css, ".dark");
    expect(dark.get("--border")).toBe("oklch(1 0 0 / 0.1)");
    expect(dark.get("--input")).toBe("oklch(1 0 0 / 0.15)");
    expect(cssBlock(css, ":root").get("--primary")).toBe("oklch(0.489 0.202 267.36)");
    expect(cssBlock(toThemeCss(importedDoc(), { colorFormat: "hex" }), ".dark").get("--border")).toBe("#ffffff1a");
  });
});

describe("toFigmaNumberVars", () => {
  it("exports radius, space and component numbers with scopes", () => {
    const doc = acmeDoc();
    const vars = toFigmaNumberVars(doc);
    const tokens = collectTokens(vars);
    const t = resolveTokens(doc, { ...resolveThemeInputs(doc), mode: "light" });
    for (const [path, token] of tokens) {
      expect(token.$type, path).toBe("number");
      expect(typeof token.$value, path).toBe("number");
      expect((token as any).$extensions["com.figma.scopes"].length, path).toBeGreaterThan(0);
    }
    expect(tokens.get("radius.md")!.$value).toBe(t.radius.md);
    expect(tokens.get("radius.full")!.$value).toBe(9999);
    expect(tokens.get("space.1")!.$value).toBe(t.space[0]);
    expect(tokens.get("space.10")!.$value).toBe(t.space[9]);
    expect(tokens.get("component.button.radius")!.$value).toBe(9999);
    expect(tokens.get("component.card.padding")!.$value).toBe(t.components.card.padding.px);
    expect(tokens.get("component.input.height")!.$value).toBe(t.components.button.hMd);
    expect(tokens.get("component.sidebar.width")!.$value).toBe(256);
    expect((tokens.get("radius.sm") as any).$extensions["com.figma.scopes"]).toEqual(["CORNER_RADIUS"]);
    expect(JSON.stringify(vars)).not.toMatch(/"\{|px"/);
  });
});

describe("toDesignMd", () => {
  it("writes valid frontmatter in kebab-case with resolvable references", () => {
    const doc = acmeDoc();
    const { data } = frontmatter(toDesignMd(doc));
    expect(data.version).toBe("alpha");
    expect(data.name).toBe("Acme Cloud");
    expect(data.description).toBe("Ship faster, sleep better");
    expect(Object.keys(data)).toEqual(["version", "name", "description", "colors", "typography", "rounded", "spacing", "components"]);

    const names = [data.colors, data.typography, data.rounded, data.spacing, data.components].flatMap((group) => Object.keys(group));
    for (const name of names) expect(name, name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const [name, value] of Object.entries(data.colors)) expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
    expect(data.colors.primary).toBe(resolveTokens(doc, { ...resolveThemeInputs(doc), mode: "light" }).colors.primary);
    expect(data.colors["brand-500"]).toMatch(/^#/);
    for (const value of Object.values(data.rounded)) expect(value).toMatch(/^\d+px$/);
    for (const value of Object.values(data.spacing)) expect(value).toMatch(/^\d+px$/);
    for (const [name, style] of Object.entries<Record<string, unknown>>(data.typography)) {
      expect(style.fontSize, name).toMatch(/^\d+px$/);
      expect(typeof style.fontWeight, name).toBe("number");
      expect(typeof style.lineHeight, name).toBe("number");
    }

    const allowed = new Set(["backgroundColor", "textColor", "typography", "rounded", "padding", "size", "height", "width"]);
    for (const [component, props] of Object.entries<Record<string, string>>(data.components)) {
      for (const [prop, value] of Object.entries(props)) {
        expect(allowed.has(prop), `${component}.${prop}`).toBe(true);
        const ref = /^\{(\w+)\.([\w-]+)\}$/.exec(value);
        if (ref) expect(data[ref[1]!]?.[ref[2]!], `${component}.${prop} → ${value}`).toBeDefined();
        else expect(value, `${component}.${prop}`).toMatch(/^\d+px$/);
      }
    }
    expect(data.components["button-primary"].rounded).toBe("{rounded.full}");
  });

  it("has the spec sections in order, in either language", () => {
    const order = ["## Overview", "## Colors", "## Typography", "## Layout", "## Elevation & Depth", "## Shapes", "## Components", "## Do's and Don'ts"];
    for (const locale of ["es", "en"] as const) {
      const { body } = frontmatter(toDesignMd(acmeDoc(), { locale }));
      const headings = body.split("\n").filter((line) => line.startsWith("## "));
      const known = headings.filter((h) => order.includes(h));
      expect(known).toEqual(order);
      expect(new Set(headings).size).toBe(headings.length);
      expect(body).toContain("# Acme Cloud");
    }
    expect(toDesignMd(acmeDoc(), { locale: "es" })).toContain("Todos los pares de texto y UI cumplen WCAG 2.2 AA");
    expect(toDesignMd(acmeDoc(), { locale: "en" })).toContain("Every text and UI pair meets WCAG 2.2 AA");
  });

  it("uses the preferred mode and documents flat styles", () => {
    const mono = monoDoc();
    const inputs = resolveThemeInputs(mono);
    const dark = resolveTokens(mono, { ...inputs, mode: "dark" });
    const { data, body } = frontmatter(toDesignMd(mono));
    expect(data.colors.background).toBe(dark.colors.background);
    expect(body).toContain("Modo por defecto: Oscuro");

    const flat = toDesignMd(acmeDoc(), { recipe: getStyleRecipe("minimal-swiss")!, locale: "en" });
    expect(flat).toContain("This style uses no shadows");
    expect(flat).toContain("Don't add shadows");
  });

  it("outlines the pages with resolved bindings and hidden sections", () => {
    const doc = patched(acmeDoc(), [
      { op: "add", path: "/pages/landing/elements/hero-1/props/title", value: { bind: "brand.name" } },
      { op: "add", path: "/pages/landing/elements/hero-1/props/subtitle", value: "Deploy in seconds" },
      { op: "add", path: "/pages/landing/hidden", value: ["features-1"] },
    ]);
    const md = toDesignMd(doc, { locale: "en" });
    expect(md).toContain('- Hero (`landing.hero`) — title: "Acme Cloud" · subtitle: "Deploy in seconds"');
    expect(md).toContain("- Features (`landing.features`) — hidden");
    expect(md.indexOf("### Landing page")).toBeLessThan(md.indexOf("### Style guide"));
  });

  it("is deterministic", () => {
    expect(toDesignMd(acmeDoc())).toBe(toDesignMd(acmeDoc()));
  });
});

describe("toPromptPack", () => {
  const doc = acmeDoc();

  it.each(PROMPT_TARGETS.flatMap((target) => (["es", "en"] as const).map((locale) => [target, locale] as const)))(
    "%s (%s) carries the exact direction",
    (target, locale) => {
      const text = toPromptPack(doc, target, locale);
      const t = resolveTokens(doc, { ...resolveThemeInputs(doc), mode: "light" });
      expect(text.startsWith("# Acme Cloud: ")).toBe(true);
      expect(text).toContain(t.colors.primary!);
      expect(text).toContain(t.colors.cta!);
      expect(text).toContain("https://fonts.googleapis.com/css2?family=Inter");
      expect(text).toContain("landing.hero");
      expect(text).toContain("GSAP");
      expect(text).toContain(locale === "es" ? "## Pasos" : "## Steps");
      expect(text).toBe(toPromptPack(acmeDoc(), target, locale));
    },
  );

  it("gives concrete instructions per target", () => {
    const figma = toPromptPack(doc, "figma", "en");
    expect(figma).toContain("`use_figma`");
    expect(figma).toContain("`generate_figma_design`");
    expect(figma).toContain("not Claude Desktop");
    expect(figma).toContain(EXPORT_FILES.figmaNumbers);

    const framer = toPromptPack(doc, "framer", "es");
    expect(framer).toContain("npx @framer/agent@latest setup");
    expect(framer).toContain("`/framer`");
    expect(framer).toContain("framer-motion");

    const claudeDesign = toPromptPack(doc, "claude-design", "en");
    expect(claudeDesign).toContain("Design System");
    expect(claudeDesign).toContain("exact hex values and roles");

    const v0 = toPromptPack(doc, "v0", "en");
    expect(v0).toContain("```css");
    expect(v0).toContain(toThemeCss(doc).trimEnd());

    const cursor = toPromptPack(doc, "cursor", "en");
    expect(cursor).toContain(".cursor/rules/dialmade-design.mdc");
    expect(cursor).toContain("alwaysApply: true");

    expect(toPromptPack(doc, "claude", "es")).toContain("Construye «Landing page» para Acme Cloud");
  });

  it("defaults to the doc locale and outlines the focus page even before it exists", () => {
    const mono = monoDoc();
    const text = toPromptPack(mono, "claude");
    expect(text).toContain("## Pasos");
    expect(text).toContain("**Dashboard y componentes**");
    expect(text).toContain("app.kpiRow");
  });
});

describe("toYaml", () => {
  it("quotes strings and keys that need it", () => {
    expect(toYaml({ a: "x: y", "2xl": "8px", n: 1, nested: { "b-c": true }, skip: undefined })).toBe(
      'a: "x: y"\n"2xl": "8px"\nn: 1\nnested:\n  b-c: true',
    );
  });
});
