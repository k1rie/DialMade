import { applyPatch, screenPointer, type DesignDoc } from "@dialmade/doc";
import { sectionRegistry } from "@dialmade/sections";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { sampleDoc, sampleScreensDoc } from "@/lib/ai/testing";
import { compileScreenLayout, scopedScreenCss, screenScope } from "@/lib/screen-layout";
import { pageTarget, sectionRows } from "../../pageOps";
import { PagePreview } from "./PagePreview";

const render = (doc: DesignDoc, key: string, onNavigate?: (id: string) => void) =>
  renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(PagePreview, { doc, target: pageTarget(doc, key)!, mode: "light", selectedId: null, onSelect: () => {}, logoUrl: undefined, onNavigate }),
    ),
  );

/** `sampleScreensDoc` with the first block of «Inicio» linking to «Detalle». */
function linkedDoc(): { doc: DesignDoc; from: string } {
  const base = sampleScreensDoc();
  const [from] = sectionRows(pageTarget(base, "s-home")!, sectionRegistry).ids;
  const linked = applyPatch(base, [{ op: "add", path: screenPointer("s-home", "layout", "blocks", from!, "linkTo"), value: "s-detail" }]);
  if (!linked.ok) throw new Error(JSON.stringify(linked.error));
  return { doc: linked.doc, from: from! };
}

const styleOf = (markup: string) => /<style data-dl-layout="">([\s\S]*?)<\/style>/.exec(markup)?.[1];
const linkTag = (markup: string, screenId: string) => new RegExp(`<a [^>]*data-dl-screen-link="${screenId}"[^>]*>`).exec(markup)?.[0];

describe("PagePreview", () => {
  it("renders a screen with the export's layout CSS scoped to that screen, and marks its links", () => {
    const { doc } = linkedDoc();
    const markup = render(doc, "s-home");
    const screen = doc.screens["s-home"]!;
    const style = styleOf(markup);
    expect(style).toBe(scopedScreenCss(screen));
    expect(style?.replaceAll(screenScope("s-home"), ".dl-layout")).toBe(compileScreenLayout(screen).css);
    expect(markup).toContain('data-dl-screen="s-home"');
    for (const id of sectionRows(pageTarget(doc, "s-home")!, sectionRegistry).ids) expect(markup).toContain(`data-dl-id="${id}"`);
    // Edit mode: selectable sections, links that go nowhere.
    expect(markup).toContain("data-dl-interactive");
    expect(linkTag(markup, "s-detail")).toContain('href="#"');
  });

  it("«Probar»: the page is not selectable and its screen links are real anchors to the screen's route", () => {
    const { doc } = linkedDoc();
    const markup = render(doc, "s-home", () => {});
    expect(markup).not.toContain("data-dl-interactive");
    expect(markup).not.toContain("aria-roledescription");
    expect(markup).not.toContain('class="dl-inert"');
    expect(linkTag(markup, "s-detail")).toContain('href="#/app/detalle"');
    expect(styleOf(markup)).toBe(scopedScreenCss(doc.screens["s-home"]!));
  });

  it("renders a legacy page without layout CSS or screen scope", () => {
    const markup = render(sampleDoc(["landing"]), "landing");
    expect(markup).toContain('data-dl-kind="landing"');
    expect(markup).not.toContain("data-dl-layout");
    expect(markup).not.toContain("data-dl-screen=");
  });
});
