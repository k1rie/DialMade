import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { createLayoutStore, LayoutStoreProvider, type LayoutStoreProviderProps } from "../../useLayoutStore";
import { LinkField } from "./LinkField";

function render(supported: boolean) {
  // A server render reads the store's initial state: the screens go in through `init`.
  const source = createLayoutStore({ screenNameFor: (id) => `Pantalla ${id}` });
  const [home, pricing] = source.getState().actions.applySet("landing");
  const { screens, screenOrder } = source.getState();
  const store = createLayoutStore({ screens: screenOrder.map((id) => screens[id]!) });
  const blockId = Object.keys(screens[home!]!.layout.blocks)[0]!;
  const field = createElement(LinkField, { blockId, linkTo: pricing, screenId: home!, label: "Enlaza a", supported });
  const props = { store } as Omit<LayoutStoreProviderProps, "children">;
  return renderToStaticMarkup(createElement(I18nProvider, null, createElement(LayoutStoreProvider, props as LayoutStoreProviderProps, field)));
}

const hintOf = (markup: string) => {
  const describedBy = /<select [^>]*aria-describedby="([^"]+)"/.exec(markup)?.[1];
  return describedBy ? new RegExp(`id="${describedBy}"[^>]*>([^<]*)<`).exec(markup)?.[1] : undefined;
};

describe("LinkField (review B #11)", () => {
  it("a block whose section follows the link promises the navigation", () => {
    expect(hintOf(render(true))).toBe("En la preview y en el export, un clic lleva a esa pantalla.");
  });

  it("a link nothing follows stays visible to clear, and the hint says it does nothing", () => {
    const markup = render(false);
    expect(hintOf(markup)).toMatch(/^Este bloque no tiene un botón ni un enlace que lleve a otra pantalla/);
    expect(markup).not.toContain("un clic lleva a esa pantalla");
    expect(markup).toMatch(/<option value="s-[^"]+" selected="">/);
  });
});
