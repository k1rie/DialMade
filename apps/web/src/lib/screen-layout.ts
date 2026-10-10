// A Modo Layout screen's layout compiled the way `buildPageFromLayout` (@dialmade/sections) compiles it, and the
// element → screen links of its page. Shared by the Composer's preview and the export packs, so what the user
// adjusts and what they download use the same CSS and the same links.
import type { DesignDoc, Screen, ScreenId } from "@dialmade/doc";
import {
  absorbChildren,
  deriveResponsive,
  inferStructure,
  toCss,
  type BlockId,
  type LayoutDoc,
  type LayoutWarning,
  type ResponsiveLayout,
  type Structure,
} from "@dialmade/layout";

/** A screen's layout compiled as its page was: accepted children absorbed, then inferred and turned into CSS. */
export type CompiledScreenLayout = {
  /** The layout the page was built from (absorbed blocks removed). */
  layout: LayoutDoc;
  /** Absorbed block → the block whose section shows it (a media inside a hero). */
  absorbed: Record<BlockId, BlockId>;
  structure: Structure;
  responsive: ResponsiveLayout;
  /** `toCss` of the compiled layout: the rules of the page's `[data-dl-id]` elements. */
  css: string;
  /** Absorb warnings (`not-accepted`) and `inferStructure` warnings. */
  warnings: LayoutWarning[];
};

// Docs are immutable: one compile per layout object and kind.
const compiledCache = new WeakMap<LayoutDoc, Partial<Record<Screen["kind"], CompiledScreenLayout>>>();

/**
 * The same compile `buildPageFromLayout` runs before building the page, so the CSS targets exactly the elements
 * the page has. The raw layout would also style absorbed blocks and lay out children inside a hero that has none.
 * Memoized per layout object and kind; treat the result as read-only.
 */
export function compileScreenLayout(screen: Pick<Screen, "layout" | "kind">): CompiledScreenLayout {
  const cached = compiledCache.get(screen.layout)?.[screen.kind];
  if (cached) return cached;
  const absorb = absorbChildren(screen.layout);
  const structure = inferStructure(absorb.layout);
  const responsive = deriveResponsive(absorb.layout, structure);
  const compiled: CompiledScreenLayout = {
    layout: absorb.layout,
    absorbed: absorb.absorbed,
    structure,
    responsive,
    css: toCss(absorb.layout, { kind: screen.kind, structure, responsive }),
    warnings: [...absorb.warnings, ...structure.warnings],
  };
  compiledCache.set(screen.layout, { ...compiledCache.get(screen.layout), [screen.kind]: compiled });
  return compiled;
}

const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The links of a screen's page, as `buildPageFromLayout` returns them: a block's own `linkTo` when it has an
 * element, then each absorbed block's `linkTo` (by position) on its host if the host has none. Only links to
 * screens of the document and from elements of the page.
 */
export function screenLinks(doc: Pick<DesignDoc, "screens">, screen: Screen, absorbed: Readonly<Record<BlockId, BlockId>>): Record<string, ScreenId> {
  const links: Record<string, ScreenId> = {};
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

/**
 * The screen a link id points to: a screen id itself, or a nav item of the app shell (the app screen whose
 * `shell.activeItem` it is, first in `screenOrder`). `null` otherwise.
 */
export function linkedScreen(doc: Pick<DesignDoc, "screens" | "screenOrder">, id: string): ScreenId | null {
  if (Object.hasOwn(doc.screens, id)) return id;
  for (const screenId of doc.screenOrder) {
    const screen = Object.hasOwn(doc.screens, screenId) ? doc.screens[screenId] : undefined;
    if (screen?.kind === "app" && screen.shell?.activeItem === id) return screenId;
  }
  return null;
}
