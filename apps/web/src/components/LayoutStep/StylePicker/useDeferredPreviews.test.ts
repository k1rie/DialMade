import type { DesignDoc } from "@dialmade/doc";
import { emptyLayout, type LayoutDoc } from "@dialmade/layout";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as geometryModule from "./previewGeometry";
import { buildPreviews, useDeferredPreviews } from "./useDeferredPreviews";

vi.mock("./previewGeometry", async (importOriginal) => {
  const original = await importOriginal<typeof import("./previewGeometry")>();
  return { ...original, getPreviewGeometry: vi.fn(original.getPreviewGeometry) };
});

// The hook never reads the doc itself: it hands it to the options with the previews.
const doc = { id: "doc" } as unknown as DesignDoc;
const glyphs = (markup: string) => markup.match(/data-glyph="/g)?.length ?? 0;
const hero: LayoutDoc = { ...emptyLayout(), blocks: { a: { type: "hero", label: "Hero", rect: { col: 0, row: 0, w: 12, h: 40 }, z: 0 } } };

describe("useDeferredPreviews", () => {
  it("paints nothing and computes no geometry in the picker's first render", () => {
    const spy = vi.mocked(geometryModule.getPreviewGeometry);
    spy.mockClear();
    let result: ReturnType<typeof useDeferredPreviews> | undefined;
    function Probe() {
      result = useDeferredPreviews(hero, "landing", null, doc);
      return createElement(Fragment, null, result?.preview ?? "empty");
    }
    const markup = renderToStaticMarkup(createElement(Probe));
    expect(result).toBeNull();
    expect(markup).toBe("empty");
    expect(glyphs(markup)).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("buildPreviews", () => {
  it("paints the plain and the glass screen of the source, with its doc", () => {
    const previews = buildPreviews({ layout: hero, kind: "landing", shell: null, doc });
    expect(previews.doc).toBe(doc);
    const plain = renderToStaticMarkup(createElement(Fragment, null, previews.preview));
    const glass = renderToStaticMarkup(createElement(Fragment, null, previews.glassPreview));
    expect(glyphs(plain)).toBe(1);
    expect(glyphs(glass)).toBe(1);
    expect(glass).toContain("var(--chart-2)");
    expect(plain).not.toContain("var(--chart-2)");
  });
});
