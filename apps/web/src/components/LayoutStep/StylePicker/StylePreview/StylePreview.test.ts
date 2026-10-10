import { emptyLayout, type LayoutBlock } from "@dialmade/layout";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { computePreviewGeometry, getPreviewGeometry } from "../previewGeometry";
import { StylePreview } from "./StylePreview";

const glyphs = (markup: string) => markup.match(/data-glyph="/g)?.length ?? 0;

describe("StylePreview", () => {
  it("paints the frame and every block of the geometry, sized in design px through --u", () => {
    const geometry = getPreviewGeometry(emptyLayout(), "app", { nav: "sidebar", header: true });
    const markup = renderToStaticMarkup(createElement(StylePreview, { geometry }));
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("--u:calc(100cqw / 1440)");
    expect(markup).toContain("container-type:inline-size");
    expect(glyphs(markup)).toBe(geometry.blocks.length + 2);
    expect(markup).toContain('data-glyph="frame-sidebar"');
    expect(markup).toContain('data-glyph="frame-header"');
  });

  it("adds the blurred blobs only for glass", () => {
    const layout = { ...emptyLayout(), blocks: { a: { type: "hero", label: "Hero", rect: { col: 0, row: 0, w: 12, h: 40 }, z: 0 } satisfies LayoutBlock } };
    const geometry = computePreviewGeometry(layout, "landing", null);
    const plain = renderToStaticMarkup(createElement(StylePreview, { geometry }));
    const glass = renderToStaticMarkup(createElement(StylePreview, { geometry, glass: true }));
    expect(plain).not.toContain("var(--chart-2)");
    expect(glass.match(/filter:blur\(calc\(var\(--u\) \* 96\)\)/g)).toHaveLength(2);
  });
});
