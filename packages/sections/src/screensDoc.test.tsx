import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PROMPT_TARGETS,
  applyPatch,
  checkScreenPage,
  compileThemeVars,
  formatIssues,
  parseDesignDoc,
  removeScreenOps,
  renderTargets,
  safeParseDesignDoc,
  screenPointer,
  toDTCGFull,
  toDesignMd,
  toFigmaNumberVars,
  toPromptPack,
  toThemeCss,
  type DesignDoc,
  type ScreenInput,
} from "@dialmade/doc";
import {
  SCREEN_TEMPLATES,
  inferStructure,
  instantiateTemplate,
  type AppShell,
  type LayoutDoc,
  type LibraryBlockType,
  type ScreenKind,
  type ScreenTemplate,
} from "@dialmade/layout";
import { buildDefaultPage } from "./buildPage";
import { buildPageFromLayout, LAYOUT_SCOPE_ID, REGION_TYPE, type NavScreen } from "./buildPageFromLayout";
import { contentContextFromDoc } from "./context";
import { PageRenderer } from "./PageRenderer";
import { renderStaticPage } from "./renderToHtml";
import { acmeDoc } from "./testing/fixtures";
import { cssIds, markupIds, withFingerprints } from "./testing/layout";
import { visibleProps } from "./visibleProps";

/*
 * Integration of the three Modo Layout packages: every screen template of @dialmade/layout, instantiated and
 * compiled by `buildPageFromLayout`, makes one DesignDoc v2 that @dialmade/doc accepts, renders and exports.
 */

type Spec = { id: string; name: string; route: string; template: ScreenTemplate; kind: ScreenKind; shell: AppShell | null };

const NAMES: Record<string, string> = {
  home: "Inicio",
  pricing: "Precios",
  login: "Entrar",
  dashboard: "Dashboard",
  settings: "Ajustes",
  detail: "Detalle",
  list: "Lista",
  checkout: "Pago",
  profile: "Perfil",
};

/** Links of the flow, by template and block type: the first block of that type links to the screen. */
const FLOW: Record<string, Partial<Record<LibraryBlockType, string>>> = {
  home: { navbar: "s-pricing", hero: "s-login", cta: "s-login" },
  pricing: { pricing: "s-checkout" },
  login: { form: "s-dashboard" },
  dashboard: { table: "s-detail" },
  list: { table: "s-detail" },
  checkout: { form: "s-dashboard" },
};

/** One screen per template; the blank template (no kind) twice, as a web page and as an app screen. */
function specs(): Spec[] {
  const out: Spec[] = [];
  for (const template of SCREEN_TEMPLATES) {
    if (template.kind === null) {
      out.push({ id: "s-blank-web", name: "En blanco web", route: "/en-blanco", template, kind: "landing", shell: null });
      out.push({
        id: "s-blank-app",
        name: "En blanco app",
        route: "/app/en-blanco",
        template,
        kind: "app",
        shell: { nav: "sidebar", header: true },
      });
      continue;
    }
    out.push({
      id: `s-${template.id}`,
      name: NAMES[template.id]!,
      route: template.id === "home" ? "/" : template.kind === "app" ? `/app/${template.id}` : `/${template.id}`,
      template,
      kind: template.kind,
      shell: template.shell,
    });
  }
  return out;
}

/** Deterministic `b-xxxxxx` ids, unique across the whole document. */
function idFactory() {
  let n = 0;
  return () => `b-${(n++).toString(36).padStart(6, "0")}`;
}

const blockLabel = (type: LibraryBlockType) => `${type[0]!.toUpperCase()}${type.slice(1)}`;

function linkFlow(layout: LayoutDoc, templateId: string): LayoutDoc {
  const flow = FLOW[templateId] ?? {};
  const linked = new Set<string>();
  const blocks = { ...layout.blocks };
  for (const [id, block] of Object.entries(blocks)) {
    const to = flow[block.type];
    if (to && !linked.has(block.type)) {
      blocks[id] = { ...block, linkTo: to };
      linked.add(block.type);
    }
  }
  return { ...layout, blocks };
}

