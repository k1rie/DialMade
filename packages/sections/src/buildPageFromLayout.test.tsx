import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LayoutDocSchema, checkScreenPage, type Page } from "@dialmade/doc";
import {
  LIBRARY,
  emptyLayout,
  estimateContent,
  getBlockDef,
  inferStructure,
  parseNote,
  toElementTree,
  type AppShell,
  type BlockId,
  type LayoutBlock,
  type LayoutDoc,
  type LayoutElement,
  type LibraryBlockType,
  type ScreenKind,
} from "@dialmade/layout";
import {
  FIXTURES,
  LEAF_TYPES,
  chance,
  makeLayout,
  mulberry32,
  pickOne,
  randInt,
  randomLayout,
  randomSeparableLayout,
  type Rand,
} from "@dialmade/layout/testing";
import { VARIANT_PROP } from "./constants";
import { buildPageFromLayout, LAYOUT_SCOPE_ID, REGION_TYPE, SHELL_ELEMENT_ID, type BuildFromLayoutOptions } from "./buildPageFromLayout";
import { contentContextFromDoc } from "./context";
import { PageRenderer } from "./PageRenderer";
import { resolveSectionProps, storedDefaultProps } from "./props";
import { sectionRegistry } from "./registry";
import { renderStaticPage } from "./renderToHtml";
import { acmeContent, acmeDoc } from "./testing/fixtures";
import { cssIds, everyBlockLayout, markupIds, READY_TYPES, withFingerprints } from "./testing/layout";
import type { ContentContext, FitInput } from "./types";

const ctx = acmeContent();
const SIDEBAR: AppShell = { nav: "sidebar", header: true };
const shellFor = (kind: ScreenKind, shell: AppShell = SIDEBAR): AppShell | null => (kind === "app" ? shell : null);

const build = (layout: LayoutDoc, kind: ScreenKind = "landing", options: BuildFromLayoutOptions = {}, context: ContentContext = ctx) =>
  buildPageFromLayout(layout, kind, shellFor(kind), context, options);

/** Keys rewritten from the layout on every build (they mirror layout data, not copy). */
const OVERRIDE_KEYS = new Set(["level", "blockType", "blockLabel", "blockNote", "soon"]);

const ownsOf = (type: string): readonly string[] => sectionRegistry.get(type)?.layout?.owns ?? [];

function readAt(root: unknown, pointer: string): unknown {
  let current = root;
  for (const raw of pointer.slice(1).split("/")) {
    const segment = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current)) current = current[Number(segment)];
    else if (current && typeof current === "object") current = (current as Record<string, unknown>)[segment];
    else return undefined;
  }
  return current;
}

/** Element tree under the scope, as `toElementTree` would describe it. */
function pageTree(page: Page, id: string): unknown {
  const element = page.elements[id]!;
  return { id, children: element.children.map((child) => pageTree(page, child)) };
}
const elementTree = (el: LayoutElement): unknown => ({ id: el.id, children: el.children.map(elementTree) });

function staticMarkup(page: Page, kind: ScreenKind, options: { css?: string } = {}) {
  const errors: string[] = [];
  const html = renderStaticPage(acmeDoc(), kind, {}, {
    page,
    fonts: false,
    ...(options.css && { css: options.css }),
    onSectionError: (id, error) => errors.push(`${id}: ${String(error)}`),
  });
  return { html, errors };
}

/* ------------------------------------------------------------------------------------------------ */

describe("buildPageFromLayout: page tree", () => {
  it("root → layout scope → toElementTree on landing screens; root → shell → layout on app screens with nav", () => {
    for (const fixture of FIXTURES) {
      for (const kind of ["landing", "app"] as const) {
        const { page } = build(fixture.layout, kind);
        expect(checkScreenPage(page, kind), `${fixture.name} ${kind}`).toEqual([]);
        expect(page.layoutId).toBe("custom");
        expect(page.elements.root?.type).toBe(`${kind}.page`);
        const scopeParent = kind === "app" ? SHELL_ELEMENT_ID : "root";
        if (kind === "app") {
          expect(page.elements.root?.children).toEqual([SHELL_ELEMENT_ID]);
          expect(page.elements.shell?.type).toBe("app.shell");
        }
        expect(page.elements[scopeParent]?.children).toEqual([LAYOUT_SCOPE_ID]);
        expect(page.elements.layout).toMatchObject({ type: REGION_TYPE, props: { role: "scope", screenKind: kind } });
        const tree = toElementTree(inferStructure(fixture.layout));
        expect(pageTree(page, LAYOUT_SCOPE_ID)).toEqual({ id: LAYOUT_SCOPE_ID, children: tree.map(elementTree) });
      }
    }
  });

  it("inferred regions are structural ui.region elements; blocks use the library's sectionType", () => {
    const layout = everyBlockLayout("landing", READY_TYPES);
    const { page } = build(layout);
    for (const [id, element] of Object.entries(page.elements)) {
      if (id.startsWith("r-")) expect(element).toMatchObject({ type: REGION_TYPE, props: { role: "inferred" } });
      else if (layout.blocks[id]) expect(element.type).toBe(getBlockDef(layout.blocks[id]!.type).sectionType);
    }
    expect(page.elements["x-container"]).toMatchObject({ type: REGION_TYPE, props: { role: "group" } });
  });

  it("app screens: nav none or a null shell → no shell element; landing screens ignore the shell", () => {
    const layout = makeLayout([{ id: "kpis", type: "kpis", rect: [0, 0, 12, 14] }]);
    for (const shell of [{ nav: "none", header: false } as AppShell, null]) {
      const { page } = buildPageFromLayout(layout, "app", shell, ctx);
      expect(page.elements.root?.children).toEqual([LAYOUT_SCOPE_ID]);
      expect(page.elements.shell).toBeUndefined();
      expect(page.dials).toEqual({ density: 7 });
    }
    const landing = buildPageFromLayout(layout, "landing", SIDEBAR, ctx).page;
    expect(landing.elements.shell).toBeUndefined();
    expect(checkScreenPage(landing, "landing")).toEqual([]);
  });

  it("an empty layout is a valid page with an empty scope", () => {
    for (const kind of ["landing", "app"] as const) {
      const result = build(emptyLayout(), kind);
      expect(result.page.elements.layout?.children).toEqual([]);
      expect(checkScreenPage(result.page, kind)).toEqual([]);
      expect(result.fingerprints).toEqual({});
    }
  });

  it("throws on an invalid layout (reserved ids included)", () => {
    const layout = makeLayout([{ id: "shell", type: "text", rect: [0, 0, 6, 10] }]);
    expect(() => build(layout)).toThrow(/reserved/);
  });
});

