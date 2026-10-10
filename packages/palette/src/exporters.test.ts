import { formatHex, formatHex8, parse } from "culori";
import { describe, expect, it } from "vitest";
import { hexToRgb, parseColorWithAlpha } from "./color";
import {
  DTCG_EXTENSION,
  ROLE_KEYS,
  cssVarName,
  scaleGroups,
  toCssVarRecord,
  toCssVars,
  toDTCG,
  toFigmaTokens,
  toGlobalsCss,
  toTailwindTheme,
} from "./exporters";
import { generateTheme, type Theme } from "./theme";

const HEX = /^#[0-9a-f]{6}$/;
const themes: Theme[] = [
  generateTheme({ primary: "#3a5bd9", secondary: "#f0a024" }),
  generateTheme({ primary: "#171717" }),
  generateTheme({ primary: "#e11d48", style: "neon" }),
  generateTheme({ primary: "#facc15", style: "pastel" }),
];

type Token = { $type: string; $value: Record<string, unknown>; $extensions?: Record<string, unknown> };

function collectTokens(node: unknown, path: string[] = [], out: [string, Token][] = []): [string, Token][] {
  if (typeof node !== "object" || node === null) return out;
  if ("$value" in node) {
    out.push([path.join("."), node as Token]);
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith("$")) collectTokens(child, [...path, key], out);
  }
  return out;
}

function cssDeclarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return new Map([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!]));
}

describe("cssVarName", () => {
  it("converts role keys to shadcn variable names", () => {
    expect(cssVarName("primaryForeground")).toBe("primary-foreground");
    expect(cssVarName("chart1")).toBe("chart-1");
    expect(cssVarName("borderStrong")).toBe("border-strong");
    expect(cssVarName("primaryText")).toBe("primary-text");
  });
});