/** The document the app would write after «Generar»: screens + screenOrder + the style guide. */
function screensDocument(locale: "es" | "en" = "es"): { input: unknown; css: Record<string, string>; links: Record<string, Record<string, string>> } {
  const base = acmeDoc({ locale });
  const ctx = contentContextFromDoc(base);
  const newId = idFactory();
  const all = specs();
  const navScreens: NavScreen[] = all
    .filter((spec) => spec.kind === "app" && spec.shell && spec.shell.nav !== "none")
    .map((spec) => ({ id: spec.id, name: spec.name }));
  const screens: ScreenInput[] = [];
  const css: Record<string, string> = {};
  const links: Record<string, Record<string, string>> = {};
  for (const spec of all) {
    const { layout: fresh } = instantiateTemplate(spec.template, { label: blockLabel, newId });
    const layout = linkFlow(fresh, spec.template.id);
    const result = buildPageFromLayout(layout, spec.kind, spec.shell, ctx, {
      screenId: spec.id,
      screenTitle: spec.name,
      navScreens,
    });
    css[spec.id] = result.css;
    links[spec.id] = result.links;
    screens.push({
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      route: spec.route,
      layout: withFingerprints(layout, result.fingerprints),
      page: result.page,
      shell: spec.shell,
    });
  }
  const input = {
    ...base,
    brief: { ...base.brief, focus: screens[0]!.kind },
    pages: { brand: buildDefaultPage("brand", ctx) },
    screens: Object.fromEntries(screens.map((screen) => [screen.id, screen])),
    screenOrder: screens.map((screen) => screen.id),
  };
  return { input, css, links };
}

function parsed(locale: "es" | "en" = "es"): DesignDoc {
  const result = safeParseDesignDoc(screensDocument(locale).input);
  if (!result.success) throw new Error(formatIssues(result.issues));
  return result.data;
}

