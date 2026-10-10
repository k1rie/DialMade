import type { LibraryBlockType } from "@dialmade/layout";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { BlockIcon } from "./icons";

const TYPES = [
  "navbar", "sidebar", "footer", "hero", "features", "logos", "testimonials", "pricing", "cta", "kpis", "chart", "table",
  "activity", "settings", "modal", "empty", "text", "media", "cards", "calendar", "list", "form", "free", "container",
  "tabs", "stepper", "pagination", "faq", "banner", "timeline", "kanban", "search", "upload", "notifications", "gallery",
  "chat", "profile", "map", "cart", "checkout", "video",
] as const satisfies readonly LibraryBlockType[];

describe("BlockIcon", () => {
  it("lists every block type in this test", () => {
    expectTypeOf<Exclude<LibraryBlockType, (typeof TYPES)[number]>>().toEqualTypeOf<never>();
    expect(new Set(TYPES).size).toBe(41);
  });

  it("draws a distinct, decorative 16px glyph for every type", () => {
    const markup = TYPES.map((type) => renderToStaticMarkup(createElement(BlockIcon, { type })));
    for (const svg of markup) {
      expect(svg).toContain('viewBox="0 0 16 16"');
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toMatch(/<(path|rect|circle)\b/);
    }
    expect(new Set(markup).size).toBe(TYPES.length);
  });

  it("passes props through to the svg", () => {
    expect(renderToStaticMarkup(createElement(BlockIcon, { type: "calendar", className: "size-4" }))).toContain('class="size-4"');
  });
});
