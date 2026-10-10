import { PALETTE_STYLE_IDS, contrastRatio, generateTheme } from "@dialmade/palette";
import { describe, expect, it } from "vitest";
import { STATE_COLOR_VARS, hoverFill, mutedTextOn, stateColorVars } from "./stateColors";

const SEEDS = ["#0f9e8e", "#fff3b0", "#7c5cff", "#e8573f", "#f9d5e5", "#1b2a4a", "#ff5a36", "#3a5bd9", "#171717", "#f0a024", "#22c55e", "#ffffff"];
const PAIRS = [
  ["--primary-hover", "primary", "primary-foreground"],
  ["--secondary-hover", "secondary", "secondary-foreground"],
  ["--cta-hover", "cta", "cta-foreground"],
  ["--destructive-hover", "destructive", "destructive-foreground"],
] as const;

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as "primary";

describe("state colors", () => {
  it("hoverFill moves away from the text: lighter under dark text, darker under light text", () => {
    expect(contrastRatio(hoverFill("#fff3b0", "#1a1a1a"), "#1a1a1a")).toBeGreaterThan(contrastRatio("#fff3b0", "#1a1a1a"));
    expect(contrastRatio(hoverFill("#7c5cff", "#ffffff"), "#ffffff")).toBeGreaterThan(contrastRatio("#7c5cff", "#ffffff"));
  });

  it("mutedTextOn keeps AA, and falls back to the text without headroom", () => {
    const muted = mutedTextOn("#3a5bd9", "#ffffff");
    expect(muted).not.toBe("#ffffff");
    expect(contrastRatio(muted, "#3a5bd9")).toBeGreaterThanOrEqual(4.5);
    expect(mutedTextOn("#777777", "#ffffff")).toBe("#ffffff");
  });

  it("never lowers the contrast of a solid control's text on hover, for every seed, style and mode", () => {
    for (const primary of SEEDS) {
      for (const style of PALETTE_STYLE_IDS) {
        const theme = generateTheme({ primary, style });
        for (const mode of ["light", "dark"] as const) {
          const roles = theme[mode];
          const vars = stateColorVars(theme, mode, { format: "hex" });
          expect(Object.keys(vars)).toEqual([...STATE_COLOR_VARS]);
          const where = `${primary} ${style} ${mode}`;
          for (const [name, fill, text] of PAIRS) {
            const base = contrastRatio(roles[camel(text)], roles[camel(fill)]);
            const hover = contrastRatio(roles[camel(text)], vars[name]!);
            expect(hover, `${where} ${name}`).toBeGreaterThanOrEqual(Math.min(base, 4.5) - 0.01);
          }
          const inverted = contrastRatio(roles.primary, vars["--primary-foreground-hover"]!);
          expect(inverted, `${where} inverted`).toBeGreaterThanOrEqual(Math.min(contrastRatio(roles.primary, roles.primaryForeground), 4.5) - 0.01);
          const muted = contrastRatio(vars["--primary-foreground-muted"]!, roles.primary);
          expect(muted, `${where} muted`).toBeGreaterThanOrEqual(Math.min(contrastRatio(roles.primaryForeground, roles.primary), 4.5) - 0.01);
        }
      }
    }
  });

  it("a translucent role keeps its alpha in its hover variant", () => {
    const theme = generateTheme({ primary: "#3a5bd9" });
    const vars = stateColorVars(theme, "dark", { format: "hex", overrides: { secondary: "#ffffff1a" } });
    expect(vars["--secondary-hover"]).toMatch(/^#[0-9a-f]{6}1a$/);
    expect(stateColorVars(theme, "dark", { overrides: { secondary: "#ffffff1a" } })["--secondary-hover"]).toMatch(/\/ 0\.1\)$/);
  });

  it("follows the doc's role overrides", () => {
    const theme = generateTheme({ primary: "#3a5bd9" });
    const vars = stateColorVars(theme, "light", { format: "hex", overrides: { primary: "#fff3b0", "primary-foreground": "#111111" } });
    expect(contrastRatio(vars["--primary-hover"]!, "#111111")).toBeGreaterThan(contrastRatio("#fff3b0", "#111111"));
  });
});
