import { describe, expect, test } from "vitest";
import { spaceVar, toCss } from "./css";
import { fixture, makeLayout } from "./testing/fixtures";

/** The body of the rule for a selector inside a CSS chunk. */
function ruleOf(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  return css.slice(start, css.indexOf("}", start) + 1);
}

function chunk(css: string, query: string): string {
  const start = css.indexOf(`@container dl-layout ${query} {`);
  if (start < 0) return "";
  const end = css.indexOf("\n}\n", start);
  return css.slice(start, end < 0 ? undefined : end + 3);
}

describe("spaceVar", () => {
  test("nearest step of the scale, ties to the smaller one", () => {
    expect(spaceVar(0)).toBeNull();
    expect(spaceVar(-8)).toBeNull();
    expect(spaceVar(8)).toBe("var(--dl-space-2)");
    expect(spaceVar(16)).toBe("var(--dl-space-4)");
    expect(spaceVar(40)).toBe("var(--dl-space-6)");
    expect(spaceVar(56)).toBe("var(--dl-space-7)");
    expect(spaceVar(2)).toBe("var(--dl-space-1)");
    expect(spaceVar(128)).toBe("var(--dl-space-10)");
  });

  test("beyond the scale: a multiple of the last step, rounded to a quarter", () => {
    expect(spaceVar(160)).toBe("calc(var(--dl-space-10) * 1.25)");
    expect(spaceVar(256)).toBe("calc(var(--dl-space-10) * 2)");
    expect(spaceVar(24, [10, 20, 30])).toBe("var(--dl-space-2)");
    expect(spaceVar(90, [10, 20, 30])).toBe("calc(var(--dl-space-3) * 3)");
  });
});