describe("a DesignDoc v2 built from every screen template", () => {
  it("passes the doc schema in both locales", () => {
    for (const locale of ["es", "en"] as const) {
      const result = safeParseDesignDoc(screensDocument(locale).input);
      expect(result.success ? [] : formatIssues(result.issues)).toEqual([]);
      if (!result.success) continue;
      expect(result.data.version).toBe(2);
      expect(result.data.screenOrder).toHaveLength(SCREEN_TEMPLATES.length + 1);
      expect(result.data.pages.landing).toBeUndefined();
      expect(result.data.pages.app).toBeUndefined();
    }
  });

  it("every screen page is a valid page of its kind with a structural layout scope", () => {
    const doc = parsed();
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      expect(checkScreenPage(screen.page, screen.kind), id).toEqual([]);
      const scope = screen.page.elements[LAYOUT_SCOPE_ID]!;
      expect(scope.type).toBe(REGION_TYPE);
      expect(scope.props.role).toBe("scope");
      // Every visible block has its element (or was absorbed by its parent); inferred regions are `r-…`.
      for (const [elementId, element] of Object.entries(screen.page.elements)) {
        if (element.type !== REGION_TYPE || elementId === LAYOUT_SCOPE_ID) continue;
        if (elementId.startsWith("r-")) expect(element.props.role, elementId).toBe("inferred");
        else expect(screen.layout.blocks[elementId]?.type, elementId).toBe("container");
      }
      for (const blockId of Object.keys(screen.layout.blocks)) {
        const absorbed = screen.layout.blocks[blockId]!.generated?.variant === "absorbed";
        expect(Object.hasOwn(screen.page.elements, blockId) || absorbed, `${id}/${blockId}`).toBe(true);
      }
    }
  });

  it("templates compile to what they promise: a sign-in form on Login, no repeated text headings", () => {
    const doc = parsed();
    const login = doc.screens["s-login"]!;
    const formId = Object.keys(login.layout.blocks).find((id) => login.layout.blocks[id]!.type === "form")!;
    expect(login.page.elements[formId]).toMatchObject({ type: "ui.form", props: { purpose: "login" } });
    for (const id of doc.screenOrder) {
      const elements = Object.values(doc.screens[id]!.page.elements);
      const titles = elements.flatMap((element) => (typeof element.props.title === "string" ? [element.props.title] : []));
      const textTitles = elements.filter((element) => element.type === "ui.text").map((element) => element.props.title);
      for (const title of textTitles) expect(titles.filter((other) => other === title), `${id}: ${String(title)}`).toHaveLength(1);
    }
  });

  it("renderTargets lists the screens in order, then the style guide", () => {
    const doc = parsed();
    expect(renderTargets(doc).map((target) => target.key)).toEqual([...doc.screenOrder, "brand"]);
  });

  it("regenerating every screen from its own page changes nothing", () => {
    const doc = parsed();
    const ctx = contentContextFromDoc(doc);
    const navScreens = doc.screenOrder
      .map((id) => doc.screens[id]!)
      .filter((screen) => screen.kind === "app" && screen.shell && screen.shell.nav !== "none")
      .map((screen) => ({ id: screen.id, name: screen.name }));
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      const again = buildPageFromLayout(screen.layout, screen.kind, screen.shell, ctx, {
        previous: screen.page,
        screenId: id,
        screenTitle: screen.name,
        navScreens,
      });
      expect(again.page, id).toEqual(screen.page);
      expect(withFingerprints(screen.layout, again.fingerprints), id).toEqual(screen.layout);
    }
  });

  it("accepts patches under /screens and the removal of a linked screen", () => {
    const doc = parsed();
    const dashboard = doc.screens["s-dashboard"]!;
    const [firstBlock] = Object.keys(dashboard.layout.blocks);
    const hidden = applyPatch(doc, [
      { op: "add", path: screenPointer("s-dashboard", "layout", "blocks", firstBlock!, "hidden"), value: true },
      { op: "add", path: screenPointer("s-dashboard", "page", "hidden"), value: [firstBlock!] },
    ]);
    expect(hidden.ok ? [] : hidden.error).toEqual([]);

    const removed = applyPatch(doc, removeScreenOps(doc, "s-login"));
    expect(removed.ok ? [] : removed.error).toEqual([]);
    if (!removed.ok) return;
    expect(removed.doc.screenOrder).not.toContain("s-login");
    for (const screen of Object.values(removed.doc.screens)) {
      for (const block of Object.values(screen.layout.blocks)) expect(block.linkTo).not.toBe("s-login");
    }
  });
});

