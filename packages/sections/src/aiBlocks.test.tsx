// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileThemeVars, resolveThemeInputs } from "@dialmade/doc";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDefaultPage } from "./buildPage";
import { contentContextFromDoc } from "./context";
import { PageRenderer } from "./PageRenderer";
import { renderStaticPage } from "./renderToHtml";
import { acmeDoc, testRegistry } from "./testing/fixtures";

/** «Diseño con IA»: an element can be painted by an AI block; the frame (id, type, placement) stays. */
describe("AI blocks in the renderer", () => {
  const doc = acmeDoc();
  const page = buildDefaultPage("landing", contentContextFromDoc(doc), "minimal", { registry: testRegistry });
  const root = page.elements[page.root]!;
  const [first, second] = root.children;
  const vars = compileThemeVars(doc, { ...resolveThemeInputs(doc), mode: "light" });

  it("renderStaticPage replaces the section with the AI HTML inside the same frame", () => {
    const html = renderStaticPage(doc, "landing", vars, {
      page,
      registry: testRegistry,
      aiBlocks: { [first!]: `<section data-block-id="${first}" class="p-4">AI here</section>` },
    });
    expect(html).toMatch(new RegExp(`data-dl-id="${first}"[^>]*data-dl-ai=""[^>]*><div data-dl-ai-block="">`));
    expect(html).toContain("AI here");
    // The other sections render as before.
    expect(html).toContain(`data-dl-id="${second}"`);
  });

  it("PageRenderer takes any node (the app's island) and does not make it inert in edit mode", () => {
    const markup = renderToStaticMarkup(
      <PageRenderer doc={doc} kind="landing" page={page} registry={testRegistry} interactive replace={new Map([[first!, <iframe title="isla" />]])} />,
    );
    const frame = markup.slice(markup.indexOf(`data-dl-id="${first}"`) - 200, markup.indexOf("<iframe"));
    expect(markup).toContain('<iframe title="isla">');
    expect(frame).not.toContain("inert");
  });

  it("an underlay is painted first inside a container's frame", () => {
    const html = renderStaticPage(doc, "landing", vars, { page, registry: testRegistry, aiSurfaces: { [second!]: "bg-card rounded-card" } });
    expect(html).toMatch(new RegExp(`data-dl-id="${second}"[^>]*><div data-dl-ai-surface="" aria-hidden="true" class="bg-card rounded-card"></div>`));
  });
});