describe("toCss", () => {
  test("scope element holds the container", () => {
    const css = toCss(fixture("empty").layout);
    expect(css).toBe(".dl-layout {\n  position: relative;\n  container: dl-layout / inline-size;\n}\n");
  });

  test("options: scope, selector, container name and space scale", () => {
    const css = toCss(fixture("holy-grail").layout, {
      scope: "#page",
      selector: (id) => `.el-${id}`,
      container: "screen",
      space: [16],
    });
    expect(css.startsWith("#page {\n  position: relative;\n  container: screen / inline-size;\n}")).toBe(true);
    expect(ruleOf(css, "#page .el-footer")).toContain("margin-block-start: var(--dl-space-1);");
    expect(css).toContain("@container screen (width < 64rem) {");
    expect(css).not.toContain("data-dl-id");
  });

  test("ids are escaped in the default selector", () => {
    const layout = makeLayout([{ id: "ok", type: "text", rect: [0, 0, 6, 10] }]);
    layout.blocks['x"y'] = { type: "text", label: "", rect: { col: 6, row: 0, w: 6, h: 10 }, z: 2 };
    expect(toCss(layout)).toContain('[data-dl-id="x\\"y"]');
  });

  test("rows are 12-column grids with explicit placement; app aligns to the start", () => {
    const css = toCss(fixture("dashboard").layout, { kind: "app" });
    expect(ruleOf(css, '.dl-layout [data-dl-id="chart"]')).toBe(
      '.dl-layout [data-dl-id="chart"] {\n  grid-column: 1 / span 8;\n  grid-row: 1;\n  min-height: 320px;\n}',
    );
    expect(css).toContain("align-items: start;");
    expect(toCss(fixture("dashboard").layout, { kind: "landing" })).toContain("align-items: stretch;");
  });

  test("landing: aspect-ratio on media and charts only; app: min-height on leaves", () => {
    const landing = toCss(fixture("bento").layout, { kind: "landing" });
    expect(ruleOf(landing, '.dl-layout [data-dl-id="a"]')).toContain("aspect-ratio: 9 / 4;");
    expect(ruleOf(landing, '.dl-layout [data-dl-id="b"]')).not.toContain("aspect-ratio");
    expect(landing).not.toContain("min-height: ");
    const app = toCss(fixture("nested-cards").layout, { kind: "app" });
    expect(ruleOf(app, '.dl-layout [data-dl-id="card-a"]')).toContain("min-height: 288px;");
    expect(ruleOf(app, '.dl-layout [data-dl-id="plans"]')).not.toContain("min-height");
  });

  test("mobile heights follow the derived rects (app)", () => {
    const css = toCss(fixture("dashboard").layout, { kind: "app" });
    expect(ruleOf(chunk(css, "(width < 40rem)"), '  .dl-layout [data-dl-id="kpis"]')).toContain("min-height: 224px;");
  });

  test("grids use fr tracks and areas; tablet stacks reset areas", () => {
    const css = toCss(fixture("pinwheel").layout);
    expect(css).toContain("grid-template-columns: minmax(0, 3fr) minmax(0, 6fr) minmax(0, 3fr);");
    expect(css).toContain('grid-template-areas:\n    "north north east"\n    "west center east"\n    "west south south";');
    expect(chunk(css, "(width < 64rem)")).toContain("grid-area: auto;");
  });

  test("a grid kept on tablet drops its areas and uses explicit lines", () => {
    const layout = makeLayout([
      { id: "n", type: "free", rect: [0, 0, 8, 20] },
      { id: "e", type: "free", rect: [8, 0, 4, 40] },
      { id: "w", type: "free", rect: [0, 20, 4, 40] },
      { id: "c", type: "free", rect: [4, 20, 4, 20] },
      { id: "s", type: "free", rect: [4, 40, 8, 20] },
    ]);
    const tablet = chunk(toCss(layout), "(width < 64rem)");
    expect(tablet).toContain("grid-template-areas: none;");
    expect(ruleOf(tablet, '  .dl-layout [data-dl-id="s"]')).toBe(
      '  .dl-layout [data-dl-id="s"] {\n    grid-area: auto;\n    grid-column: 4 / span 5;\n    grid-row: 3 / 4;\n  }',
    );
  });

  test("hidden blocks: display none, and a tablet-only range for leaves mobile shows again", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 12, 10] },
      { id: "b", type: "text", rect: [0, 12, 12, 10] },
      { id: "c", type: "text", rect: [0, 24, 12, 10] },
    ]);
    layout.blocks.a!.hidden = true;
    layout.blocks.b!.responsive = { tablet: { hidden: true } };
    layout.blocks.c!.responsive = { mobile: { hidden: true } };
    const css = toCss(layout);
    expect(ruleOf(css, '.dl-layout [data-dl-id="a"]')).toContain("display: none;");
    expect(chunk(css, "(width < 64rem)")).not.toContain('"b"');
    expect(chunk(css, "(40rem <= width < 64rem)")).toContain('.dl-layout [data-dl-id="b"] {\n    display: none;\n  }');
    expect(ruleOf(chunk(css, "(width < 40rem)"), '  .dl-layout [data-dl-id="c"]')).toContain("display: none;");
    expect(chunk(css, "(width < 40rem)")).not.toContain('"a"');
  });

  test("overlays: absolute with percentages; full width on mobile", () => {
    const css = toCss(fixture("modal-overlay").layout, { kind: "app" });
    expect(ruleOf(css, '.dl-layout [data-dl-id="dialog"]')).toContain(
      "  position: absolute;\n  left: 25%;\n  top: 80px;\n  width: 50%;",
    );
    expect(ruleOf(chunk(css, "(width < 40rem)"), '  .dl-layout [data-dl-id="dialog"]')).toContain("left: 0;\n    width: 100%;");
  });

  test("a lone narrow block uses percentages (the scope cannot query itself)", () => {
    const css = toCss(fixture("single").layout);
    expect(ruleOf(css, '.dl-layout [data-dl-id="intro"]')).toBe(
      '.dl-layout [data-dl-id="intro"] {\n  width: 50%;\n  margin-inline-start: 25%;\n}',
    );
    expect(css).not.toMatch(/@container[^{]*\{\n {2}\.dl-layout \{/);
  });

  test("tab bars come last on mobile", () => {
    const layout = makeLayout([
      { id: "side", type: "sidebar", rect: [0, 0, 3, 80] },
      { id: "main", type: "table", rect: [3, 0, 9, 80] },
    ]);
    layout.blocks.side!.responsive = { mobile: { behavior: "tabbar" } };
    expect(ruleOf(chunk(toCss(layout), "(width < 40rem)"), '  .dl-layout [data-dl-id="side"]')).toContain("order: 1;");
  });

  test("only theme or private variables", () => {
    for (const name of ["holy-grail", "dashboard", "bento", "modal-overlay", "misaligned"]) {
      const css = toCss(fixture(name).layout, { kind: "app" });
      for (const match of css.matchAll(/var\((--[\w-]+)\)/g)) expect(match[1]).toMatch(/^--(dl-space-\d+|_)/);
    }
  });
});
