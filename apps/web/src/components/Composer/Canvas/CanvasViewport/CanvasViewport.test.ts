import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { sampleScreensDoc } from "@/lib/ai/testing";
import { pageTarget } from "../../pageOps";
import { CanvasViewport } from "./CanvasViewport";

const render = (onNavigate?: (id: string) => void) => {
  const doc = sampleScreensDoc();
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(CanvasViewport, {
        id: "canvas",
        label: "Vista previa: Inicio",
        doc,
        target: pageTarget(doc, "s-home")!,
        mode: "light",
        device: "desktop",
        logoUrl: undefined,
        selectedId: null,
        onSelect: () => {},
        onDeselect: () => {},
        revealKey: 0,
        onNavigate,
        navigationKey: 1,
        onDrop: () => {},
        toolbar: { aiAvailable: false, aiBusy: false, onMove: () => {}, onHide: () => {}, onImproveCopy: () => {} },
      }),
    ),
  );
};

/** The opening tag of the scroll region (the focus target after a «Probar» navigation). */
const regionTag = (markup: string) => /<div [^>]*role="region"[^>]*aria-label="Vista previa: Inicio"[^>]*>/.exec(markup)?.[0] ?? "";

describe("CanvasViewport", () => {
  it("the region that takes focus after a «Probar» navigation shows the focus ring, inside its edge", () => {
    const tag = regionTag(render(() => {}));
    expect(tag).toContain('tabindex="-1"');
    // `outline-none` would hide the global :focus-visible ring; the stage clips an outer one, so it is inset.
    expect(tag).not.toMatch(/(^|\s|")outline-none(\s|")/);
    expect(tag).toContain("focus-visible:-outline-offset-2");
  });
});
