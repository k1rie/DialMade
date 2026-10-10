import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { DesignDocProvider, loadDesignEngine, type DesignDocProviderProps } from "@/hooks/useDesignDoc";
import { I18nProvider } from "@/i18n";
import { designEngine } from "@/lib/design-engine";
import { ExportDialog } from "./ExportDialog";
import { screensFixture } from "./testing";

beforeAll(async () => {
  await loadDesignEngine(async () => designEngine);
});

const render = (notice?: ReactNode) => {
  const { doc } = screensFixture();
  return renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(
        DesignDocProvider,
        { initialState: { doc, engineReady: true } } as DesignDocProviderProps,
        createElement(ExportDialog, { open: true, onOpenChange: () => {}, ...(notice !== undefined && { notice }) }),
      ),
    ),
  );
};

describe("ExportDialog notice (review B #40)", () => {
  it("shows the notice inside the modal, right under its header, before the preview and the destinations", () => {
    const markup = render(createElement("p", { "data-notice": "" }, "Cambios en Layout sin generar"));
    const notice = markup.indexOf("data-notice");
    expect(notice).toBeGreaterThan(markup.indexOf("</header>"));
    expect(notice).toBeLessThan(markup.indexOf("<section"));
    expect(notice).toBeGreaterThan(markup.indexOf("<dialog"));
    expect(notice).toBeLessThan(markup.indexOf("</dialog>"));
  });

  it("renders nothing extra without one (null or absent)", () => {
    expect(render(null)).toBe(render());
    expect(render()).not.toContain("data-notice");
  });
});
