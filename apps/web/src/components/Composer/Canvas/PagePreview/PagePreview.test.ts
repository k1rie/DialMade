import { applyPatch, screenPointer, type DesignDoc } from "@dialmade/doc";
import { sectionRegistry } from "@dialmade/sections";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { sampleDoc, sampleScreensDoc } from "@/lib/ai/testing";
import { compileScreenLayout } from "@/lib/screen-layout";
import { pageTarget, sectionRows } from "../../pageOps";
import { PagePreview } from "./PagePreview";

const render = (doc: DesignDoc, key: string) =>
  renderToStaticMarkup(
    createElement(I18nProvider, null, createElement(PagePreview, { doc, target: pageTarget(doc, key)!, mode: "light", selectedId: null, onSelect: () => {}, logoUrl: undefined })),
  );

describe("PagePreview", () => {
  it("renders a screen with the layout CSS the export uses, and marks its links", () => {
    const base = sampleScreensDoc();
    const target = pageTarget(base, "s-home")!;
    const [from] = sectionRows(target, sectionRegistry).ids;
    const linked = applyPatch(base, [{ op: "add", path: screenPointer("s-home", "layout", "blocks", from!, "linkTo"), value: "s-detail" }]);
    expect(linked.ok).toBe(true);
    if (!linked.ok) return;
    const doc = linked.doc;
    const markup = render(doc, "s-home");
    const screen = doc.screens["s-home"]!;
    const style = /<style data-dl-layout="">([\s\S]*?)<\/style>/.exec(markup)?.[1];
    expect(style).toBe(compileScreenLayout(screen).css);
    for (const id of sectionRows(pageTarget(doc, "s-home")!, sectionRegistry).ids) expect(markup).toContain(`data-dl-id="${id}"`);
    expect(markup).toContain('data-dl-screen-link="s-detail"');
  });

  it("renders a legacy page without layout CSS", () => {
    const markup = render(sampleDoc(["landing"]), "landing");
    expect(markup).toContain('data-dl-kind="landing"');
    expect(markup).not.toContain("data-dl-layout");
  });
});
