import { describe, expect, it } from "vitest";
import { contrastIssues, fixContrast, themeColorsFromVars, type ThemeColors } from "./contrast";
import { attr, elements, parseSanitized, type AiElement } from "./tree";

/** A shadcn-like theme: `accent` is a light tint (the probe's failing case). */
const theme: ThemeColors = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#ffffff",
    "card-foreground": "#0a0a0a",
    primary: "#1d4ed8",
    "primary-foreground": "#ffffff",
    "primary-hover": "#1e40af",
    accent: "#e0e7ff",
    "accent-foreground": "#1e1b4b",
    muted: "#f4f4f5",
    "muted-foreground": "#71717a",
    cta: "#f97316",
    "cta-foreground": "#0a0a0a",
    "cta-hover": "#ea580c",
    "cta-600": "#c2410c",
    ring: "#93c5fd",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#111111",
    "card-foreground": "#fafafa",
    primary: "#3b82f6",
    "primary-foreground": "#0a0a0a",
    "primary-hover": "#60a5fa",
    accent: "#1e1b4b",
    "accent-foreground": "#e0e7ff",
    muted: "#27272a",
    "muted-foreground": "#a1a1aa",
    cta: "#fb923c",
    "cta-foreground": "#0a0a0a",
    "cta-hover": "#fdba74",
    "cta-600": "#c2410c",
    ring: "#1e3a8a",
  },
};

const tree = (html: string) => parseSanitized(html)[0] as AiElement;
const classOf = (root: AiElement, tag: string) => [...elements([root])].find((el) => el.tag === tag) && attr([...elements([root])].find((el) => el.tag === tag)!, "class");

describe("gate 4: contrast on tokens", () => {
  it("passes paired tokens in both modes", () => {
    expect(contrastIssues(tree('<section class="bg-primary text-primary-foreground"><p>ok</p></section>'), theme)).toEqual([]);
  });

  it("samples both ends of a gradient and fixes the end (the probe's case)", () => {
    const root = tree('<section class="bg-linear-to-r from-primary to-accent text-primary-foreground"><h2 class="text-body">Hola</h2></section>');
    expect(contrastIssues(root, theme).length).toBeGreaterThan(0);
    const result = fixContrast(root, theme);
    expect(result.status).toBe("fixed");
    expect(attr(root, "class")).toContain("to-primary-hover");
  });

  it("muted text on muted gets the paired foreground", () => {
    const root = tree('<div class="bg-muted"><p class="text-muted-foreground/60">Low</p></div>');
    const result = fixContrast(root, theme);
    expect(result.status).toBe("fixed");
    expect(classOf(root, "p")).toBe("text-foreground");
  });

  it("a scale step used as hover fill becomes the state token", () => {
    const root = tree('<div><a class="bg-cta text-cta-foreground hover:bg-cta-600">Go</a></div>');
    fixContrast(root, theme);
    expect(classOf(root, "a")).toContain("hover:bg-cta-hover");
  });

  it("checks the focus outline against the parent and swaps it when it does not show", () => {
    const root = tree('<div class="bg-background"><a class="text-foreground focus-visible:outline-ring">Go</a></div>');
    expect(contrastIssues(root, theme).some((issue) => issue.kind === "focus")).toBe(true);
    fixContrast(root, theme);
    expect(classOf(root, "a")).toContain("focus-visible:outline-foreground");
  });

  it("large type needs 3:1 only", () => {
    const root = tree('<div class="bg-background"><h2 class="text-h2 text-muted-foreground">Big</h2></div>');
    expect(contrastIssues(root, theme)).toEqual([]);
  });

  it("warns when no rule fixes it, and never touches the palette", () => {
    const impossible: ThemeColors = { light: { ...theme.light, foreground: "#777777", background: "#7a7a7a", "primary-foreground": "#787878", card: "#7b7b7b", "card-foreground": "#797979" }, dark: theme.dark };
    const result = fixContrast(tree('<div class="bg-background"><p class="text-foreground">x</p></div>'), impossible);
    expect(result.status).toBe("warn");
    expect(impossible.light.foreground).toBe("#777777");
  });

  it("reads theme vars with var() references and oklch", () => {
    const colors = themeColorsFromVars({ "--primary": "oklch(0.5 0.2 260)", "--color-cta-500": "var(--color-brand-500)", "--color-brand-500": "#ff0000", "--dl-radius-sm": "4px" });
    expect(colors.primary).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors["cta-500"]).toBe("#ff0000");
    expect(colors["dl-radius-sm"]).toBeUndefined();
  });
});
