import { describe, expect, it } from "vitest";
import { orderedScreens, resolveExport, type DesignDoc } from "@dialmade/doc";
import { VARIANT_PROP, contentContextFromDoc, linkContext, resolveSectionProps, sectionRegistry, type RenderContext } from "@dialmade/sections";
import { FigmaPlanSchema } from "../../../figma/schema";
import { planFromTree, toFigmaPlan } from "../../../figma/toFigmaPlan";
import { everyBlockDoc, legacyDoc, screensDoc } from "../../../testing/fixtures";
import { themeSnapshot } from "../../../theme";
import { PAGE_WIDTH, buildDesignTree } from "../../build";
import type { SectionInput } from "../../context";
import { column, text } from "../../nodes";
import type { DesignNode, DesignTree, FrameNode } from "../../types";
import { SECTION_BUILDERS } from "..";
import { APP_BUILDERS } from ".";

/** Root name each builder gives its section (the generic fallback names it after the section's label). */
const BUILDER_NAMES: Record<string, string> = {
  "app.shell": "App shell",
  "app.kpiRow": "KPIs",
  "app.chartCard": "Chart card",
  "app.activity": "Activity",
  "app.dataTable": "Data table",
  "app.settingsForm": "Settings form",
  "app.emptyState": "Empty state",
  "app.confirmDialog": "Confirm dialog",
  "app.componentGallery": "Component gallery",
};

function* walk(node: DesignNode): Generator<DesignNode> {
  yield node;
  if (node.type === "frame") for (const child of node.children) yield* walk(child);
}

const frames = (node: DesignNode) => [...walk(node)].filter((n): n is FrameNode => n.type === "frame");

/** Element id → type over every page of a document. */
function elementTypes(doc: DesignDoc): Map<string, string> {
  const types = new Map<string, string>();
  for (const screen of orderedScreens(doc)) for (const [id, element] of Object.entries(screen.page.elements)) types.set(id, element.type);
  for (const page of Object.values(doc.pages)) for (const [id, element] of Object.entries(page?.elements ?? {})) if (!types.has(id)) types.set(id, element.type);
  return types;
}

describe("app builders", () => {
  it("registers one builder per app section", () => {
    const appTypes = sectionRegistry.list().filter((def) => def.type.startsWith("app.")).map((def) => def.type).sort();
    expect(Object.keys(APP_BUILDERS).sort()).toEqual(appTypes);
    for (const type of appTypes) expect(SECTION_BUILDERS[type]).toBe(APP_BUILDERS[type]);
  });

  for (const [name, make] of [
    ["everyBlockDoc", everyBlockDoc],
    ["screensDoc", screensDoc],
    ["legacyDoc", legacyDoc],
  ] as const) {
    it(`builds every app section of ${name} with its own builder and a valid plan`, () => {
      const doc = make();
      const errors: string[] = [];
      const tree = buildDesignTree(doc, { onSectionError: (id, type, error) => errors.push(`${id} ${type} ${String(error)}`) });
      expect(errors).toEqual([]);
      const types = elementTypes(doc);
      const built = new Set<string>();
      for (const page of tree.pages) {
        for (const node of frames(page.root)) {
          const type = node.key ? types.get(node.key) : undefined;
          if (!type?.startsWith("app.")) continue;
          expect(node.name, `${node.key} (${type})`).toBe(BUILDER_NAMES[type]);
          built.add(type);
        }
      }
      expect(built.size).toBeGreaterThan(0);
      FigmaPlanSchema.parse(toFigmaPlan(doc));
    });
  }

  it("covers every app section across the fixtures", () => {
    const seen = new Set<string>();
    for (const doc of [everyBlockDoc(), screensDoc(), legacyDoc()]) for (const type of elementTypes(doc).values()) if (type.startsWith("app.")) seen.add(type);
    for (const type of Object.keys(APP_BUILDERS)) expect(seen.has(type), type).toBe(true);
  });

  it("links nav items to their screens and primary actions to the block's screen", () => {
    const tree = buildDesignTree(screensDoc());
    const dashboard = tree.pages.find((page) => page.id === "s-dashboard")!;
    const links = frames(dashboard.root).filter((node) => node.name.startsWith("Nav item")).map((node) => node.linkTo);
    expect(links).toEqual(["s-dashboard", "s-settings", undefined]);
    // The dashboard's table links to Ajustes (`linkTo` of its block): the table has no primary action, the
    // nav item of the active screen is highlighted.
    expect(frames(dashboard.root).find((node) => node.name === "Nav item/active")?.linkTo).toBe("s-dashboard");
  });
});

