// DesignDoc → design tree. A screen of Modo Layout is walked through its inferred structure (the same compile
// `buildPageFromLayout` runs: absorbed children merged, then XY-cut), so its stacks, rows and bento grids become
// auto layout boxes; each block becomes its section, built from the props the page stores. The style guide and
// documents without screens are walked element by element, top to bottom.
import { LAYOUT_PAGE_ID, orderedScreens, resolveExport, type DesignDoc, type Page, type Screen } from "@dialmade/doc";
import {
  BASE_SPACE,
  COL_PX,
  DESKTOP_COLUMNS,
  ROW_UNIT,
  absorbChildren,
  areaName,
  inferStructure,
  type BlockId,
  type StructureNode,
} from "@dialmade/layout";
import {
  LAYOUT_SCOPE_ID,
  REGION_TYPE,
  SHELL_ELEMENT_ID,
  contentContextFromDoc,
  linkContext,
  resolveSectionProps,
  sectionRegistry,
  type RenderContext,
} from "@dialmade/sections";
import type { ExportOptions } from "@dialmade/doc";
import type { BuildContext, SectionInput } from "./context";
import { column, frame } from "./nodes";
import { genericSection } from "./sections/generic";
import { SECTION_BUILDERS } from "./sections";
import type { DesignNode, DesignPage, DesignTree, FrameNode, Space } from "./types";

/** Width of the desktop frame of every page, in px (the canvas' 12 columns of `COL_PX`). */
export const PAGE_WIDTH = DESKTOP_COLUMNS * COL_PX;

export interface DesignTreeOptions extends ExportOptions {
  /** Mode the pages are shown in first. Default: the palette's or recipe's preferred mode. */
  mode?: "light" | "dark";
  /** Called when a section fails to build and falls back to its outline. */
  onSectionError?: (id: string, type: string, error: unknown) => void;
}

