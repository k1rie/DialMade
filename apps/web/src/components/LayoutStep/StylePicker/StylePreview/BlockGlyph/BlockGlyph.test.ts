import { LIBRARY } from "@dialmade/layout";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlockGlyph, type GlyphKind } from "./BlockGlyph";

const FRAMES: GlyphKind[] = ["frame-sidebar", "frame-rail", "frame-topnav", "frame-header"];
const box = { left: 2, top: 3, width: 40, height: 20 };

describe("BlockGlyph", () => {
  it("paints every block type and frame part, small and large, with and without glass", () => {
    const kinds: GlyphKind[] = [...LIBRARY.map((def) => def.type), ...FRAMES];
    for (const kind of kinds) {
      for (const [widthPx, heightPx] of [
        [40, 16],
        [1376, 480],
      ] as const) {
        for (const glass of [false, true]) {
          const markup = renderToStaticMarkup(createElement(BlockGlyph, { kind, box, widthPx, heightPx, glass }));
          expect(markup, kind).toContain(`data-glyph="${kind}"`);
          expect(markup, kind).toContain("position:absolute;");
          expect(markup, kind).toContain("left:2%;top:3%;width:40%;height:20%");
          expect(markup, kind).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });

  it("paints collections as one card per item, within the block's count", () => {
    const markup = (count?: number) =>
      renderToStaticMarkup(createElement(BlockGlyph, { kind: "kpis", box, widthPx: 1376, heightPx: 112, ...(count !== undefined && { count }) }));
    const cards = (html: string) => html.match(/var\(--dl-card-shadow, none\)/g)?.length ?? 0;
    expect(cards(markup())).toBe(4);
    expect(cards(markup(3))).toBe(3);
  });

  it("uses frosted surfaces only for glass", () => {
    const plain = renderToStaticMarkup(createElement(BlockGlyph, { kind: "chart", box, widthPx: 800, heightPx: 320 }));
    const glass = renderToStaticMarkup(createElement(BlockGlyph, { kind: "chart", box, widthPx: 800, heightPx: 320, glass: true }));
    expect(plain).not.toContain("backdrop-filter");
    expect(glass).toContain("backdrop-filter:blur(6px)");
    expect(glass).toContain("color-mix(in oklab, var(--card) 55%, transparent)");
  });
});