/* ------------------------------------------------------------------------------------------------ */
/* Shell variants                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

function shellInput(variant: string, extra: Record<string, unknown> = {}, options: { id?: string; children?: DesignNode[] } = {}): SectionInput {
  const doc = screensDoc();
  const element = doc.screens["s-dashboard"]!.page.elements.shell!;
  const ctx: RenderContext = {
    ...contentContextFromDoc(doc),
    mode: "light",
    interactive: false,
    doc,
    ...linkContext({ links: {}, linkHref: (id) => (Object.hasOwn(doc.screens, id) ? id : null) }),
  };
  const def = sectionRegistry.get("app.shell")!;
  const resolved = resolveSectionProps(def, { ...element.props, [VARIANT_PROP]: variant, ...extra }, ctx);
  const { inputs, light, dark } = resolveExport(doc, {});
  return {
    id: options.id ?? "shell",
    type: "app.shell",
    props: resolved.props,
    variant: resolved.variant,
    children: options.children ?? [column({ name: "Layout", key: "layout", width: "fill" }, [text("Widgets", "body")])],
    ctx,
    build: { doc, inputs, light, dark, pageKind: "app" },
  };
}

function planOf(input: SectionInput, root: FrameNode) {
  const tree: DesignTree = {
    name: "Shell",
    locale: "es",
    mode: "light",
    pages: [{ id: "s-dashboard", name: "Dashboard", kind: "screen", pageKind: "app", width: PAGE_WIDTH, root: column({ name: "Dashboard", width: PAGE_WIDTH }, [root]) }],
  };
  return FigmaPlanSchema.parse(planFromTree(input.build.doc, tree, themeSnapshot(input.build.doc)));
}

describe("app.shell variants", () => {
  const build = (variant: string, extra?: Record<string, unknown>, options?: { id?: string; children?: DesignNode[] }) => {
    const input = shellInput(variant, extra, options);
    const root = APP_BUILDERS["app.shell"]!(input);
    planOf(input, root);
    return { input, root, nodes: frames(root) };
  };

  it("sidebar: fixed-width navigation, linked nav items, the active one highlighted, children in the content", () => {
    const { input, nodes } = build("sidebar");
    const sidebar = nodes.find((node) => node.name === "Sidebar")!;
    expect(sidebar).toBeDefined();
    expect(sidebar.tag).toBe("aside");
    const items = frames(sidebar).filter((node) => node.name.startsWith("Nav item"));
    expect(items.map((node) => node.linkTo)).toEqual(["s-dashboard", "s-settings", undefined]);
    expect(items[0]!.fill).toBeDefined();
    expect(nodes.some((node) => node.name === "Top bar")).toBe(true);
    expect(nodes.find((node) => node.name === "Page content")!.children.map((child) => (child.type === "frame" ? child.key : null))).toEqual(["layout"]);
    // The sidebar is 256 px of the 1440 px frame: 8 of 45 equal columns.
    const frame = nodes.find((node) => node.name === "Frame")!;
    expect(frame.layout).toMatchObject({ kind: "grid", columns: PAGE_WIDTH / 32 });
    expect(input.build.light.components.sidebar.w).toBe(256);
  });

  it("inset: the main column floats as a rounded panel", () => {
    const { nodes } = build("inset");
    expect(nodes.find((node) => node.name === "Main")).toMatchObject({ radius: "xl", fill: { color: "background" } });
    expect(nodes.find((node) => node.name === "Sidebar")?.fill).toBeUndefined();
  });

  it("rail: icons only, labels kept as accessible names", () => {
    const { nodes } = build("rail");
    const rail = nodes.find((node) => node.name === "Rail")!;
    // 72 px of the 1440 px frame: 1 of 20 equal columns.
    expect(nodes.find((node) => node.name === "Frame")!.layout).toMatchObject({ kind: "grid", columns: 20 });
    expect(rail.place).toEqual({ col: 0, span: 1, row: 0 });
    const items = frames(rail).filter((node) => node.name.startsWith("Nav item"));
    expect(items.every((node) => node.label && !frames(node).some((n) => n.children.some((c) => c.type === "text")))).toBe(true);
  });

  it("topnav: the navigation moves into the top bar", () => {
    const { nodes } = build("topnav");
    expect(nodes.some((node) => node.name === "Sidebar" || node.name === "Rail")).toBe(false);
    const top = nodes.find((node) => node.name === "Top navigation")!;
    expect(frames(top).filter((node) => node.name.startsWith("Nav item")).map((node) => node.linkTo)).toEqual(["s-dashboard", "s-settings"]);
  });

  it("tones paint the navigation surface", () => {
    expect(build("sidebar", { tone: "brand" }).nodes.find((node) => node.name === "Sidebar")?.fill).toEqual({ color: "primary" });
    expect(build("sidebar", { tone: "default" }).nodes.find((node) => node.name === "Sidebar")?.fill).toEqual({ color: "sidebar" });
  });

  it("without the page header the content starts under the top bar", () => {
    const { nodes } = build("sidebar", { showPageHeader: false });
    expect(nodes.some((node) => node.name === "Page header")).toBe(false);
  });

  it("a shell placed as a block draws the phone top bar", () => {
    const { nodes } = build("sidebar", { showPageHeader: false }, { id: "landing-sidebar", children: [] });
    expect(nodes.some((node) => node.name === "Sidebar")).toBe(false);
    expect(nodes.some((node) => node.name === "Icon button/menu")).toBe(true);
  });

  it("none: screens without navigation have no shell", () => {
    const tree = buildDesignTree(screensDoc());
    const login = tree.pages.find((page) => page.id === "s-login")!;
    expect(frames(login.root).some((node) => node.key === "shell")).toBe(false);
  });

  it("a legacy dashboard flows its widgets through the 12-column grid", () => {
    const tree = buildDesignTree(legacyDoc());
    const app = tree.pages.find((page) => page.id === "app")!;
    const content = frames(app.root).find((node) => node.name === "Page content")!;
    expect(content.layout).toMatchObject({ kind: "grid", columns: 12 });
    const places = content.children.map((child) => child.place);
    expect(places).toEqual([
      { col: 0, span: 12, row: 0 },
      { col: 0, span: 8, row: 1 },
      { col: 8, span: 4, row: 1 },
      { col: 0, span: 12, row: 2 },
      { col: 0, span: 12, row: 3 },
    ]);
  });
});
