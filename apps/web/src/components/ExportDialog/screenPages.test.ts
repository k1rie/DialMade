import { createDesignDoc, type DesignDoc, type Screen } from "@dialmade/doc";
import { describe, expect, it } from "vitest";
import {
  LAYOUT_JSON_FORMAT,
  RESERVED_DIRS,
  layoutJson,
  linkResolver,
  relativeHref,
  screenPages,
  screenPath,
  type PackScreen,
} from "./screenPages";
import { screensFixture } from "./testing";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A document whose screens skip validation: copies of a real screen with other ids, routes and names. */
function looseDoc(doc: DesignDoc, entries: readonly { id: string; route: unknown; name?: string }[]): DesignDoc {
  const model = doc.screens["s-pricing"]!;
  const screens = Object.fromEntries(entries.map(({ id, route, name }) => [id, { ...model, id, route, name: name ?? id } as unknown as Screen]));
  return { ...doc, screens, screenOrder: entries.map((entry) => entry.id) };
}

describe("screenPages", () => {
  const { doc, built } = screensFixture();
  const pages = screenPages(doc);
  const byId = (id: string) => pages.find((page) => page.id === id)!;

  it("lists the screens in order, with a safe folder per route and `/` at the root", () => {
    expect(pages.map((page) => [page.id, page.dir, page.slug])).toEqual([
      ["s-home", "", "index"],
      ["s-pricing", "precios", "precios"],
      ["s-login", "entrar", "entrar"],
      ["s-dashboard", "app-dashboard", "app-dashboard"],
      // `/app` would collide with the folder of documents without screens.
      ["s-settings", "app-2", "app-2"],
    ]);
    expect(pages.map(screenPath)).toEqual([
      "index.html",
      "precios/index.html",
      "entrar/index.html",
      "app-dashboard/index.html",
      "app-2/index.html",
    ]);
  });

  it("is empty for a document without screens", () => {
    expect(screenPages(createDesignDoc({ brand: { name: "Brisa", seeds: { primary: "#7c5cff" } } }))).toEqual([]);
  });

  it("compiles each layout exactly as buildPageFromLayout did: same CSS, same links", () => {
    for (const page of pages) {
      expect(page.css, page.id).toBe(built[page.id]!.css);
      expect(page.links, page.id).toEqual(built[page.id]!.links);
    }
    // The absorbed media links to Dashboard, but the hero has its own link: the host keeps it.
    const home = byId("s-home");
    expect(home.absorbed).toEqual({ "s-home-media": "s-home-1" });
    expect(home.links["s-home-1"]).toBe("s-login");
    expect(Object.values(home.links)).not.toContain("s-dashboard");
  });

  it("puts the first screen at the root when no screen has the route `/`", () => {
    const { doc: reordered } = screensFixture(["s-pricing", "s-login"]);
    expect(screenPages(reordered).map((page) => [page.id, page.dir])).toEqual([
      ["s-pricing", ""],
      ["s-login", "entrar"],
    ]);
  });

  it("never uses a raw route as a path: weird, duplicated and reserved routes get unique safe slugs", () => {
    const routes: unknown[] = [
      "/../../etc/passwd",
      "/..",
      "/",
      "/",
      "/CON",
      "/assets",
      "/prompts",
      "/brand",
      "/app",
      "/a/b",
      "/a-b",
      "/a-b",
      "/café con leche",
      `/${"x".repeat(200)}`,
      "/%2e%2e/%2f",
      "C:\\windows\\system32",
      "",
      undefined,
      42,
    ];
    const loose = looseDoc(
      doc,
      routes.map((route, i) => ({ id: `s-${i}`, route })),
    );
    const result = screenPages(loose);
    expect(result).toHaveLength(routes.length);
    const slugs = result.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const page of result) {
      expect(page.slug, String(page.route)).toMatch(SLUG);
      expect(page.slug.length).toBeLessThanOrEqual(52);
      expect(RESERVED_DIRS).not.toContain(page.slug);
      expect(page.dir === "" || page.dir === page.slug).toBe(true);
    }
    expect(result.filter((page) => page.dir === "")).toHaveLength(1);
    expect(slugs.slice(0, 9)).toEqual(["etc-passwd", "screen-2", "index", "index-2", "con-2", "assets-2", "prompts-2", "brand-2", "app-2"]);
    expect(slugs.slice(9, 12)).toEqual(["a-b", "a-b-2", "a-b-3"]);
    expect(slugs[12]).toBe("cafe-con-leche");
  });
});

