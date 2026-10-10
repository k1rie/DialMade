import { DEFAULT_SCOPE } from "@dialmade/layout";
import { describe, expect, it } from "vitest";
import { sampleScreensDoc } from "@/lib/ai/testing";
import { SCREEN_ATTRIBUTE, compileScreenLayout, scopedScreenCss, screenScope } from "./screen-layout";

/** Selectors of every rule (at-rules such as `@container` are not selectors). */
function selectors(css: string): string[] {
  return css
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith("{") && !line.startsWith("@"))
    .flatMap((line) => line.slice(0, -1).split(","))
    .map((selector) => selector.trim())
    .filter(Boolean);
}

describe("scopedScreenCss", () => {
  const doc = sampleScreensDoc();

  it("is the export's CSS with the layout scope of the screen: same rules, same order, same specificity", () => {
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      const exported = compileScreenLayout(screen).css;
      const scoped = scopedScreenCss(screen);
      expect(exported.startsWith(`${DEFAULT_SCOPE} {`)).toBe(true);
      expect(scoped).toBe(exported.replaceAll(DEFAULT_SCOPE, screenScope(id)));
      // The screen attribute sits inside `:where()`, so it adds no specificity.
      expect(screenScope(id)).toBe(`:where([${SCREEN_ATTRIBUTE}="${id}"]) ${DEFAULT_SCOPE}`);
    }
  });

  it("matches only inside its own screen, so several screens can render at once", () => {
    const [a, b] = doc.screenOrder as [string, string];
    const cssA = scopedScreenCss(doc.screens[a]!);
    const cssB = scopedScreenCss(doc.screens[b]!);
    const listA = selectors(cssA);
    expect(listA.length).toBeGreaterThan(1);
    for (const selector of listA) expect(selector.startsWith(screenScope(a))).toBe(true);
    for (const selector of selectors(cssB)) expect(selector.startsWith(screenScope(b))).toBe(true);
    expect(cssA).not.toContain(`"${b}"`);
  });

  it("is deterministic and leaves the export's compile untouched", () => {
    const screen = doc.screens[doc.screenOrder[0]!]!;
    const before = compileScreenLayout(screen).css;
    const copy = structuredClone(screen);
    expect(scopedScreenCss(copy)).toBe(scopedScreenCss(screen));
    expect(compileScreenLayout(screen).css).toBe(before);
  });

  it("escapes a quote or a backslash in the id (screen ids never have them; the selector stays valid anyway)", () => {
    expect(screenScope('a"b\\c')).toBe(`:where([${SCREEN_ATTRIBUTE}="a\\"b\\\\c"]) ${DEFAULT_SCOPE}`);
  });
});