describe("buildPageFromLayout: CSS and markup agree", () => {
  it("every id the layout CSS targets is an element of the rendered page (hidden ones aside)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rand = mulberry32(seed);
      const layout = seed % 2 ? randomSeparableLayout(rand, { maxBlocks: 16 }) : randomLayout(rand, { maxBlocks: 16 });
      const kind = seed % 3 ? "landing" : "app";
      const result = build(layout, kind);
      const { html, errors } = staticMarkup(result.page, kind);
      expect(errors).toEqual([]);
      const rendered = new Set(markupIds(html));
      const hiddenTree = new Set<string>();
      const hide = (id: string) => {
        hiddenTree.add(id);
        result.page.elements[id]?.children.forEach(hide);
      };
      (result.page.hidden ?? []).forEach(hide);
      for (const id of cssIds(result.css)) expect(rendered.has(id) || hiddenTree.has(id), `seed ${seed}: ${id}`).toBe(true);
      for (const id of rendered) expect(id in result.page.elements, `seed ${seed}: ${id}`).toBe(true);
    }
  });

  it("the DOM nests elements as the tree: children are direct children of their region's wrapper", () => {
    const layout = everyBlockLayout("app", READY_TYPES);
    const { page, css } = build(layout, "app");
    const { container } = render(<PageRenderer doc={acmeDoc()} kind="app" page={page} layoutCss={css} />);
    const scope = container.querySelector(".dl-layout");
    expect(scope, "ui.region renders the .dl-layout scope").toBeTruthy();
    expect([...scope!.children].filter((el) => el.matches(".dl-el")).map((el) => el.getAttribute("data-dl-id"))).toEqual(
      page.elements.layout!.children,
    );
    for (const [id, element] of Object.entries(page.elements)) {
      if (!id.startsWith("r-") && element.type !== REGION_TYPE) continue;
      if (id === LAYOUT_SCOPE_ID) continue;
      const wrapper = container.querySelector(`[data-dl-id="${id}"]`)!;
      const direct = [...wrapper.children].filter((el) => el.matches(".dl-el")).map((el) => el.getAttribute("data-dl-id"));
      expect(direct, id).toEqual(element.children);
    }
    expect(container.querySelector("style[data-dl-layout]")?.textContent).toBe(css);
  });
});

