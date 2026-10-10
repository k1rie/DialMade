import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { emptyLayout, getBlockDef, isLinkableBlockType, LINKABLE_BLOCK_TYPES, type LibraryBlockType, type ScreenKind } from "@dialmade/layout";
import { buildPageFromLayout } from "../buildPageFromLayout";
import { renderStaticPage } from "../renderToHtml";
import { acmeContent, acmeDoc } from "../testing/fixtures";
import { READY_TYPES } from "../testing/layout";
import { PageRenderer } from "./PageRenderer";

/*
 * «Enlaza a» (review B #11): a block's `linkTo` only means something when its section draws a primary action
 * that follows it. `LINKABLE_BLOCK_TYPES` (@dialmade/layout) is what the inspector offers; this keeps it in
 * step with the sections, both ways, in the navigable preview and in the static export.
 */

const TARGET = "s-target";
const HREF = "target/index.html";

/** One block of `type` alone on a screen, linked to `TARGET`. Frame blocks go on landing screens (on app ones they are the shell). */
function linkedPage(type: LibraryBlockType) {
  const def = getBlockDef(type);
  const kind: ScreenKind = def.frame ? "landing" : (def.kinds[0] ?? "landing");
  const layout = emptyLayout();
  layout.blocks.x = { type, label: type, rect: { col: 0, row: 0, ...def.defaultSize }, z: 1, linkTo: TARGET };
  const result = buildPageFromLayout(layout, kind, null, acmeContent());
  return { kind, ...result };
}

describe("block links follow the library's linkable types", () => {
  it.each(READY_TYPES.map((type) => [type]))("%s", (type) => {
    const { kind, page, links } = linkedPage(type);
    expect(links).toEqual({ x: TARGET });
    const linkable = isLinkableBlockType(type);

    // Navigable preview: the block's primary action carries `data-dl-screen-link`.
    const { container, unmount } = render(<PageRenderer doc={acmeDoc()} kind={kind} page={page} links={links} />);
    const block = container.querySelector('[data-dl-id="x"]');
    expect(block, "the block renders").not.toBeNull();
    const inPreview = block!.querySelectorAll(`[data-dl-screen-link="${TARGET}"]`).length;
    unmount();

    // Export: a real link (or a form that submits) to the screen's page.
    const html = renderStaticPage(acmeDoc(), kind, {}, { page, fonts: false, links, linkHref: (id) => (id === TARGET ? HREF : null) });
    const host = document.createElement("div");
    host.innerHTML = html.slice(html.indexOf("<body"));
    const exported = host.querySelector('[data-dl-id="x"]');
    expect(exported, "the block is exported").not.toBeNull();
    const followed = exported!.querySelectorAll(`a[href="${HREF}"], form[action="${HREF}"]`).length;

    if (linkable) {
      expect(inPreview, "preview link").toBeGreaterThan(0);
      expect(followed, "exported link").toBeGreaterThan(0);
    } else {
      expect(inPreview, "a type outside LINKABLE_BLOCK_TYPES renders a screen link: add it there").toBe(0);
      expect(followed).toBe(0);
    }
  });

  it("every linkable type is a ready block", () => {
    for (const type of LINKABLE_BLOCK_TYPES) expect(READY_TYPES).toContain(type);
  });

  it("without links nothing changes: the empty state, activity and modal keep their buttons", () => {
    for (const type of ["empty", "activity", "modal"] as const) {
      const { kind, page } = linkedPage(type);
      const html = renderStaticPage(acmeDoc(), kind, {}, { page, fonts: false });
      expect(html, type).not.toContain("data-dl-screen-link");
      const host = document.createElement("div");
      host.innerHTML = html.slice(html.indexOf("<body"));
      expect(host.querySelector('[data-dl-id="x"] button'), type).not.toBeNull();
    }
  });

  it("cards without an action label link through each card's title; with one, through the action", () => {
    const { kind, page, links } = linkedPage("cards");
    const { container, rerender } = render(<PageRenderer doc={acmeDoc()} kind={kind} page={page} links={links} />);
    const titleLinks = container.querySelectorAll(`.dl-ui-card__title a[data-dl-screen-link="${TARGET}"]`);
    expect(titleLinks.length).toBeGreaterThan(0);
    expect(container.querySelector(".dl-ui-card__link")).toBeNull();
    const withAction = structuredClone(page);
    withAction.elements.x!.props = { ...withAction.elements.x!.props, action: "Abrir" };
    rerender(<PageRenderer doc={acmeDoc()} kind={kind} page={withAction} links={links} />);
    expect(container.querySelector(".dl-ui-card__title a")).toBeNull();
    expect(container.querySelectorAll(`.dl-ui-card__link[data-dl-screen-link="${TARGET}"]`).length).toBeGreaterThan(0);
  });
});
