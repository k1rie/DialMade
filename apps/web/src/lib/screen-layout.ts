// A Modo Layout screen's layout compiled the way `buildPageFromLayout` (@dialmade/sections) compiles it, and the
// element → screen links of its page. Shared by the Composer's preview and the export packs, so what the user
// adjusts and what they download use the same CSS and the same links.
import { MAX_SCREENS, type DesignDoc, type Screen, type ScreenId } from "@dialmade/doc";
import {
  absorbChildren,
  DEFAULT_SCOPE,
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

type CompiledByKind = Partial<Record<Screen["kind"], CompiledScreenLayout>>;

// Docs are immutable: one compile per layout object and kind…
const compiledCache = new WeakMap<LayoutDoc, CompiledByKind>();

/**
 * …and one per layout content: a patch anywhere else (the brief, another screen, a knob) gives every screen a new
 * but equal layout object, which must not recompile. The newest `CONTENT_CACHE_SIZE` contents are kept (twice
 * `MAX_SCREENS`: every screen of a document plus as many recent versions); the least recently used goes first.
 */
export const CONTENT_CACHE_SIZE = MAX_SCREENS * 2;
const signatures = new WeakMap<LayoutDoc, string>();
const contentCache = new Map<string, CompiledByKind>();

/**
 * JSON blurs a few values into others (`undefined` into nothing or `null`, `-0` into `0`, `NaN` and `±Infinity`
 * into `null`). Tagging every string and every such number keeps the signature one-to-one with the content.
 */
function exactValue(_key: string, value: unknown): unknown {
  if (typeof value === "string") return `s${value}`;
  if (value === undefined) return "u";
  if (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0))) return Object.is(value, -0) ? "n-0" : `n${value}`;
  return value;
}

/** Exact content of a layout, key order included (a different order is a different key, never a wrong hit). */
function layoutSignature(layout: LayoutDoc): string {
  let signature = signatures.get(layout);
  if (signature === undefined) {
    signature = JSON.stringify(layout, exactValue);
    signatures.set(layout, signature);
  }
  return signature;
}

/** Marks a content as just used (a Map keeps insertion order: the first key is the least recently used). */
function touch(signature: string, byKind: CompiledByKind): void {
  contentCache.delete(signature);
  contentCache.set(signature, byKind);
  while (contentCache.size > CONTENT_CACHE_SIZE) {
    const oldest = contentCache.keys().next().value;
    if (oldest === undefined) break;
    contentCache.delete(oldest);
  }
}

function compile(layout: LayoutDoc, kind: Screen["kind"]): CompiledScreenLayout {
  const absorb = absorbChildren(layout);
  const structure = inferStructure(absorb.layout);
  const responsive = deriveResponsive(absorb.layout, structure);
  return {
    layout: absorb.layout,
    absorbed: absorb.absorbed,
    structure,
    responsive,
    css: toCss(absorb.layout, { kind, structure, responsive }),
    warnings: [...absorb.warnings, ...structure.warnings],
  };
}

/**
 * The same compile `buildPageFromLayout` runs before building the page, so the CSS targets exactly the elements
 * the page has. The raw layout would also style absorbed blocks and lay out children inside a hero that has none.
 * Memoized per layout object and kind, and per layout content and kind (equal layouts share one result, so
 * `scopedScreenCss` is reused too); treat the result as read-only.
 */
export function compileScreenLayout(screen: Pick<Screen, "layout" | "kind">): CompiledScreenLayout {
  const { layout, kind } = screen;
  const signature = layoutSignature(layout);
  const byObject = compiledCache.get(layout);
  const byContent = contentCache.get(signature) ?? {};
  const compiled = byObject?.[kind] ?? byContent[kind] ?? compile(layout, kind);
  if (byContent[kind] !== compiled) byContent[kind] = compiled;
  touch(signature, byContent);
  if (byObject?.[kind] !== compiled) compiledCache.set(layout, { ...byObject, [kind]: compiled });
  return compiled;
}

/**
 * Attribute that marks where a screen renders inside the app (`ThemeScope`'s `screen` prop sets it). The scoped
 * layout CSS (`scopedScreenCss`) only matches inside it, so several screens can render at once.
 */
export const SCREEN_ATTRIBUTE = "data-dl-screen";

/**
 * Scope selector of a screen's layout inside the app: its layout element under the element marked with
 * `SCREEN_ATTRIBUTE`. Inside `:where()`, so every rule keeps the specificity of the export's CSS (the layout's
 * `display: none` and the sections' zero-specificity rules win or lose exactly as they do in the export).
 */
export function screenScope(screenId: ScreenId): string {
  return `:where([${SCREEN_ATTRIBUTE}="${screenId.replace(/["\\]/g, "\\$&")}"]) ${DEFAULT_SCOPE}`;
}

// One scoped CSS per compiled layout and screen id (the compile is already one per layout object and kind).
const scopedCache = new WeakMap<CompiledScreenLayout, Map<ScreenId, string>>();

/**
 * The screen's layout CSS for in-app rendering (the Composer's preview, reveal layers, thumbnails): the same
 * rules as `compileScreenLayout(screen).css`, each selector scoped by `screenScope(screen.id)`. Render it under
 * an element with `data-dl-screen="<screen.id>"` (`<ThemeScope screen={id}>`). The export keeps the unscoped
 * `css`: one screen per HTML file.
 */
export function scopedScreenCss(screen: Pick<Screen, "id" | "layout" | "kind">): string {
  const compiled = compileScreenLayout(screen);
  const byId = scopedCache.get(compiled) ?? new Map<ScreenId, string>();
  const cached = byId.get(screen.id);
  if (cached !== undefined) return cached;
  const { layout, structure, responsive } = compiled;
  const css = toCss(layout, { kind: screen.kind, structure, responsive, scope: screenScope(screen.id) });
  byId.set(screen.id, css);
  scopedCache.set(compiled, byId);
  return css;
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
