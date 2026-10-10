import { describe, expect, it } from "vitest";
import { normalizeColor } from "../color";
import {
  frameworkDefaultWarnings,
  isFrameworkDefault,
  isShadcnDefault,
  isTailwindDefaultVar,
  matchTailwindColor,
  tailwindDefaultColor,
} from "./defaults";
import { TAILWIND_THEME_VARS, TAILWIND_VERSION } from "./tailwind.generated";

const color = (css: string) => {
  const r = normalizeColor(css);
  if (!r.ok) throw new Error(css);
  return r.color;
};

describe("Tailwind defaults", () => {
  it("are copied from tailwindcss 4.3.3", () => {
    expect(TAILWIND_VERSION).toBe("4.3.3");
    expect(TAILWIND_THEME_VARS["--color-blue-500"]).toMatch(/^oklch\(/);
    expect(TAILWIND_THEME_VARS["--spacing"]).toBe("0.25rem");
    expect(Object.keys(TAILWIND_THEME_VARS).filter((k) => k.startsWith("--color-")).length).toBeGreaterThan(280);
  });

  it("matches palette colors and default variables", () => {
    expect(tailwindDefaultColor("blue", 500)?.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(matchTailwindColor(color(TAILWIND_THEME_VARS["--color-emerald-600"]!))).toEqual({ group: "emerald", step: 600 });
    expect(matchTailwindColor(color("#3a5bd9"))).toBeUndefined();
    expect(matchTailwindColor(color("#ffffff"))).toBeUndefined();
    expect(isTailwindDefaultVar("--radius-lg", " 0.5rem ")).toBe(true);
    expect(isTailwindDefaultVar("--radius-lg", "0.75rem")).toBe(false);
    expect(isTailwindDefaultVar("--font-serif", 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif')).toBe(true);
  });
});

describe("shadcn base", () => {
  it("knows the neutral theme, including alpha borders in dark mode", () => {
    expect(isShadcnDefault(color("oklch(0.205 0 0)"), "light", "primary")).toBe(true);
    expect(isShadcnDefault(color("oklch(1 0 0)"), "light", "background")).toBe(true);
    expect(isShadcnDefault(color("oklch(1 0 0 / 10%)"), "dark", "border")).toBe(true);
    expect(isShadcnDefault(color("oklch(1 0 0)"), "dark", "border")).toBe(false);
    expect(isShadcnDefault(color("oklch(0.646 0.222 41.116)"), "light", "chart1")).toBe(true);
    expect(isShadcnDefault(color("oklch(0.55 0.2 264)"), "light", "primary")).toBe(false);
  });

  it("knows the other base colors (zinc, slate…)", () => {
    expect(isShadcnDefault(color(TAILWIND_THEME_VARS["--color-zinc-900"]!), "light", "primary")).toBe(true);
    expect(isShadcnDefault(color(TAILWIND_THEME_VARS["--color-slate-800"]!), "dark", "secondary")).toBe(true);
  });

  it("flags defaults by role or by scale step, never a brand color", () => {
    expect(isFrameworkDefault({ ...color("oklch(0.205 0 0)"), role: "primary" })).toBe(true);
    expect(isFrameworkDefault({ ...color(TAILWIND_THEME_VARS["--color-red-500"]!), scale: { group: "red", step: 500 } })).toBe(true);
    expect(isFrameworkDefault({ ...color(TAILWIND_THEME_VARS["--color-red-500"]!), scale: { group: "brand", step: 500 } })).toBe(false);
    expect(isFrameworkDefault({ ...color("#3a5bd9"), role: "primary" })).toBe(false);
  });

  it("warns when a file is an untouched shadcn theme", () => {
    const roles = Array.from({ length: 10 }, (_, i) => ({ sourceId: "css-a", role: "primary" as const, isFrameworkDefault: i < 9 }));
    expect(frameworkDefaultWarnings(roles)).toEqual([{ sourceId: "css-a", code: "framework-default-theme", detail: "9/10" }]);
    expect(frameworkDefaultWarnings(roles.slice(0, 5))).toEqual([]);
  });
});