describe("exporters render the screens document", () => {
  it.each(["es", "en"] as const)("DESIGN.md (%s) has the flow and one wireframe per screen", (locale) => {
    const doc = parsed(locale);
    const md = toDesignMd(doc, { locale });
    expect(md).toContain(locale === "es" ? "### Pantallas y flujo" : "### Screens and flow");
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      expect(md).toContain(`### ${screen.name} (\`${screen.route}\`)`);
    }
    // The links of the flow, and no structural region in the page outline.
    expect(md).toContain(locale === "es" ? "enlaza a «Entrar»" : 'links to "Entrar"');
    expect(md).not.toMatch(/ui\.region\b.*role: "(scope|inferred)"/);
    // No new top-level headings or frontmatter keys compared with a legacy document.
    const legacyBase = acmeDoc({ locale });
    const legacyCtx = contentContextFromDoc(legacyBase);
    const legacyDoc = parseDesignDoc({
      ...legacyBase,
      pages: Object.fromEntries((["brand", "landing", "app"] as const).map((kind) => [kind, buildDefaultPage(kind, legacyCtx)])),
    });
    const legacy = toDesignMd(legacyDoc, { locale });
    const headings = (text: string) => text.split("\n").filter((line) => /^## /.test(line));
    expect(headings(md).filter((line) => !headings(legacy).includes(line))).toEqual([]);
  });

  it("with visibleProps, «## Páginas» lists only the items each section shows", () => {
    const doc = parsed();
    const kpis = Object.values(doc.screens["s-dashboard"]!.layout.blocks).find((block) => block.type === "kpis")!;
    const itemsAfter = (md: string, type: string) => {
      const lines = md.slice(md.indexOf("### Dashboard (Layout propio)")).split("\n");
      const at = lines.findIndex((line) => line.includes(`(\`${type}\`)`));
      return lines[at + 1]!.trim().split('"; "').length;
    };
    const all = toDesignMd(doc, { locale: "es" });
    const shown = toDesignMd(doc, { locale: "es", visibleProps: (element) => visibleProps(element) });
    expect(itemsAfter(all, "app.kpiRow")).toBeGreaterThan(kpis.count!);
    expect(itemsAfter(shown, "app.kpiRow")).toBe(kpis.count);
  });

  it("every prompt pack, theme CSS, DTCG and Figma variables export", () => {
    const doc = parsed();
    for (const target of PROMPT_TARGETS) {
      for (const locale of ["es", "en"] as const) {
        const text = toPromptPack(doc, target, locale);
        expect(text.length, `${target} ${locale}`).toBeGreaterThan(0);
        expect(text).toContain(locale === "es" ? "Pantallas y flujo" : "Screens and flow");
      }
    }
    expect(toThemeCss(doc)).toContain("DesignDoc v2");
    expect(() => JSON.stringify(toDTCGFull(doc))).not.toThrow();
    expect(toFigmaNumberVars(doc)).toBeTruthy();
  });

  it("every screen renders to static HTML with its layout CSS ids and real links", () => {
    const { css, links } = screensDocument();
    const doc = parsed();
    const vars = compileThemeVars(doc, { mode: "light" });
    const hrefOf = (screenId: string) => {
      const route = doc.screens[screenId]?.route;
      return route === undefined ? null : route === "/" ? "index.html" : `${route.slice(1)}.html`;
    };
    let linked = 0;
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      const errors: string[] = [];
      const html = renderStaticPage(doc, screen.kind, vars, {
        page: screen.page,
        css: css[id]!,
        linkHref: hrefOf,
        links: links[id]!,
        fonts: false,
        onSectionError: (elementId) => errors.push(elementId),
      });
      expect(errors, id).toEqual([]);
      const ids = new Set(markupIds(html));
      for (const cssId of cssIds(css[id]!)) expect(ids.has(cssId), `${id}: ${cssId}`).toBe(true);
      linked += [...html.matchAll(/data-dl-screen-link="([^"]+)"/g)].length;
      for (const [, target] of html.matchAll(/data-dl-screen-link="([^"]+)"/g)) expect(doc.screenOrder).toContain(target);
    }
    expect(linked).toBeGreaterThan(0);
  });

  it("structural regions are never selectable in edit mode; their blocks are", () => {
    const doc = parsed();
    for (const id of doc.screenOrder) {
      const screen = doc.screens[id]!;
      const { container, unmount } = render(
        <PageRenderer doc={doc} kind={screen.kind} page={screen.page} interactive onSelect={() => {}} />,
      );
      for (const region of container.querySelectorAll<HTMLElement>('[data-dl-region="scope"], [data-dl-region="inferred"]')) {
        expect(region.hasAttribute("tabindex"), `${id}: ${region.dataset.dlId}`).toBe(false);
        expect(region.getAttribute("role"), `${id}: ${region.dataset.dlId}`).toBeNull();
      }
      const order = inferStructure(screen.layout).order;
      for (const blockId of order) {
        const element = container.querySelector<HTMLElement>(`[data-dl-id="${blockId}"]`);
        if (!element) continue; // absorbed by its parent
        expect(element.getAttribute("tabindex"), `${id}: ${blockId}`).toBe("0");
      }
      unmount();
    }
  });
});