describe("toCssVars", () => {
  it.each(themes)("emits every role in :root and .dark with exact colors", (theme) => {
    const css = toCssVars(theme);
    for (const [selector, roles] of [[":root", theme.light], [".dark", theme.dark]] as const) {
      const vars = cssDeclarations(css, selector);
      for (const key of ROLE_KEYS) {
        const value = vars.get(cssVarName(key));
        expect(value, `${selector} --${cssVarName(key)}`).toMatch(/^oklch\(/);
        expect(formatHex(parse(value!))).toBe(roles[key]);
      }
      expect(vars.get("sidebar-primary")).toBe("var(--primary)");
    }
    for (const name of ["brand", "cta", "cta-foreground", "primary-text", "border-strong"]) {
      expect(css).toContain(`--${name}:`);
    }
    const root = cssDeclarations(css, ":root");
    for (const s of theme.scales.brand) expect(formatHex(parse(root.get(`color-brand-${s.step}`)!))).toBe(s.hex);
    expect(cssDeclarations(css, ".dark").has("color-brand-500")).toBe(false);
  });

  it("can emit hex instead of oklch", () => {
    const vars = cssDeclarations(toCssVars(themes[0]!, { format: "hex" }), ":root");
    expect(vars.get("primary")).toBe(themes[0]!.light.primary);
    expect(vars.get("color-cta-500")).toMatch(HEX);
  });
});

describe("toCssVarRecord", () => {
  it.each(themes)("matches toCssVars declarations for each mode", (theme) => {
    const css = toCssVars(theme);
    for (const [mode, selector] of [["light", ":root"], ["dark", ".dark"]] as const) {
      const record = toCssVarRecord(theme, mode);
      for (const [name, value] of cssDeclarations(css, selector)) expect(record[`--${name}`], name).toBe(value);
    }
  });

  it.each(themes)("includes every role, the sidebar aliases and every scale in both modes", (theme) => {
    for (const mode of ["light", "dark"] as const) {
      const roles = mode === "light" ? theme.light : theme.dark;
      const record = toCssVarRecord(theme, mode, { format: "hex" });
      for (const key of ROLE_KEYS) expect(record[`--${cssVarName(key)}`]).toBe(roles[key]);
      expect(record["--sidebar"]).toBe("var(--card)");
      expect(record["--sidebar-ring"]).toBe("var(--ring)");
      for (const [name, steps] of scaleGroups(theme)) {
        for (const s of steps) expect(record[`--color-${name}-${s.step}`]).toBe(s.hex);
      }
      expect(record["--color-neutral-500"]).toMatch(HEX);
      expect(Object.keys(record).every((name) => name.startsWith("--"))).toBe(true);
    }
    expect(Object.keys(toCssVarRecord(theme, "light"))).toEqual(Object.keys(toCssVarRecord(theme, "dark")));
  });
});

describe("toTailwindTheme", () => {
  it("maps roles to utilities and inlines the brand scale without self references", () => {
    const tw = toTailwindTheme(themes[0]!);
    expect(tw.startsWith("@theme inline {")).toBe(true);
    expect(tw).toContain("--color-primary: var(--primary);");
    expect(tw).toContain("--color-primary-foreground: var(--primary-foreground);");
    expect(tw).toContain("--color-cta: var(--cta);");
    expect(tw).toContain("--color-chart-1: var(--chart-1);");
    expect(tw).toMatch(/--color-brand-500: oklch\([\d. ]+\);/);
    expect(tw).toMatch(/--color-cta-950: oklch\(/);
    expect(tw).not.toMatch(/--color-brand-\d+: var\(/);
  });

  it("toGlobalsCss wires Tailwind, the dark variant, variables and base styles", () => {
    const css = toGlobalsCss(themes[0]!);
    expect(css).toContain('@import "tailwindcss";');
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
    expect(css).toContain(":root {");
    expect(css).toContain("@theme inline {");
    expect(css).toContain("@apply bg-background text-foreground;");
  });
});

describe("toDTCG", () => {
  it.each(themes)("follows the DTCG 2025.10 color shape (oklch components + hex)", (theme) => {
    const doc = JSON.parse(JSON.stringify(toDTCG(theme))) as Record<string, unknown>;
    const tokens = collectTokens(doc);
    expect(tokens.length).toBeGreaterThan(ROLE_KEYS.length + 60);
    for (const [name, token] of tokens) {
      for (const segment of name.split(".")) expect(segment).toMatch(/^[^${}.][^{}.]*$/);
      expect(token.$type).toBe("color");
      const values = [token.$value];
      const modes = (token.$extensions?.[DTCG_EXTENSION] as { modes?: Record<string, Record<string, unknown>> } | undefined)?.modes;
      if (name.startsWith("semantic.")) {
        expect(Object.keys(modes ?? {})).toEqual(["light", "dark"]);
        values.push(modes!.light!, modes!.dark!);
        expect(modes!.light).toEqual(token.$value);
      }
      for (const value of values) {
        expect(Object.keys(value).sort()).toEqual(["colorSpace", "components", "hex"]);
        expect(value.colorSpace).toBe("oklch");
        expect(value.hex).toMatch(HEX);
        const [l, c, h] = value.components as number[];
        expect([l, c, h].every(Number.isFinite)).toBe(true);
        expect(l).toBeGreaterThanOrEqual(0);
        expect(l).toBeLessThanOrEqual(1);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
        expect(formatHex({ mode: "oklch", l: l!, c: c!, h: h! })).toBe(value.hex);
      }
    }
    const semantic = doc.semantic as Record<string, Token>;
    expect(semantic.primary!.$value.hex).toBe(theme.light.primary);
    const darkPrimary = (semantic.primary!.$extensions![DTCG_EXTENSION] as { modes: Record<string, { hex: string }> }).modes.dark!;
    expect(darkPrimary.hex).toBe(theme.dark.primary);
    expect(Object.keys(doc.primitives as object)).toContain("neutral");
  });

  it("records style, seeds and modes at the root", () => {
    const doc = toDTCG(themes[2]!);
    expect(doc.$extensions[DTCG_EXTENSION]).toMatchObject({ styleId: "neon", modes: ["light", "dark"], defaultMode: "dark" });
    expect(Object.keys(doc.primitives)).toEqual(["brand", "neutral", "success", "warning", "error", "info"]);
    expect(Object.keys(toDTCG(themes[0]!).primitives)).toEqual(["brand", "cta", "neutral", "success", "warning", "error", "info"]);
  });
});

describe("toFigmaTokens", () => {
  it.each(themes)("uses only sRGB with components in 0..1 matching the hex", (theme) => {
    for (const mode of ["light", "dark"] as const) {
      const doc = toFigmaTokens(theme, mode);
      expect(Object.keys(doc)).toEqual(["color"]);
      const json = JSON.stringify(doc);
      expect(json).not.toContain("oklch");
      for (const [, token] of collectTokens(doc)) {
        const value = token.$value as { colorSpace: string; components: number[]; alpha: number; hex: string };
        expect(token.$type).toBe("color");
        expect(value.colorSpace).toBe("srgb");
        expect(value.alpha).toBe(1);
        expect(value.hex).toMatch(HEX);
        expect(value.components).toHaveLength(3);
        value.components.forEach((v, i) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
          expect(Math.round(v * 255)).toBe(hexToRgb(value.hex)[i]);
        });
      }
      const roles = mode === "light" ? theme.light : theme.dark;
      expect(doc.color.primary!.$value.hex).toBe(roles.primary);
      expect(doc.color["primary-foreground"]!.$value.hex).toBe(roles.primaryForeground);
      expect(doc.color["brand-500"]).toBeDefined();
    }
    expect(Object.keys(toFigmaTokens(theme, "light").color)).toEqual(Object.keys(toFigmaTokens(theme, "dark").color));
  });
});

describe("translucent roles", () => {
  // shadcn-style dark tokens with alpha, as a globals.css import would pin them.
  const theme = generateTheme({
    primary: "#3a5bd9",
    pinned: {
      dark: {
        background: "oklch(0.145 0 0)",
        border: "oklch(1 0 0 / 10%)",
        input: "oklch(1 0 0 / 15%)",
        ring: "oklch(0.556 0 0)",
      },
    },
  });

  it("round-trips alpha through CSS, DTCG and Figma", () => {
    expect(theme.dark.border).toBe("#ffffff1a");
    expect(theme.dark.input).toBe("#ffffff26");

    const dark = cssDeclarations(toCssVars(theme), ".dark");
    expect(dark.get("border")).toBe("oklch(1 0 0 / 0.1)");
    expect(dark.get("input")).toBe("oklch(1 0 0 / 0.15)");
    for (const name of ["border", "input", "background", "ring"] as const) {
      expect(parseColorWithAlpha(dark.get(name)!)).toBe(theme.dark[name]);
    }
    expect(formatHex8(parse(dark.get("border")!))).toBe("#ffffff1a");
    expect(formatHex8(parse(dark.get("input")!))).toBe("#ffffff26");
    expect(cssDeclarations(toCssVars(theme, { format: "hex" }), ".dark").get("border")).toBe("#ffffff1a");
    expect(toCssVarRecord(theme, "dark")["--input"]).toBe("oklch(1 0 0 / 0.15)");
    expect(toGlobalsCss(theme)).toContain("--border: oklch(1 0 0 / 0.1);");

    const semantic = toDTCG(theme).semantic;
    const modes = semantic.border!.$extensions![DTCG_EXTENSION] as { modes: Record<string, unknown> };
    expect(modes.modes.dark).toEqual({ colorSpace: "oklch", components: [1, 0, 0], alpha: 0.1, hex: "#ffffff" });
    expect(modes.modes.light).not.toHaveProperty("alpha");
    expect(semantic.border!.$value).not.toHaveProperty("alpha");

    const figma = toFigmaTokens(theme, "dark").color;
    expect(figma.border!.$value).toEqual({ colorSpace: "srgb", components: [1, 1, 1], alpha: 0.1, hex: "#ffffff" });
    expect(figma.input!.$value.alpha).toBe(0.15);
    expect(toFigmaTokens(theme, "light").color.border!.$value.alpha).toBe(1);
  });

  it("re-importing the exported CSS gives back the same theme", () => {
    const dark = cssDeclarations(toCssVars(theme), ".dark");
    const pinned = Object.fromEntries(ROLE_KEYS.map((key) => [key, dark.get(cssVarName(key))!]));
    const again = generateTheme({ primary: "#3a5bd9", pinned: { dark: pinned } });
    expect(again.dark).toEqual(theme.dark);
  });
});
