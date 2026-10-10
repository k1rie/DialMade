import { describe, expect, it } from "vitest";
import { loadFontMatcher } from "./index";
import { isSystemFamily, splitFontStack } from "./stack";

describe("font stacks", () => {
  it("splits on top-level commas and unquotes", () => {
    expect(splitFontStack(`-apple-system, BlinkMacSystemFont, "SF Pro Display", var(--font-inter, Inter), system-ui, sans-serif`)).toEqual([
      "-apple-system",
      "BlinkMacSystemFont",
      "SF Pro Display",
      "var(--font-inter, Inter)",
      "system-ui",
      "sans-serif",
    ]);
    expect(splitFontStack("'Brand, Grotesk'  ,  serif")).toEqual(["Brand, Grotesk", "serif"]);
    expect(splitFontStack("")).toEqual([]);
  });

  it("tells system families apart", () => {
    for (const family of ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "SF Pro Text", "SF Mono", "ui-monospace"]) {
      expect(isSystemFamily(family)).toBe(true);
    }
    expect(isSystemFamily("Inter")).toBe(false);
  });

  it("the matcher returns the first real family and keeps the rest as fallback", async () => {
    const matcher = await loadFontMatcher();
    expect(matcher.resolveStack(`"Inter", system-ui, sans-serif`)).toMatchObject({ family: "Inter", fallback: ["system-ui", "sans-serif"] });
    expect(matcher.resolveStack("system-ui, sans-serif")).toMatchObject({ family: "system-ui", match: { kind: "system" } });
    expect(matcher.resolveStack(["var(--font-x)"])).toBeNull();
  });
});