/** Nearest step of the spacing scale for a gap in px (ties to the smaller step, like `spaceVar`); px beyond it. */
export function spaceStep(px: number): Space {
  if (!(px > 0)) return 0;
  const last = BASE_SPACE[BASE_SPACE.length - 1]!;
  if (px > last) return { px };
  let best = 0;
  for (let i = 1; i < BASE_SPACE.length; i++) {
    if (Math.abs(BASE_SPACE[i]! - px) < Math.abs(BASE_SPACE[best]! - px)) best = i;
  }
  return best + 1;
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The screen a link id points to: a screen, or the app screen whose `shell.activeItem` it is. */
function linkedScreen(doc: DesignDoc, id: string): string | null {
  if (Object.hasOwn(doc.screens, id)) return id;
  for (const screenId of doc.screenOrder) {
    const screen = Object.hasOwn(doc.screens, screenId) ? doc.screens[screenId] : undefined;
    if (screen?.kind === "app" && screen.shell?.activeItem === id) return screenId;
  }
  return null;
}

/** Element id → screen, as `buildPageFromLayout` links them (an absorbed block's link goes to its host). */
function screenLinks(doc: DesignDoc, screen: Screen, absorbed: Readonly<Record<BlockId, BlockId>>): Record<string, string> {
  const links: Record<string, string> = {};
  const { blocks } = screen.layout;
  const linkOf = (id: BlockId) => {
    const to = blocks[id]?.linkTo;
    return typeof to === "string" && Object.hasOwn(doc.screens, to) ? to : null;
  };
  for (const id of Object.keys(blocks)) {
    const to = linkOf(id);
    if (to && Object.hasOwn(screen.page.elements, id) && !Object.hasOwn(absorbed, id)) links[id] = to;
  }
  const byPosition = (a: BlockId, b: BlockId) => {
    const ra = blocks[a]!.rect;
    const rb = blocks[b]!.rect;
    return ra.row - rb.row || ra.col - rb.col || compareIds(a, b);
  };
  for (const child of Object.keys(absorbed).filter((id) => Object.hasOwn(blocks, id)).sort(byPosition)) {
    const to = linkOf(child);
    const host = absorbed[child]!;
    if (to && Object.hasOwn(screen.page.elements, host) && !Object.hasOwn(links, host)) links[host] = to;
  }
  return links;
}

type Walk = {
  doc: DesignDoc;
  page: Page;
  ctx: RenderContext;
  build: BuildContext;
  hidden: ReadonlySet<string>;
  options: DesignTreeOptions;
};

/** One element as its section (or its outline when the section is unknown or fails). */
function buildElement(walk: Walk, id: string, children: DesignNode[]): FrameNode | null {
  const element = walk.page.elements[id];
  if (!element || walk.hidden.has(id)) return null;
  const def = sectionRegistry.get(element.type);
  const label = def ? def.label[walk.ctx.locale] : element.type;
  const slotted = children.map((child) => (child.type === "frame" ? { ...child, slot: true } : child));
  let node: FrameNode;
  try {
    if (!def) throw new Error(`Unknown section ${element.type}`);
    const resolved = resolveSectionProps(def, element.props, walk.ctx);
    const input: SectionInput = {
      id,
      type: element.type,
      props: resolved.props,
      variant: resolved.variant,
      children: slotted,
      ctx: walk.ctx,
      build: walk.build,
    };
    const builder = SECTION_BUILDERS[element.type] ?? genericSection;
    node = builder(input);
  } catch (error) {
    walk.options.onSectionError?.(id, element.type, error);
    node = genericSection({ id, type: element.type, props: element.props, variant: "", children: slotted, ctx: walk.ctx, build: walk.build });
  }
  return { ...node, key: id, section: element.type, name: node.name && node.name !== "Section" ? node.name : label };
}

/** Children of an element in order, built recursively (legacy pages and the style guide). */
function buildTree(walk: Walk, id: string): FrameNode | null {
  const element = walk.page.elements[id];
  if (!element || walk.hidden.has(id)) return null;
  const children = element.children.map((child) => buildTree(walk, child)).filter((child): child is FrameNode => !!child);
  return buildElement(walk, id, children);
}

/**
 * A structure node of the layout as boxes. Stacks of full-width children are columns with each child's gap
 * above it; partial stacks and rows are 12-column grids with explicit placements; bento regions keep their
 * tracks. Blocks carry their literal height on app screens and their ratio (media, chart) on landing screens.
 */
function structureNode(walk: Walk, node: StructureNode, kind: "landing" | "app", depth: number): DesignNode | null {
  if (node.kind === "block") {
    const content = node.content ? structureNode(walk, node.content, kind, depth + 1) : null;
    const built = buildElement(walk, node.id, content ? [content] : []);
    if (!built) return null;
    const type = walk.page.elements[node.id]?.type ?? "";
    if (kind === "app") return { ...built, minHeight: Math.max(built.minHeight ?? 0, node.rect.h * ROW_UNIT) };
    if (type === "ui.media" || type === "app.chartCard") return { ...built, aspect: (node.rect.w * COL_PX) / (node.rect.h * ROW_UNIT) };
    return built;
  }

  const gap = 5;
  if (node.kind === "stack") {
    const full = node.children.every((child) => child.start === 0 && child.span === node.frame.w);
    const children = node.children
      .map((child, index) => {
        const built = structureNode(walk, child.node, kind, depth + 1);
        if (!built) return null;
        const above = index === 0 ? 0 : (node.gaps[index - 1] ?? 0);
        const offset = spaceStep(above * ROW_UNIT);
        return {
          ...built,
          ...(offset !== 0 && { offsetTop: offset }),
          ...(!full && { place: { col: child.start, span: child.span, row: index } }),
        } as DesignNode;
      })
      .filter((child): child is DesignNode => !!child);
    if (children.length === 0) return null;
    return frame({
      name: "Stack",
      key: node.id,
      width: "fill",
      layout: full ? { kind: "flex", direction: "column" } : { kind: "grid", columns: node.frame.w, gap },
      children,
    });
  }

  if (node.kind === "row") {
    const children = node.children
      .map((child) => {
        const built = structureNode(walk, child.node, kind, depth + 1);
        if (!built) return null;
        const offset = spaceStep(Math.max(0, child.node.rect.row - node.rect.row) * ROW_UNIT);
        return { ...built, ...(offset !== 0 && { offsetTop: offset }), place: { col: child.start, span: child.span, row: 0 } } as DesignNode;
      })
      .filter((child): child is DesignNode => !!child);
    if (children.length === 0) return null;
    return landingGutter(
      frame({
        name: "Row",
        key: node.id,
        width: "fill",
        layout: { kind: "grid", columns: node.frame.w, gap, align: kind === "app" ? "start" : "stretch" },
        children,
      }),
      kind,
      depth,
    );
  }

  const items = node.items
    .map((item) => {
      const built = structureNode(walk, item.node, kind, depth + 1);
      if (!built) return null;
      return {
        ...built,
        area: { name: areaName(item.node.id), colStart: item.colStart, colEnd: item.colEnd, rowStart: item.rowStart, rowEnd: item.rowEnd },
      } as DesignNode;
    })
    .filter((child): child is DesignNode => !!child);
  if (items.length === 0) return null;
  return landingGutter(
    frame({
      name: "Grid",
      key: node.id,
      width: "fill",
      layout: { kind: "tracks", columns: node.columns, rows: node.rows.map((rows) => rows * ROW_UNIT), gap, areas: node.areas },
      children: items,
    }),
    kind,
    depth,
  );
}

/**
 * Landing screens: rows and grids at the top of the layout get the centered container, gutters and half a
 * section of rhythm that landing sections have (`ui.region`'s CSS).
 */
function landingGutter(region: FrameNode, kind: "landing" | "app", depth: number): FrameNode {
  if (kind !== "landing" || depth > 1) return region;
  return column({ name: "Container", width: "fill", align: "center", padding: { x: 7, y: { sectionPy: 0.5 } } }, [
    { ...region, maxWidth: "container" },
  ]);
}

function screenPage(doc: DesignDoc, screen: Screen, base: Omit<Walk, "page" | "ctx" | "hidden">, rootCtx: RenderContext): DesignPage {
  const absorb = absorbChildren(screen.layout);
  const structure = inferStructure(absorb.layout);
  const links = screenLinks(doc, screen, absorb.absorbed);
  const ctx: RenderContext = {
    ...rootCtx,
    ...linkContext({ links, linkHref: (id) => linkedScreen(doc, id) }),
  };
  const page = screen.page;
  const walk: Walk = { ...base, page, ctx, hidden: new Set(page.hidden ?? []), build: { ...base.build, pageKind: screen.kind } };

  const flow = structure.root ? structureNode(walk, structure.root, screen.kind, 0) : null;
  const overlays = structure.overlays
    .map((overlay) => {
      const built = structureNode(walk, overlay, screen.kind, 1);
      if (!built || built.type !== "frame") return null;
      const { rect } = overlay;
      return {
        ...built,
        width: undefined,
        absolute: { left: rect.col / DESKTOP_COLUMNS, top: rect.row * ROW_UNIT, width: rect.w / DESKTOP_COLUMNS },
      } as FrameNode;
    })
    .filter((node): node is FrameNode => !!node);
  const layout = frame({
    name: "Layout",
    key: LAYOUT_SCOPE_ID,
    width: "fill",
    tag: kind(screen) === "app" ? "div" : "main",
    children: [flow, ...overlays],
  });

  const shellElement = page.elements[SHELL_ELEMENT_ID];
  const content = shellElement && !walk.hidden.has(SHELL_ELEMENT_ID) ? (buildElement(walk, SHELL_ELEMENT_ID, [layout]) ?? layout) : layout;
  return {
    id: screen.id,
    name: screen.name,
    kind: "screen",
    pageKind: screen.kind,
    route: screen.route,
    width: PAGE_WIDTH,
    root: column({ name: screen.name, key: screen.id, width: PAGE_WIDTH, fill: { color: "background" } }, [content]),
  };
}

const kind = (screen: Screen) => screen.kind;

/** A page without layout (the style guide, legacy pages): its root's children top to bottom. */
function elementPage(id: string, name: string, pageKind: DesignPage["pageKind"], page: Page, base: Omit<Walk, "page" | "ctx" | "hidden">, ctx: RenderContext): DesignPage {
  const walk: Walk = { ...base, page, ctx, hidden: new Set(page.hidden ?? []), build: { ...base.build, pageKind } };
  const root = page.elements[page.root];
  const rootDef = root ? sectionRegistry.get(root.type) : undefined;
  // A registered root section (the app shell of a legacy dashboard) wraps the page; otherwise its children stack.
  const content = rootDef
    ? [buildTree(walk, page.root)]
    : (root?.children ?? []).map((child) => buildTree(walk, child));
  return {
    id,
    name,
    kind: pageKind === "brand" ? "style-guide" : "page",
    pageKind,
    width: PAGE_WIDTH,
    root: column({ name, key: id, width: PAGE_WIDTH, fill: { color: "background" } }, content),
  };
}

const STYLE_GUIDE_NAME = { es: "Guía de estilo", en: "Style guide" } as const;
const KIND_NAMES = { landing: { es: "Landing page", en: "Landing page" }, app: { es: "Dashboard", en: "Dashboard" } } as const;

/**
 * Every page of the document as a design tree: one per screen in `screenOrder` (Modo Layout), then the style
 * guide. Documents without screens give their legacy pages (focus first). Deterministic.
 */
export function buildDesignTree(doc: DesignDoc, options: DesignTreeOptions = {}): DesignTree {
  const { inputs, light, dark } = resolveExport(doc, options);
  const locale = doc.brief.locale;
  const mode = options.mode ?? (inputs.theme.defaultMode === "dark" || inputs.recipe.preferredMode === "dark" ? "dark" : "light");
  const ctx: RenderContext = { ...contentContextFromDoc(doc), mode, interactive: false, doc };
  const base = { doc, options, build: { doc, inputs, light, dark, pageKind: "landing" as const } };

  const pages: DesignPage[] = [];
  const screens = orderedScreens(doc);
  if (screens.length > 0) {
    for (const screen of screens) pages.push(screenPage(doc, screen, base, ctx));
  } else {
    const kinds = (["landing", "app"] as const).filter((k) => doc.pages[k] && doc.pages[k]!.layoutId !== LAYOUT_PAGE_ID);
    const ordered = [...kinds.filter((k) => k === doc.brief.focus), ...kinds.filter((k) => k !== doc.brief.focus)];
    for (const k of ordered) pages.push(elementPage(k, KIND_NAMES[k][locale], k, doc.pages[k]!, base, ctx));
  }
  if (doc.pages.brand) pages.push(elementPage("brand", STYLE_GUIDE_NAME[locale], "brand", doc.pages.brand, base, ctx));
  return { name: doc.brand.name, locale, mode, pages };
}

export { REGION_TYPE };