describe("links between exported screens", () => {
  const { doc } = screensFixture();
  const pages = screenPages(doc);
  const [home, pricing, , dashboard, settings] = pages as [PackScreen, PackScreen, PackScreen, PackScreen, PackScreen];

  it("are relative and always name the index.html (file:// does not open a folder's index)", () => {
    expect(relativeHref(home, home)).toBe("index.html");
    expect(relativeHref(home, pricing)).toBe("precios/index.html");
    expect(relativeHref(pricing, home)).toBe("../index.html");
    expect(relativeHref(dashboard, settings)).toBe("../app-2/index.html");
  });

  it("resolve screen ids, nav items by the shell's activeItem, and nothing else", () => {
    const withNavItems: PackScreen[] = pages.map((page) =>
      page.id === "s-settings" ? { ...page, screen: { ...page.screen, shell: { nav: "sidebar", header: true, activeItem: "settings" } } } : page,
    );
    const resolve = linkResolver(withNavItems, (to) => relativeHref(dashboard, to));
    expect(resolve("s-home")).toBe("../index.html");
    expect(resolve("s-settings")).toBe("../app-2/index.html");
    expect(resolve("settings")).toBe("../app-2/index.html");
    expect(resolve("customers")).toBeNull();
  });
});

describe("layout.json", () => {
  const { doc } = screensFixture();
  const pages = screenPages(doc);
  const home = pages[0]!;

  it("carries the screen, its layout verbatim, the reading order, responsive rules and the links", () => {
    const value = JSON.parse(JSON.stringify(layoutJson(home, linkResolver(pages, (to) => relativeHref(home, to)))));
    expect(Object.keys(value)).toEqual(["format", "screen", "layout", "absorbed", "order", "warnings", "responsive", "links"]);
    expect(value.format).toBe(LAYOUT_JSON_FORMAT);
    expect(value.screen).toEqual({ id: "s-home", name: "Inicio", kind: "landing", route: "/", shell: null });
    expect(value.layout).toEqual(doc.screens["s-home"]!.layout);
    expect(value.order).toEqual(home.structure.order);
    expect(value.order).not.toContain("s-home-media");
    expect(value.absorbed).toEqual({ "s-home-media": "s-home-1" });
    expect(Object.keys(value.responsive)).toEqual(["tablet", "mobile"]);
    expect(value.responsive.tablet.columns).toBe(8);
    expect(value.responsive.mobile.columns).toBe(4);
    expect(value.responsive.mobile.blocks["s-home-1"]).toEqual({
      rect: expect.any(Object),
      behavior: expect.any(String),
      hidden: false,
    });
    expect(value.links).toEqual([
      { from: "s-home-0", to: "s-pricing", href: "precios/index.html" },
      { from: "s-home-1", to: "s-login", href: "entrar/index.html" },
      { from: "s-home-6", to: "s-pricing", href: "precios/index.html" },
    ]);
  });

  it("lists app screens with their shell", () => {
    const dashboard = pages.find((page) => page.id === "s-dashboard")!;
    const value = layoutJson(dashboard, () => null);
    expect(value.screen.shell).toEqual({ nav: "sidebar", header: true });
    expect(value.links).toEqual([{ from: expect.stringMatching(/^s-dashboard-/), to: "s-settings", href: null }]);
  });
});
