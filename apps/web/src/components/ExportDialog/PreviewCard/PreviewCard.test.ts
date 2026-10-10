import type { DesignDoc, Screen } from "@dialmade/doc";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { sampleDoc } from "@/lib/ai/testing";
import { compileScreenLayout, scopedScreenCss, screenScope } from "@/lib/screen-layout";
import { screensFixture } from "../testing";
import { PreviewCard } from "./PreviewCard";
import { SCREEN_MINI, SCREEN_MINI_SCALE } from "./ScreenMini/constants";

const render = (doc: DesignDoc, kind: "brand" | "landing" | "app", screen?: Screen) =>
  renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(PreviewCard, {
        doc,
        kind,
        mode: "light",
        kindLabel: screen?.name ?? kind,
        label: "Vista previa",
        ...(screen && { screen, pageKey: screen.id }),
      }),
    ),
  );

describe("PreviewCard", () => {
  it("a screen shows its own page at small scale: its blocks, its layout CSS, inert and hidden from assistive tech", () => {
    const { doc } = screensFixture();
    const screen = doc.screens["s-dashboard"]!;
    const markup = render(doc, "app", screen);
    const mini = markup.slice(markup.indexOf("data-screen-mini="));
    expect(mini.startsWith(`data-screen-mini="${screen.id}"`)).toBe(true);
    expect(markup).toMatch(/<div aria-hidden="true" data-screen-mini="s-dashboard"/);
    expect(mini).toContain('inert=""');
    expect(mini).toContain(`transform:scale(${SCREEN_MINI_SCALE})`);
    expect(mini).toContain(`width:${SCREEN_MINI.pageWidthRem}rem`);
    // The export's rules, scoped to the mini: none reaches the Composer's preview behind the dialog.
    expect(mini).toContain(`data-dl-screen="${screen.id}"`);
    const style = /<style data-dl-layout="">([\s\S]*?)<\/style>/.exec(markup)?.[1];
    expect(style).toBe(scopedScreenCss(screen));
    expect(style).toBe(compileScreenLayout(screen).css.replaceAll(".dl-layout", screenScope(screen.id)));
    for (const id of Object.keys(screen.layout.blocks)) {
      if (screen.page.elements[id]) expect(markup, id).toContain(`data-dl-id="${id}"`);
    }
    // The kind mini is not drawn.
    expect(markup).not.toContain("dl-mini-app");
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Vista previa"');
  });

  it("the scale fills the card's 13rem mini column from a desktop-wide page (over the 64rem tablet query)", () => {
    expect(SCREEN_MINI.widthRem).toBe(13);
    expect(SCREEN_MINI.pageWidthRem).toBeGreaterThan(64);
    expect(SCREEN_MINI.pageWidthRem * SCREEN_MINI_SCALE).toBeCloseTo(SCREEN_MINI.widthRem, 10);
  });

  it("a page kind (documents without screens, the style guide) keeps the kind's mini", () => {
    const markup = render(sampleDoc(["landing"]), "landing");
    expect(markup).toContain("dl-mini-landing");
    expect(markup).not.toContain("data-screen-mini");
    expect(markup).not.toContain("data-dl-layout");
  });
});