describe("buildPageFromLayout: props", () => {
  it("is deterministic and idempotent (with and without the fingerprints written back)", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const layout = randomLayout(mulberry32(seed), { maxBlocks: 20 });
      const kind = seed % 2 ? "landing" : "app";
      const first = build(layout, kind);
      expect(JSON.stringify(build(layout, kind))).toBe(JSON.stringify(first));
      const again = build(withFingerprints(layout, first.fingerprints), kind, { previous: first.page });
      expect(again.page).toEqual(first.page);
      expect(again.css).toBe(first.css);
      expect(build(layout, kind, { previous: first.page }).page).toEqual(first.page);
    }
  });

  it("writes schema-valid fingerprints for every block, absorbed ones included", () => {
    const layout = everyBlockLayout("landing");
    const result = build(layout);
    expect(Object.keys(result.fingerprints).sort()).toEqual(Object.keys(layout.blocks).sort());
    expect(result.fingerprints["x-hero-media"]?.variant).toBe("absorbed");
    const parsed = LayoutDocSchema.safeParse(withFingerprints(layout, result.fingerprints));
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("repeated blocks of one type get their own copy; the first keeps the document seed", () => {
    const layout = makeLayout([
      { id: "f1", type: "features", rect: [0, 0, 12, 40] },
      { id: "f2", type: "features", rect: [0, 42, 12, 40] },
    ]);
    const { page } = build(layout);
    const items = (id: string) => JSON.stringify(page.elements[id]!.props.items);
    expect(items("f1")).not.toBe(items("f2"));
    const def = sectionRegistry.get("landing.features")!;
    expect(page.elements.f1!.props.items).toEqual(storedDefaultProps(def, ctx).items);
  });

  it("fits each block to its size: variants and layout-owned props follow the canvas chip", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "narrow", type: "hero", rect: [0, 62, 8, 60] },
      { id: "kpis", type: "kpis", rect: [0, 124, 12, 14], count: 6 },
      { id: "table", type: "table", rect: [0, 140, 12, 80] },
      { id: "plans", type: "pricing", rect: [0, 222, 12, 60], note: "4 planes" },
    ]);
    const { page } = build(layout, "app");
    expect(page.elements.hero!.props.variant).toBe("centered");
    expect(page.elements.narrow!.props.variant).toBe("split");
    expect(page.elements.kpis!.props.count).toBe(6);
    expect((page.elements.kpis!.props.items as unknown[]).length).toBe(6);
    expect(page.elements.table!.props.pageSize).toBe(estimateValue(layout, "table"));
    expect(page.elements.plans!.props.count).toBe(4);
    expect((page.elements.plans!.props.plans as unknown[]).length).toBe(4);
  });

  it("hidden blocks are kept as elements and listed in page.hidden (only ids that exist)", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "pic", type: "media", rect: [7, 2, 5, 40], parent: "hero" },
      { id: "cta", type: "cta", rect: [0, 62, 12, 25] },
    ]);
    layout.blocks.pic!.hidden = true;
    layout.blocks.cta!.hidden = true;
    const { page } = build(layout);
    expect(page.hidden).toEqual(["cta"]);
    expect(page.elements.cta).toBeDefined();
    expect(page.elements.pic).toBeUndefined();
    expect(checkScreenPage(page, "landing")).toEqual([]);
    layout.blocks.cta!.hidden = false;
    expect(build(layout).page.hidden).toBeUndefined();
  });

  it("absorbs accepted children of non-container blocks: a hero with a media goes split", () => {
    const layout = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "pic", type: "media", rect: [7, 2, 5, 40], parent: "hero" },
      { id: "tbl", type: "table", rect: [1, 44, 5, 14], parent: "hero" },
    ]);
    layout.blocks.pic!.linkTo = "s-signup";
    const result = build(layout);
    expect(result.absorbed).toEqual(["pic"]);
    expect(result.page.elements.pic).toBeUndefined();
    expect(result.page.elements.hero!.props.variant).toBe("split");
    expect(result.page.elements.hero!.children).toEqual([]);
    expect(result.page.elements.tbl?.type).toBe("app.dataTable");
    expect(result.warnings.find((w) => w.code === "not-accepted")?.ids).toEqual(["tbl", "hero"]);
    expect(result.links).toEqual({ hero: "s-signup" });
    expect(cssIds(result.css)).not.toContain("pic");
  });

  it("a modal keeps its children inside app.confirmDialog (a container), drawn as a bare panel", () => {
    const layout = makeLayout([
      { id: "kpis", type: "kpis", rect: [0, 0, 12, 14] },
      { id: "dlg", type: "modal", rect: [3, 4, 6, 40] },
      { id: "frm", type: "form", rect: [4, 6, 4, 30], parent: "dlg", note: "login" },
    ]);
    const { page, css } = build(layout, "app");
    expect(page.elements.layout!.children.at(-1)).toBe("dlg");
    expect(page.elements.dlg).toMatchObject({ type: "app.confirmDialog", children: ["frm"], props: { variant: "panel" } });
    const { container } = render(<PageRenderer doc={acmeDoc()} kind="app" page={page} layoutCss={css} />);
    expect(container.querySelector('[data-dl-id="dlg"] [data-dl-id="frm"]')).toBeTruthy();
  });

  it("the first visible text is the page's h1 when no hero or page header draws one", () => {
    const layout = makeLayout([
      { id: "t1", type: "text", rect: [0, 0, 12, 20] },
      { id: "t2", type: "text", rect: [0, 22, 12, 20] },
    ]);
    const levels = (page: Page) => [page.elements.t1!.props.level, page.elements.t2!.props.level];
    expect(levels(build(layout).page)).toEqual(["h1", "h2"]);
    expect(levels(buildPageFromLayout(layout, "app", { nav: "sidebar", header: true }, ctx).page)).toEqual(["h2", "h2"]);
    const noHeader = buildPageFromLayout(layout, "app", { nav: "sidebar", header: false }, ctx);
    expect(levels(noHeader.page)).toEqual(["h1", "h2"]);
    // A hero added later takes the h1, even for blocks whose fingerprint did not change.
    const withHero = makeLayout([
      { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
      { id: "t1", type: "text", rect: [0, 62, 12, 20] },
      { id: "t2", type: "text", rect: [0, 84, 12, 20] },
    ]);
    const first = build(layout);
    const next = build(withFingerprints(withHero, first.fingerprints), "landing", { previous: first.page });
    expect(levels(next.page)).toEqual(["h2", "h2"]);
    const html = renderToStaticMarkup(<PageRenderer doc={acmeDoc()} kind="app" page={noHeader.page} />);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("fresh text blocks never repeat a title of the page; kept and pinned titles are left alone", () => {
    const layout = makeLayout([
      { id: "intro", type: "text", rect: [0, 0, 12, 16] },
      { id: "more", type: "text", rect: [0, 18, 12, 16] },
      { id: "plans", type: "pricing", rect: [0, 36, 12, 60] },
      { id: "cta", type: "cta", rect: [0, 98, 12, 25] },
    ]);
    const titles = (page: Page) => Object.values(page.elements).flatMap((el) => (typeof el.props.title === "string" ? [el.props.title] : []));
    for (let seed = 0; seed < 60; seed++) {
      const { page } = build(layout, "landing", {}, { ...ctx, seed });
      const all = titles(page);
      expect(new Set(all).size, `seed ${seed}: ${all.join(" | ")}`).toBe(all.length);
    }
    // A title the user pinned (or kept from the previous page) may repeat another heading on purpose.
    const first = build(layout);
    const ctaTitle = first.page.elements.cta!.props.title as string;
    const pinned = withFingerprints(layout, first.fingerprints);
    pinned.blocks.intro = { ...pinned.blocks.intro!, pinned: ["/title"] };
    const previous: Page = {
      ...first.page,
      elements: { ...first.page.elements, intro: { ...first.page.elements.intro!, props: { ...first.page.elements.intro!.props, title: ctaTitle } } },
    };
    for (const mode of ["layout", "content"] as const) {
      expect(build(pinned, "landing", { previous, mode }).page.elements.intro!.props.title, mode).toBe(ctaTitle);
    }
  });

  it("placeholders mirror the block's type, name and note on every build", () => {
    const layout = makeLayout([{ id: "free", type: "free", rect: [0, 0, 4, 20], label: "Mapa", note: "zonas de reparto" }]);
    const first = build(layout);
    expect(first.page.elements.free!.props).toMatchObject({ blockType: "free", blockLabel: "Mapa", blockNote: "zonas de reparto", soon: false });
    const renamed = withFingerprints(layout, first.fingerprints);
    renamed.blocks.free = { ...renamed.blocks.free!, label: "Mapa de zonas" };
    expect(build(renamed, "landing", { previous: first.page }).page.elements.free!.props.blockLabel).toBe("Mapa de zonas");
    const soon = build(makeLayout([{ id: "k", type: "kanban", rect: [0, 0, 12, 50], count: 4 }])).page.elements.k!;
    expect(soon).toMatchObject({ type: "ui.placeholder", props: { blockType: "kanban", soon: true, count: 4 } });
  });
});

describe("buildPageFromLayout: app shell", () => {
  const layout = makeLayout([{ id: "kpis", type: "kpis", rect: [0, 0, 12, 14] }]);

  it("maps the frame: nav → variant, header → showPageHeader, nav items from the app screens", () => {
    const screens = [
      { id: "s-dash", name: "Panel" },
      { id: "s-sett", name: "Ajustes" },
    ];
    const { page } = buildPageFromLayout(layout, "app", { nav: "topnav", header: false }, ctx, {
      navScreens: screens,
      screenId: "s-sett",
      screenTitle: "Ajustes",
    });
    const props = page.elements.shell!.props;
    expect(props).toMatchObject({ variant: "topnav", showPageHeader: false, activeId: "s-sett", title: "Ajustes" });
    expect((props.nav as { id: string; label: string }[]).map(({ id, label }) => [id, label])).toEqual([
      ["s-dash", "Panel"],
      ["s-sett", "Ajustes"],
    ]);
    expect(resolveSectionProps(sectionRegistry.get("app.shell")!, props, ctx).invalidKeys).toEqual([]);
    const html = renderToStaticMarkup(
      <PageRenderer doc={acmeDoc()} kind="app" page={page} linkHref={(id) => `${id}.html`} />,
    );
    expect(html).toContain('data-dl-screen-link="s-dash"');
    expect(html).toContain('href="s-dash.html"');
    expect(html).not.toMatch(/<h1\b/);
  });

  it("keeps the shared shell props (shellProps over the previous page) and an inset sidebar", () => {
    const first = buildPageFromLayout(layout, "app", SIDEBAR, ctx);
    const previous = structuredClone(first.page);
    previous.elements.shell!.props = { ...previous.elements.shell!.props, variant: "inset", tone: "brand" };
    const next = buildPageFromLayout(layout, "app", SIDEBAR, ctx, { previous, shellProps: { density: "compact" } });
    expect(next.page.elements.shell!.props).toMatchObject({ variant: "inset", tone: "brand", density: "compact" });
    const rail = buildPageFromLayout(layout, "app", { nav: "rail", header: true }, ctx, { previous });
    expect(rail.page.elements.shell!.props.variant).toBe("rail");
  });
});

describe("buildPageFromLayout: regenerating keeps edits", () => {
  const layout = makeLayout([
    { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
    { id: "feat", type: "features", rect: [0, 62, 12, 40] },
  ]);

  function edited() {
    const first = build(layout);
    const page = structuredClone(first.page);
    page.elements.hero!.props.title = "Mi titular";
    page.elements.hero!.props.subtitle = "Escrito por la IA";
    (page.elements.feat!.props.items as { title: string }[])[2]!.title = "Mi función";
    const next = withFingerprints(layout, first.fingerprints);
    next.blocks.hero = { ...next.blocks.hero!, pinned: ["/title"] };
    next.blocks.feat = { ...next.blocks.feat!, pinned: ["/items/2/title"] };
    return { first, page, next };
  }

  it("an unchanged block keeps its props verbatim, pinned or not", () => {
    const { page, next } = edited();
    const moved = structuredClone(next);
    moved.blocks.feat!.rect = { ...moved.blocks.feat!.rect, row: 80 };
    const result = build(moved, "landing", { previous: page });
    expect(result.page.elements.hero!.props).toBe(page.elements.hero!.props);
    expect(result.page.elements.feat!.props).toBe(page.elements.feat!.props);
  });

  it("a resize that crosses a variant keeps the copy and pins, and refits the variant and owned keys", () => {
    const { page, next } = edited();
    const resized = structuredClone(next);
    resized.blocks.hero!.rect = { ...resized.blocks.hero!.rect, w: 8 };
    resized.blocks.feat!.count = 5;
    const props = build(resized, "landing", { previous: page }).page.elements;
    expect(props.hero!.props).toMatchObject({ variant: "split", title: "Mi titular", subtitle: "Escrito por la IA" });
    expect(props.feat!.props.count).toBe(5);
    expect((props.feat!.props.items as { title: string }[])[2]!.title).toBe("Mi función");
  });

  it("a pinned variant survives the resize", () => {
    const { page, next } = edited();
    page.elements.hero!.props.variant = "split";
    const resized = structuredClone(next);
    resized.blocks.hero = { ...resized.blocks.hero!, pinned: ["/title", "/variant"], rect: { ...resized.blocks.hero!.rect, w: 12, h: 70 } };
    expect(build(resized, "landing", { previous: page }).page.elements.hero!.props.variant).toBe("split");
  });

  it("content mode (locale change): fresh copy in the new locale, pinned values and owned keys kept", () => {
    const { page, next } = edited();
    next.blocks.feat = { ...next.blocks.feat!, count: 4 };
    const es = contentContextFromDoc(acmeDoc({ locale: "es" }));
    const result = build(next, "landing", { previous: page, mode: "content" }, es);
    const hero = result.page.elements.hero!.props;
    expect(hero.title).toBe("Mi titular");
    expect(hero.subtitle).not.toBe("Escrito por la IA");
    expect(hero.subtitle).toBe(storedDefaultProps(sectionRegistry.get("landing.hero")!, es).subtitle);
    const feat = result.page.elements.feat!.props;
    expect((feat.items as { title: string }[])[2]!.title).toBe("Mi función");
    expect(feat.count).toBe(4);
  });

  it("a type change applies the new defaults and carries the compatible copy and pins", () => {
    const { page, next } = edited();
    const changed = structuredClone(next);
    changed.blocks.feat = { ...changed.blocks.feat!, type: "testimonials" };
    page.elements.feat!.props.title = "Lo que importa";
    changed.blocks.feat.pinned = ["/title", "/items/2/title"];
    const element = build(changed, "landing", { previous: page }).page.elements.feat!;
    expect(element.type).toBe("landing.testimonials");
    expect(element.props.title).toBe("Lo que importa");
    expect(resolveSectionProps(sectionRegistry.get("landing.testimonials")!, element.props, ctx).invalidKeys).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* Property tests: «regenerar sin perder ediciones»                                                  */
/* ------------------------------------------------------------------------------------------------ */

const NOTES = ["calendario semanal", "3 planes", "login", "×4", "buscador", "lado a lado", "monthly", "cinco items", "agenda"];

/** String leaves of a props object (bindings left out), as JSON Pointers. */
function stringLeaves(value: unknown, path = ""): string[] {
  if (typeof value === "string") return path ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((item, i) => stringLeaves(item, `${path}/${i}`));
  if (value && typeof value === "object") {
    if ("bind" in value) return [];
    return Object.entries(value).flatMap(([key, item]) => (key === VARIANT_PROP ? [] : stringLeaves(item, `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`)));
  }
  return [];
}

function setAt(root: Record<string, unknown>, pointer: string, value: unknown) {
  const segments = pointer.slice(1).split("/");
  let current: Record<string, unknown> | unknown[] = root;
  segments.slice(0, -1).forEach((segment) => {
    current = (current as Record<string, unknown>)[segment] as Record<string, unknown>;
  });
  (current as Record<string, unknown>)[segments.at(-1)!] = value;
}

/** Ajustar: copy edits (pinned, like inline text and knobs) and AI rewrites (not pinned). */
function editPage(rand: Rand, page: Page, layout: LayoutDoc, seed: number): { page: Page; layout: LayoutDoc } {
  const nextPage = structuredClone(page);
  const nextLayout = structuredClone(layout);
  let n = 0;
  for (const [id, element] of Object.entries(nextPage.elements)) {
    const block = nextLayout.blocks[id];
    const def = sectionRegistry.get(element.type);
    if (!block || !def || !chance(rand, 0.6)) continue;
    const leaves = stringLeaves(element.props).filter((pointer) => !OVERRIDE_KEYS.has(pointer.split("/")[1]!));
    const pinned = new Set(block.pinned ?? []);
    for (let i = 0; i < 2 && leaves.length > 0; i++) {
      const pointer = pickOne(rand, leaves);
      const before = readAt(element.props, pointer);
      setAt(element.props, pointer, `Edit ${seed}-${++n}`);
      if (resolveSectionProps(def, element.props, ctx).invalidKeys.length > 0) {
        setAt(element.props, pointer, before);
        continue;
      }
      if (chance(rand, 0.7)) pinned.add(pointer);
    }
    if (def.variants.length > 1 && chance(rand, 0.2)) {
      element.props[VARIANT_PROP] = pickOne(rand, def.variants).id;
      pinned.add(`/${VARIANT_PROP}`);
    }
    if (pinned.size > 0) block.pinned = [...pinned].sort();
  }
  return { page: nextPage, layout: nextLayout };
}

function descendants(layout: LayoutDoc, id: BlockId): BlockId[] {
  const out: BlockId[] = [];
  for (const [childId, block] of Object.entries(layout.blocks)) {
    if (block.parentId === id) out.push(childId, ...descendants(layout, childId));
  }
  return out;
}

/** Canvas edits: resize, ×N, note, type, move, hide, delete. Keeps the layout valid. */
function mutateLayout(rand: Rand, layout: LayoutDoc): LayoutDoc {
  const next = structuredClone(layout);
  const ops = randInt(rand, 1, 4);
  for (let i = 0; i < ops; i++) {
    const ids = Object.keys(next.blocks).sort();
    if (ids.length === 0) break;
    const id = pickOne(rand, ids);
    const block: LayoutBlock = { ...next.blocks[id]! };
    const def = getBlockDef(block.type);
    const roll = rand();
    if (roll < 0.25) {
      block.rect = { ...block.rect, w: randInt(rand, 1, 12 - block.rect.col), h: randInt(rand, 2, 90) };
    } else if (roll < 0.38) {
      if (def.repeatable) block.count = randInt(rand, def.repeatable.min, def.repeatable.max);
    } else if (roll < 0.5) {
      block.note = pickOne(rand, NOTES);
    } else if (roll < 0.62) {
      if (descendants(next, id).length === 0) {
        block.type = pickOne(rand, LEAF_TYPES);
        const repeatable = getBlockDef(block.type).repeatable;
        if (block.count !== undefined && (!repeatable || block.count < repeatable.min || block.count > repeatable.max)) delete block.count;
      }
    } else if (roll < 0.8) {
      const col = randInt(rand, 0, 12 - block.rect.w);
      const row = Math.max(0, block.rect.row + randInt(rand, -10, 10));
      block.rect = { ...block.rect, col, row };
    } else if (roll < 0.9) {
      block.hidden = !block.hidden;
    } else {
      for (const gone of [id, ...descendants(next, id)]) delete next.blocks[gone];
      continue;
    }
    next.blocks[id] = block;
  }
  return next;
}

describe("property: regenerating never loses edits", () => {
  it("random canvas edits + regenerate keep pinned values and copy outside `owns`; ids stable; never invalid", () => {
    let checkedPins = 0;
    let checkedCopy = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const rand = mulberry32(seed * 7919);
      const layout0 = chance(rand, 0.5) ? randomSeparableLayout(rand, { maxBlocks: 18 }) : randomLayout(rand, { maxBlocks: 18 });
      const kind: ScreenKind = chance(rand, 0.5) ? "landing" : "app";
      const shell: AppShell | null = kind === "app" ? { nav: pickOne(rand, ["sidebar", "rail", "topnav", "none"] as const), header: chance(rand, 0.5) } : null;
      const first = buildPageFromLayout(layout0, kind, shell, ctx);
      const { page: page1, layout: layout1 } = editPage(rand, first.page, withFingerprints(layout0, first.fingerprints), seed);
      const layout2 = mutateLayout(rand, layout1);
      const result = buildPageFromLayout(layout2, kind, shell, ctx, { previous: page1 });
      const at = `seed ${seed}`;

      expect(checkScreenPage(result.page, kind), at).toEqual([]);
      const fingerprinted = withFingerprints(layout2, result.fingerprints);
      expect(LayoutDocSchema.safeParse(fingerprinted).success, at).toBe(true);

      for (const [id, block] of Object.entries(layout2.blocks)) {
        if (result.absorbed.includes(id)) {
          expect(result.page.elements[id], at).toBeUndefined();
          continue;
        }
        const element = result.page.elements[id];
        const type = getBlockDef(block.type).sectionType;
        expect(element?.type, `${at} ${id}`).toBe(type);
        const before = page1.elements[id];
        const def = sectionRegistry.get(type)!;
        if (!before || before.type !== type) {
          expect(resolveSectionProps(def, element!.props, ctx).invalidKeys, `${at} ${id}`).toEqual([]);
          continue;
        }
        for (const pointer of block.pinned ?? []) {
          const value = readAt(before.props, pointer);
          if (value === undefined) continue;
          expect(readAt(element!.props, pointer), `${at} ${id} ${pointer}`).toEqual(value);
          checkedPins++;
        }
        const owns = new Set([...ownsOf(type), VARIANT_PROP, ...OVERRIDE_KEYS]);
        for (const [key, value] of Object.entries(before.props)) {
          if (owns.has(key)) continue;
          const now = element!.props[key];
          if (Array.isArray(value) && Array.isArray(now) && now.length > value.length) {
            expect(now.slice(0, value.length), `${at} ${id} /${key}`).toEqual(value);
          } else {
            expect(now, `${at} ${id} /${key}`).toEqual(value);
          }
          checkedCopy++;
        }
      }
      const again = buildPageFromLayout(fingerprinted, kind, shell, ctx, { previous: result.page });
      expect(again.page, `${at} idempotent`).toEqual(result.page);
    }
    expect(checkedPins).toBeGreaterThan(100);
    expect(checkedCopy).toBeGreaterThan(1000);
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* Every section on a landing and an app screen (critique #1)                                        */
/* ------------------------------------------------------------------------------------------------ */

describe("every section renders on landing and app screen pages", () => {
  it("one block of each library type compiles to a valid page and renders without section errors", () => {
    for (const kind of ["landing", "app"] as const) {
      const layout = everyBlockLayout(kind);
      const result = build(layout, kind);
      expect(checkScreenPage(result.page, kind)).toEqual([]);
      const { html, errors } = staticMarkup(result.page, kind, { css: result.css });
      expect(errors, kind).toEqual([]);
      const rendered = new Set(markupIds(html));
      for (const id of Object.keys(result.page.elements)) {
        if (id !== "root") expect(rendered.has(id), `${kind} ${id}`).toBe(true);
      }
    }
  });

  it("every registered landing, app and ui section, placed by hand under the scope, renders in both kinds", () => {
    const types = sectionRegistry
      .list()
      .map((def) => def.type)
      .filter((type) => !type.startsWith("brand."));
    expect(types.length).toBeGreaterThanOrEqual(25);
    for (const kind of ["landing", "app"] as const) {
      const page: Page = {
        kind,
        layoutId: "custom",
        root: "root",
        elements: {
          root: { type: `${kind}.page`, props: {}, children: [LAYOUT_SCOPE_ID] },
          layout: { type: REGION_TYPE, props: { role: "scope", screenKind: kind }, children: types.map((_, i) => `s-${i}`) },
          ...Object.fromEntries(
            types.map((type, i) => [`s-${i}`, { type, props: storedDefaultProps(sectionRegistry.get(type)!, ctx), children: [] }]),
          ),
        },
      };
      expect(checkScreenPage(page, kind)).toEqual([]);
      const { errors } = staticMarkup(page, kind);
      expect(errors, kind).toEqual([]);
      for (const interactive of [false, true]) {
        const failures: string[] = [];
        const { container, unmount } = render(
          <PageRenderer doc={acmeDoc()} kind={kind} page={page} interactive={interactive} onSectionError={(id) => failures.push(id)} />,
        );
        expect(failures, `${kind} interactive=${interactive}`).toEqual([]);
        types.forEach((type, i) => expect(container.querySelector(`[data-dl-id="s-${i}"]`), type).toBeTruthy());
        unmount();
      }
    }
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* fit agrees with the canvas chip (estimateContent)                                                 */
/* ------------------------------------------------------------------------------------------------ */

function estimateValue(layout: LayoutDoc, id: BlockId): number | string | undefined {
  return estimateContent(layout.blocks[id]!, layout, id)?.value;
}

const FIT_NOTES = [undefined, "semanal", "mensual", "agenda", "login", "lado a lado", "×5", "dos", "carrusel"];
const SIZES = [
  [1, 6],
  [3, 20],
  [4, 40],
  [6, 14],
  [6, 50],
  [8, 30],
  [8, 60],
  [9, 25],
  [12, 8],
  [12, 30],
  [12, 60],
  [12, 120],
] as const;

describe("fit agrees with estimateContent for every ready block type", () => {
  it("count, variant and ratio promises map to the section's props", () => {
    let compared = 0;
    for (const def of LIBRARY.filter((d) => d.status === "ready" || d.repeatable)) {
      const section = sectionRegistry.get(def.sectionType);
      expect(section, def.sectionType).toBeDefined();
      if (!section?.layout) continue;
      const counts = def.repeatable ? [undefined, def.repeatable.min, def.repeatable.default, def.repeatable.max] : [undefined];
      for (const [w, h] of SIZES) {
        for (const note of FIT_NOTES) {
          for (const count of counts) {
            const block: LayoutBlock = {
              type: def.type,
              label: def.type,
              rect: { col: 0, row: 0, w, h },
              z: 1,
              ...(note && { note }),
              ...(count !== undefined && { count }),
            };
            const layout: LayoutDoc = { ...emptyLayout(), blocks: { b: block } };
            const estimate = estimateContent(block, layout, "b");
            const input: FitInput = {
              w,
              h,
              widthPx: w * 120,
              heightPx: h * 8,
              ...(count !== undefined && { count }),
              note: parseNote(note),
              estimate,
              absorbed: [],
              kind: "landing",
              blockId: "b",
            };
            const fit = section.layout.fit(input);
            const props = (fit.props ?? {}) as Record<string, unknown>;
            const at = `${def.type} ${w}×${h} note=${note} count=${count}`;
            if (fit.variant !== undefined) expect(section.variants.map((v) => v.id), at).toContain(fit.variant);
            const stored = { ...storedDefaultProps(section, ctx), ...(section.layout.defaults?.(ctx) ?? {}), ...props };
            expect(resolveSectionProps(section, stored, ctx).invalidKeys, at).toEqual([]);
            for (const key of Object.keys(props)) expect(section.layout.owns, `${at}: ${key} is owned`).toContain(key);
            const promised = promise(def.type, estimate);
            if (promised === null) continue;
            const [where, value] = promised;
            expect(where === "variant" ? fit.variant : props[where], at).toBe(value);
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(1000);
  });
});

/** Where a section keeps what the chip promised: `[prop or "variant", value]`, or `null` (no promise). */
function promise(type: LibraryBlockType, estimate: ReturnType<typeof estimateContent>): [string, unknown] | null {
  if (!estimate) return null;
  switch (type) {
    case "table":
      return ["pageSize", estimate.value];
    case "navbar":
      return ["linkCount", estimate.value];
    case "footer":
      return ["variant", (estimate.value as number) >= 2 ? "columns" : "simple"];
    case "settings":
      return null; // «fields 2–8»: app.settingsForm has no field count (documented gap).
    case "media":
      return ["ratio", estimate.value];
    case "hero":
    case "chart":
    case "calendar":
      return ["variant", estimate.value];
    default:
      return estimate.kind === "count" ? ["count", estimate.value] : null;
  }
}

/* ------------------------------------------------------------------------------------------------ */

describe("links between screens", () => {
  const layout = makeLayout([
    { id: "hero", type: "hero", rect: [0, 0, 12, 60] },
    { id: "plans", type: "pricing", rect: [0, 62, 12, 60] },
    { id: "cta", type: "cta", rect: [0, 124, 12, 25] },
  ]);
  layout.blocks.hero!.linkTo = "s-signup";
  layout.blocks.plans!.linkTo = "s-checkout";

  it("blocks with linkTo come back in `links`; their primary actions link to the screen", () => {
    const result = build(layout);
    expect(result.links).toEqual({ hero: "s-signup", plans: "s-checkout" });
    const html = renderStaticPage(acmeDoc(), "landing", {}, {
      page: result.page,
      fonts: false,
      links: result.links,
      linkHref: (id) => (id === "s-signup" ? "signup/index.html" : id === "s-checkout" ? "checkout/index.html" : null),
    });
    expect(html).toContain('href="signup/index.html" data-dl-screen-link="s-signup"');
    expect(html.match(/data-dl-screen-link="s-checkout"/g)?.length).toBe(3);
    // The CTA links nowhere: its button keeps `#`.
    const plain = renderStaticPage(acmeDoc(), "landing", {}, { page: result.page, fonts: false });
    expect(plain).not.toContain("data-dl-screen-link");
  });

  it("the navigable preview switches screens on click (outside edit mode only)", () => {
    const result = build(layout);
    const seen: string[] = [];
    const { container, rerender } = render(
      <PageRenderer doc={acmeDoc()} kind="landing" page={result.page} links={result.links} onNavigate={(id) => seen.push(id)} />,
    );
    const link = container.querySelector<HTMLAnchorElement>('[data-dl-screen-link="s-signup"]')!;
    expect(link.getAttribute("href")).toBe("#");
    link.click();
    expect(seen).toEqual(["s-signup"]);
    rerender(
      <PageRenderer doc={acmeDoc()} kind="landing" page={result.page} links={result.links} onNavigate={(id) => seen.push(id)} interactive />,
    );
    container.querySelector<HTMLElement>('[data-dl-id="hero"]')!.click();
    expect(seen).toEqual(["s-signup"]);
  });
});

describe("structural regions in edit mode", () => {
  it("the scope and inferred regions are plain boxes; blocks stay selectable", () => {
    const layout = makeLayout([
      { id: "a", type: "text", rect: [0, 0, 6, 20] },
      { id: "b", type: "media", rect: [6, 0, 6, 20] },
      { id: "c", type: "cards", rect: [0, 22, 12, 30] },
    ]);
    const { page } = build(layout);
    const selected: string[] = [];
    const { container } = render(
      <PageRenderer doc={acmeDoc()} kind="landing" page={page} interactive onSelect={(id) => selected.push(id)} />,
    );
    const regions = [...container.querySelectorAll<HTMLElement>('[data-dl-type="ui.region"]')];
    expect(regions.length).toBeGreaterThanOrEqual(2);
    for (const region of regions) {
      expect(region.hasAttribute("tabindex")).toBe(false);
      expect(region.hasAttribute("role")).toBe(false);
      region.click();
    }
    expect(selected).toEqual([]);
    container.querySelector<HTMLElement>('[data-dl-id="a"]')!.click();
    expect(selected).toEqual(["a"]);
    expect(container.querySelector('[data-dl-id="c"]')?.getAttribute("tabindex")).toBe("0");
  });
});

describe("performance", () => {
  it("compiles 200 blocks in under 100 ms", () => {
    const layout = emptyLayout();
    const types = LEAF_TYPES;
    for (let i = 0; i < 200; i++) {
      const type = types[i % types.length]!;
      layout.blocks[`p-${i}`] = { type, label: type, rect: { col: (i % 3) * 4, row: Math.floor(i / 3) * 22, w: 4, h: 20 }, z: i + 1 };
    }
    build(layout, "app");
    const times: number[] = [];
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      const result = build(layout, "app");
      times.push(performance.now() - start);
      expect(Object.keys(result.page.elements).length).toBeGreaterThan(200);
    }
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(100);
  });
});
