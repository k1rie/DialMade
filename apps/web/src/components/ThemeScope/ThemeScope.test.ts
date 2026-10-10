import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./ThemeScope.css", import.meta.url), "utf8");
const chartCss = readFileSync(new URL("../../../../../packages/ui/src/Chart/Chart.css", import.meta.url), "utf8");

/** Top-level rules as { selectors, body }, comments removed (at-rule blocks such as @layer are skipped whole). */
function rules(source: string): { selectors: string[]; body: string }[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { selectors: string[]; body: string }[] = [];
  let depth = 0;
  let start = 0;
  let open = -1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "{") {
      if (depth === 0) open = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        const prelude = text.slice(start, open).trim();
        if (!prelude.startsWith("@")) found.push({ selectors: prelude.split(",").map((selector) => selector.trim()), body: text.slice(open + 1, i).trim() });
        start = i + 1;
      }
    } else if (char === ";" && depth === 0) {
      start = i + 1;
    }
  }
  return found;
}

describe("ThemeScope.css: edit mode", () => {
  const editRules = rules(css).filter((rule) => rule.selectors.some((selector) => selector.includes("[data-dl-interactive]")));

  it("holds every animation of the page at its resting state, pseudo-elements included", () => {
    const still = editRules.find((rule) => /(^|;)\s*animation\s*:\s*none\s*!important/.test(rule.body));
    expect(still?.selectors).toEqual([
      ".app-theme-scope .dl-page[data-dl-interactive] *",
      ".app-theme-scope .dl-page[data-dl-interactive] *::before",
      ".app-theme-scope .dl-page[data-dl-interactive] *::after",
    ]);
  });

  it("never pauses animations: a paused entrance animation stays on its first frame (a chart without its line)", () => {
    // The kit's entrance animations start from an invisible frame and fill both ways.
    expect(chartCss).toMatch(/\.dl-chart__line\s*\{[^}]*animation:\s*dl-chart-draw[^;]*both;/);
    expect(chartCss).toMatch(/@keyframes dl-chart-draw\s*\{\s*from\s*\{\s*stroke-dashoffset:\s*1;/);
    expect(chartCss).toMatch(/\.dl-chart__area\s*\{[^}]*animation:\s*dl-chart-fade[^;]*both;/);
    expect(chartCss).toMatch(/@keyframes dl-chart-fade\s*\{\s*from\s*\{\s*opacity:\s*0;/);
    for (const rule of editRules) expect(rule.body, rule.selectors.join(", ")).not.toMatch(/animation-play-state\s*:\s*paused/);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/animation-play-state\s*:\s*paused/);
  });
});
