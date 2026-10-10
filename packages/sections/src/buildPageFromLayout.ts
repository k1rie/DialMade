import {
  DesignDocError,
  LAYOUT_PAGE_ID,
  MAX_REMOVED_STASH,
  PAGE_DIAL_DEFAULTS,
  ROOT_ELEMENT_ID,
  type Page,
  type PageElement,
  type StashedElement,
} from "@dialmade/doc";
import {
  COL_PX,
  ROW_UNIT,
  absorbChildren,
  blockCount,
  deriveResponsive,
  estimateContent,
  getBlockDef,
  hashString,
  inferStructure,
  parseNote,
  toCss,
  toElementTree,
  validateLayout,
  type AppShell,
  type BlockId,
  type GeneratedFingerprint,
  type LayoutBlock,
  type LayoutDoc,
  type LayoutElement,
  type LayoutWarning,
  type LibraryBlockType,
  type ResponsiveLayout,
  type ScreenKind,
  type Structure,
} from "@dialmade/layout";
import { shellCopyCandidates, shellScreenCopy, shellScreenPurpose } from "./app/Shell/screenCopy";
import { APP_SHELL_TYPE, VARIANT_PROP, pageRootType } from "./constants";
import { navLinks } from "./content/generators";
import { deriveSeed } from "./content/rng";
import { resolveSectionProps, storedDefaultProps } from "./props";
import { sectionRegistry, type SectionRegistry } from "./registry";
import type { AnySectionDefinition, ContentContext, FitInput, FitResult } from "./types";
import { landingScreenPurpose, uiScreenTextCopy, type UiTextScreen } from "./ui/content/text";

/** Element id of the layout scope (`ui.region`, role `scope`): the `.dl-layout` element `toCss` targets. */
export const LAYOUT_SCOPE_ID = "layout";
/** Element id of the app frame (`app.shell`) of app screens with navigation. */
export const SHELL_ELEMENT_ID = "shell";
/** Section of the layout scope, the inferred regions (`r-…`) and «Contenedor» blocks. */
export const REGION_TYPE = "ui.region";
/** Fingerprint variant of a block absorbed by its parent (it has no element of its own). */
export const ABSORBED_VARIANT = "absorbed";
/** Sections whose props mirror layout data on every build (not only when the fingerprint changes). */
const TEXT_TYPE = "ui.text";
const PLACEHOLDER_TYPE = "ui.placeholder";
const HERO_TYPE = "landing.hero";
const NAVBAR_TYPE = "landing.navbar";
/**
 * Content sections whose first block on a screen takes the screen's own seed (later ones a per-block seed), so
 * two screens never show the same feed, table rows or text. The site-wide ones (navbar, hero, footer, pricing,
 * KPIs…) keep the document seed: the hero's button matches the navbar's on every screen, prices never differ.
 */
const SCREEN_SEEDED_TYPES: ReadonlySet<string> = new Set(["ui.text", "ui.list", "ui.cards", "ui.calendar", "app.dataTable", "app.activity"]);
/** Most links a landing navbar stores (`links` in its schema). */
const NAVBAR_LINKS_MAX = 6;

/** A screen in a navigation: the app shell's nav items, or a landing navbar's links. */
export interface NavScreen {
  id: string;
  name: string;
}

export interface BuildFromLayoutOptions {
  registry?: SectionRegistry;
  /** The screen's current page: its props, pinned values and the user's variants are kept (see `mode`). */
  previous?: Page;
  /** Precomputed for this exact layout (the canvas cache). Used only when no block is absorbed or moved. */
  structure?: Structure;
  responsive?: ResponsiveLayout;
  /**
   * `"layout"` (Generar, default): blocks whose fingerprint (`block.generated`) did not change keep their
   * previous props; changed ones keep their copy and get the layout-owned keys (`owns`) and the variant again.
   * `"content"` (locale or product change): fresh copy, keeping the layout-owned keys, the variant and the
   * pinned values. Pinned values (`block.pinned`) are written back in both modes.
   */
  mode?: "layout" | "content";
  /**
   * App screens: `app.shell` props shared by every app screen (from another screen's page); they win over
   * `previous`. Pass only shared keys: `SHELL_SCREEN_KEYS` belong to each screen.
   */
  shellProps?: Readonly<Record<string, unknown>>;
  /**
   * The screen's name: the shell's page title, and (with its blocks and the product) the purpose that picks
   * the frame's subtitle and primary action (`shellScreenCopy`). Stored values the build did not write stay.
   */
  screenTitle?: string;
  /** The screen's id: the active nav item when the nav is built from screens. */
  screenId?: string;
  /** App screens with navigation, in order: the shell's nav items (`id` = screen id, label = name, at most 10). */
  navScreens?: readonly NavScreen[];
  /**
   * Landing screens, in order. With two or more, a landing navbar's links open them first (`linkTo` = screen id,
   * label = name, `href` = `#` where the screen has no URL), then its own anchors; with fewer, links to screens go.
   */
  landingScreens?: readonly NavScreen[];
  /**
   * The layout `previous` was built from (the document's): the pinned props of blocks it has and this layout
   * does not (a «Generar» that removes them) go to `page.stash` with their props, so a Layout undo that brings
   * a block back with the same id gets its copy and pins.
   */
  previousLayout?: Pick<LayoutDoc, "blocks">;
  /** Page dials when there is no previous page of this kind (default: `PAGE_DIAL_DEFAULTS[kind]`). */
  dials?: Page["dials"];
}

export interface BuildFromLayoutResult {
  /** Valid as the page of a `kind` screen (`checkScreenPage` of @dialmade/doc). */
  page: Page;
  /** `toCss(layout, { kind, structure, responsive })` of the compiled layout (absorbed blocks removed). */
  css: string;
  /** `block.generated` of every block (absorbed ones included), to write in the same batch as the page. */
  fingerprints: Record<BlockId, GeneratedFingerprint>;
  /**
   * Blocks merged into their parent's section (a media inside a hero): no element. Their previous props (if
   * any) are kept in `page.stash`, so moving one back out restores its copy and pinned values.
   */
  absorbed: BlockId[];
  /** `inferStructure` warnings of the compiled layout plus `not-accepted` for moved children. */
  warnings: LayoutWarning[];
  /** Element id → screen (`linkTo`), for `PageRenderer`/`renderStaticPage` `links`. Absorbed links go to their host. */
  links: Record<string, string>;
}

type Props = Record<string, unknown>;

const LEVEL_SUPPORT = new WeakMap<AnySectionDefinition, boolean>();

/**
 * The section renders its title at the heading `level` it is given (its schema takes `level: "h1"`): the page's
 * h1 can go to it when the screen has no hero, page header or text. Memoized per definition.
 */
function sectionTakesLevel(def: AnySectionDefinition, ctx: ContentContext): boolean {
  let known = LEVEL_SUPPORT.get(def);
  if (known === undefined) {
    known = def.schema.safeParse({ ...(def.defaultProps(ctx) as Props), level: "h1" }).success;
    LEVEL_SUPPORT.set(def, known);
  }
  return known;
}

/** An inferred region (`r-…`): structural, never a block, so never stashed. */
const isInferredRegion = (element: Pick<PageElement, "type" | "props">) => element.type === REGION_TYPE && element.props.role === "inferred";

/** Copy that survives a block type change (spec §7: «arrastra los textos compatibles»). */
const CARRY_KEYS = ["eyebrow", "title", "subtitle", "description"] as const;
/** Shell props that are settings, not copy: kept from the previous page when the copy is regenerated. */
const SHELL_SETTINGS = ["variant", "tone", "density", "showSearch", "showPageHeader"] as const;
const SHELL_NAV_MAX = 10;
const SHELL_ICONS = ["home", "bar-chart", "users", "inbox", "calendar", "file", "folder", "mail", "sliders", "bell"] as const;

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const cloneJson = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

/* ------------------------------------------------------------------------------------------------ */
/* Pinned values: JSON Pointers relative to props                                                   */
/* ------------------------------------------------------------------------------------------------ */

function pointerSegments(pointer: string): string[] | null {
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return null;
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function readAt(root: unknown, segments: readonly string[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return undefined;
      current = current[Number(segment)];
    } else if (isObject(current)) {
      current = hasOwn(current, segment) ? current[segment] : undefined;
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * `root` with `value` at `segments`, copying the containers on the path (never mutates `root`, whose
 * branches may be shared with the previous page). `null` when the parent is missing, an array index is out
 * of range or, with `existingOnly`, the key is not already there.
 */
function writeAt(root: Props, segments: readonly string[], value: unknown, existingOnly: boolean): Props | null {
  if (segments.length === 0) return null;
  const write = (node: unknown, depth: number): unknown => {
    const segment = segments[depth]!;
    const last = depth === segments.length - 1;
    if (Array.isArray(node)) {
      if (!/^(0|[1-9]\d*)$/.test(segment)) return null;
      const index = Number(segment);
      if (index >= node.length) return null;
      const next = last ? value : write(node[index], depth + 1);
      if (next === null && !last) return null;
      const copy = [...node];
      copy[index] = next;
      return copy;
    }
    if (isObject(node)) {
      if (!hasOwn(node, segment) && (existingOnly || !last)) return null;
      const next = last ? value : write(node[segment], depth + 1);
      if (next === null && !last) return null;
      return { ...node, [segment]: next };
    }
    return null;
  };
  const out = write(root, 0);
  return isObject(out) ? out : null;
}

/** Writes the pinned values of `source` into `target` (verbatim copies). Pointers that do not resolve are skipped. */
function writePinned(target: Props, source: Props, pinned: readonly string[] | undefined, existingOnly: boolean): Props {
  let out = target;
  for (const pointer of pinned ?? []) {
    const segments = pointerSegments(pointer);
    if (!segments || segments.length === 0) continue;
    const value = readAt(source, segments);
    if (value === undefined) continue;
    const current = readAt(out, segments);
    if (current === value || (current !== undefined && JSON.stringify(current) === JSON.stringify(value))) continue;
    if (existingOnly && (current === undefined || typeof current !== typeof value || Array.isArray(current) !== Array.isArray(value))) continue;
    out = writeAt(out, segments, cloneJson(value), existingOnly) ?? out;
  }
  return out;
}

/**
 * Repeatable lists that grew (the layout path stores them at their maximum): a shorter stored list gets the
 * missing items of the fresh one, so a bigger `count` shows real items. Existing items are never touched.
 */
function topUp(props: Props, fresh: Props): Props {
  let out = props;
  for (const [key, value] of Object.entries(fresh)) {
    const current = out[key];
    if (!Array.isArray(value) || !Array.isArray(current) || current.length >= value.length) continue;
    if (out === props) out = { ...props };
    out[key] = [...current, ...value.slice(current.length)];
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* Blocks                                                                                           */
/* ------------------------------------------------------------------------------------------------ */

/**
 * The previous props of a block: its element of the previous page or its entry in the previous page's
 * `stash` (absorbed, retyped or removed), the one of section `type` first, so undoing a type change brings
 * the old type's props back. `undefined` for a block the previous page never had.
 */
function previousBlockElement(previous: Page | undefined, id: BlockId, type?: string): PageElement | undefined {
  if (!previous) return undefined;
  const element = hasOwn(previous.elements, id) ? previous.elements[id] : undefined;
  const stashed = previous.stash && hasOwn(previous.stash, id) ? previous.stash[id] : undefined;
  const fromStash: PageElement | undefined = stashed ? { type: stashed.type, props: stashed.props, children: [] } : undefined;
  if (element && (type === undefined || element.type === type)) return element;
  if (fromStash && (type === undefined || fromStash.type === type)) return fromStash;
  return element ?? fromStash;
}

/**
 * `page.stash` entry of `source` (the last props of a block without an element of that type): kept as they are,
 * so the block gets its copy and pinned values back. In mode "content" (locale or product change) the copy is
 * regenerated for the new context, keeping the variant and the `pinned` values, so it never comes back in the
 * old language. `stashPinned` (a removed block's pins: its layout block is gone) is stored with it.
 */
function stashEntry(
  id: BlockId,
  source: Pick<PageElement, "type" | "props">,
  pinned: readonly string[] | undefined,
  registry: SectionRegistry,
  ctx: ContentContext,
  mode: "layout" | "content",
  stashPinned: boolean,
): StashedElement {
  const withPins = (entry: StashedElement): StashedElement =>
    stashPinned && pinned && pinned.length > 0 ? { ...entry, pinned: [...pinned] } : entry;
  if (mode === "layout") return withPins({ type: source.type, props: source.props });
  const def = registry.get(source.type);
  if (!def) return withPins({ type: source.type, props: source.props });
  const blockCtx = { ...ctx, seed: deriveSeed(ctx.seed, id) };
  const fresh: Props = { ...storedDefaultProps(def, blockCtx), ...(def.layout?.defaults?.(blockCtx) ?? {}) };
  const variant = variantOf(def, source.props[VARIANT_PROP]);
  if (variant) fresh[VARIANT_PROP] = variant;
  return withPins({ type: source.type, props: writePinned(fresh, source.props, pinned, false) });
}

function sameFingerprint(a: GeneratedFingerprint | undefined, b: GeneratedFingerprint): boolean {
  return (
    a !== undefined &&
    a.type === b.type &&
    a.w === b.w &&
    a.h === b.h &&
    a.count === b.count &&
    a.variant === b.variant &&
    a.noteHash === b.noteHash
  );
}

function fingerprintOf(block: LayoutBlock, variant: string): GeneratedFingerprint {
  return {
    type: block.type,
    w: block.rect.w,
    h: block.rect.h,
    ...(block.count !== undefined && { count: block.count }),
    variant,
    ...(block.note && { noteHash: hashString(block.note) }),
  };
}

const variantOf = (def: AnySectionDefinition | undefined, value: unknown): string | undefined =>
  typeof value === "string" && def?.variants.some((variant) => variant.id === value) ? value : undefined;

const pick = (props: Readonly<Record<string, unknown>> | undefined, keys: readonly string[]): Props => {
  const out: Props = {};
  if (!props) return out;
  for (const key of keys) if (hasOwn(props, key) && props[key] !== undefined) out[key] = props[key];
  return out;
};

/** Keys of `props` that fail `def`'s schema (bindings resolved) or an unknown variant, reverted to `fallback` (or dropped). */
function repair(def: AnySectionDefinition, props: Props, fallback: Props, ctx: ContentContext): Props {
  const { invalidKeys } = resolveSectionProps(def, props, ctx);
  const badVariant = hasOwn(props, VARIANT_PROP) && variantOf(def, props[VARIANT_PROP]) === undefined;
  if (invalidKeys.length === 0 && !badVariant) return props;
  const out = { ...props };
  for (const key of badVariant ? [...invalidKeys, VARIANT_PROP] : invalidKeys) {
    if (hasOwn(fallback, key)) out[key] = fallback[key];
    else delete out[key];
  }
  return out;
}

interface BlockContext {
  block: LayoutBlock;
  type: string;
  def: AnySectionDefinition | undefined;
  ctx: ContentContext;
  fit: FitResult<Props>;
  /** Layout data written on every build, whatever the fingerprint says (a placeholder's name, the page's h1). */
  overrides: Props;
  /**
   * Layout data that depends on the merged props, written on every build before the overrides and the pins
   * (a landing navbar's links to the screens). Returns the same object when nothing changes.
   */
  derive?: (props: Props) => Props;
  /** Copy for the screen merged over the section's defaults whenever fresh copy is made (a text block's intro). */
  freshCopy?: (ctx: ContentContext) => Props;
  previous: PageElement | undefined;
  mode: "layout" | "content";
}

/** `props` with `overrides` applied; the same object when nothing changes. */
function withOverrides(props: Props, overrides: Props): Props {
  const changed = Object.entries(overrides).some(([key, value]) => JSON.stringify(props[key]) !== JSON.stringify(value));
  return changed ? { ...props, ...overrides } : props;
}

/** Props of one block element from its fresh defaults, its fit and the previous page (rules in `BuildFromLayoutOptions.mode`). */
function blockProps(context: BlockContext, fingerprint: GeneratedFingerprint): Props {
  const { block, def, ctx, overrides, previous } = context;
  const merged = mergedProps(context, fingerprint);
  const props = def && context.derive ? context.derive(merged) : merged;
  if (!def || !previous) return withOverrides(props, overrides);
  if (previous.type !== context.type) {
    // A new block type: only the pinned values that still fit its props, then a schema check.
    const pinned = writePinned(withOverrides(props, overrides), previous.props, block.pinned, true);
    return pinned === props ? props : repair(def, pinned, props, ctx);
  }
  return writePinned(withOverrides(props, overrides), previous.props, block.pinned, false);
}

/** Props before the overrides and the pinned values. */
function mergedProps({ block, type, def, ctx, fit, previous, mode, freshCopy }: BlockContext, fingerprint: GeneratedFingerprint): Props {
  if (!def) return previous?.type === type ? previous.props : {};
  const owned = pick(fit.props, def.layout?.owns ?? []);
  const fitVariant = variantOf(def, fit.variant);
  const fresh = () => {
    const base: Props = {
      ...storedDefaultProps(def, ctx),
      ...(def.layout?.defaults?.(ctx) ?? {}),
      ...(freshCopy?.(ctx) ?? {}),
      ...(fit.props ?? {}),
    };
    if (fitVariant) base[VARIANT_PROP] = fitVariant;
    return base;
  };

  if (!previous) return fresh();

  if (previous.type !== type) {
    // A new block type: its own defaults plus the compatible copy (title, subtitle…).
    const generated = fresh();
    const props: Props = { ...generated };
    for (const key of CARRY_KEYS) {
      const value = previous.props[key];
      if (typeof value === "string" && value.trim() !== "" && typeof generated[key] === "string") props[key] = value;
    }
    return repair(def, props, generated, ctx);
  }

  if (mode === "content") {
    const generated = fresh();
    const keepVariant = variantOf(def, previous.props[VARIANT_PROP]);
    return keepVariant ? { ...generated, [VARIANT_PROP]: keepVariant } : generated;
  }

  // Nothing the layout decides changed: the element keeps its props as they are (edits, AI copy, variant).
  if (sameFingerprint(block.generated, fingerprint)) return previous.props;

  const generated = fresh();
  const variant = fitVariant ?? variantOf(def, previous.props[VARIANT_PROP]) ?? generated[VARIANT_PROP];
  return topUp({ ...generated, ...previous.props, ...owned, [VARIANT_PROP]: variant }, generated);
}

/** Alternative seeds tried for a text block whose fresh title repeats a heading of the page. */
const TITLE_ATTEMPTS = 8;

/**
 * Freshly generated text blocks never repeat a title already on the page (a CTA's, another text block's):
 * the copy pools are small and shared, so the first text block of a Pricing screen could print the CTA's
 * heading. Each repeated title is replaced by the first title of an alternative seed that is free. Copy
 * kept from a previous page or pinned is never touched. Mutates `elements` (the build's own record).
 */
function dedupeTextTitles(
  elements: Record<string, PageElement>,
  fresh: readonly { id: string; ctx: ContentContext; def: AnySectionDefinition; freshCopy?: (ctx: ContentContext) => Props }[],
): void {
  if (fresh.length === 0) return;
  const candidates = new Set(fresh.map((entry) => entry.id));
  const titleOf = (element: PageElement | undefined) =>
    typeof element?.props.title === "string" && element.props.title.trim() !== "" ? element.props.title : undefined;
  const taken = new Set<string>();
  for (const [id, element] of Object.entries(elements)) {
    const title = titleOf(element);
    if (title !== undefined && !candidates.has(id)) taken.add(title);
  }
  for (const { id, ctx, def, freshCopy } of fresh) {
    const element = elements[id]!;
    let title = titleOf(element);
    if (title !== undefined && taken.has(title)) {
      for (let k = 1; k <= TITLE_ATTEMPTS; k++) {
        const altCtx = { ...ctx, seed: deriveSeed(ctx.seed, `${id}#${k}`) };
        const alternative = freshCopy ? freshCopy(altCtx).title : storedDefaultProps(def, altCtx).title;
        if (typeof alternative === "string" && alternative.trim() !== "" && !taken.has(alternative)) {
          elements[id] = { ...element, props: { ...element.props, title: alternative } };
          title = alternative;
          break;
        }
      }
    }
    if (title !== undefined) taken.add(title);
  }
}

/* ------------------------------------------------------------------------------------------------ */
/* Shell                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

function shellVariant(nav: AppShell["nav"], current: unknown): string {
  if (nav === "sidebar") return current === "inset" ? "inset" : "sidebar";
  return nav;
}

/** Page-header copy of the frame derived per screen (`shellScreenCopy`); a value that is not generated is kept. */
const SHELL_SCREEN_COPY_KEYS = ["subtitle", "primaryAction"] as const;
/**
 * Frame props the build writes from the layout and the screens on every build (navigation, page header, title =
 * screen name, nav items, active item): a pin on one of them is ignored, the layout owns them.
 */
const SHELL_LAYOUT_KEYS: ReadonlySet<string> = new Set([VARIANT_PROP, "showPageHeader", "title", "nav", "activeId"]);

/** The previous frame's props: its element, or its stash entry while the screen had no navigation. */
function previousShellProps(previous: Page | undefined): Props | undefined {
  const stored = previous?.elements[SHELL_ELEMENT_ID] ?? previous?.stash?.[SHELL_ELEMENT_ID];
  return stored?.type === APP_SHELL_TYPE ? stored.props : undefined;
}

function shellElementProps(
  shell: AppShell,
  ctx: ContentContext,
  registry: SectionRegistry,
  previous: Page | undefined,
  options: BuildFromLayoutOptions,
  mode: "layout" | "content",
  blockTypes: readonly LibraryBlockType[],
): Props {
  const def = registry.get(APP_SHELL_TYPE);
  const fresh: Props = def ? storedDefaultProps(def, ctx) : {};
  const previousProps = previousShellProps(previous);
  const kept = mode === "content" ? pick(previousProps, SHELL_SETTINGS) : (previousProps ?? {});
  const props: Props = { ...fresh, ...kept, ...(options.shellProps ?? {}) };
  // The frame copy the user edited in «Ajustar» (`shell.pinned`): written back in both modes, below.
  const pinned = (shell.pinned ?? []).filter((pointer) => {
    const head = pointerSegments(pointer)?.[0];
    return head !== undefined && !SHELL_LAYOUT_KEYS.has(head);
  });
  const pinnedValue = (key: string) => previousProps !== undefined && pinned.includes(`/${key}`) && readAt(previousProps, [key]) !== undefined;

  props[VARIANT_PROP] = shellVariant(shell.nav, props[VARIANT_PROP]);
  props.showPageHeader = shell.header;
  if (options.screenTitle) props.title = options.screenTitle;

  // The screen's own subtitle and primary action (from its name, its blocks and the product), unless the
  // user pinned it, or the stored value is not one the build writes: then the user or the AI wrote it and it stays.
  const derived = shellScreenCopy(shellScreenPurpose(options.screenTitle ?? "", blockTypes), ctx);
  const generated = shellCopyCandidates(ctx);
  for (const key of SHELL_SCREEN_COPY_KEYS) {
    if (pinnedValue(key)) continue;
    const current = props[key];
    if (typeof current !== "string" || generated[key].has(current)) props[key] = derived[key];
  }

  const screens = (options.navScreens ?? []).slice(0, SHELL_NAV_MAX);
  if (screens.length > 0) {
    const freshNav = Array.isArray(fresh.nav) ? (fresh.nav as { icon?: unknown }[]) : [];
    props.nav = screens.map((screen, i) => ({
      id: screen.id,
      label: screen.name,
      icon: freshNav[i]?.icon ?? SHELL_ICONS[i % SHELL_ICONS.length],
    }));
  }
  const navIds = Array.isArray(props.nav) ? (props.nav as { id?: unknown }[]).map((item) => item.id).filter((id) => typeof id === "string") : [];
  const active = [shell.activeItem, options.screenId, props.activeId].find(
    (id): id is string => typeof id === "string" && navIds.includes(id),
  );
  props.activeId = active ?? navIds[0] ?? "";
  return previousProps ? writePinned(props, previousProps, pinned, false) : props;
}

/* ------------------------------------------------------------------------------------------------ */
/* Landing navbar                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

type NavbarLink = { label: string; href: string; linkTo?: string };

const isNavbarLink = (value: unknown): value is NavbarLink =>
  isObject(value) && typeof value.label === "string" && typeof value.href === "string";

const labelKey = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * A landing navbar's `links` for the landing screens: with two or more, one link per screen first (label = name,
 * `linkTo` = id; the render links it where the screen has a URL, else `href` `#`, never a dead route), then the
 * navbar's own anchors whose label is not a screen's, at most
 * `NAVBAR_LINKS_MAX`; with fewer, links to screens are dropped and the anchors topped up from `fresh` to the
 * same length. The same object when nothing changes.
 */
function withScreenLinks(props: Props, screens: readonly NavScreen[], fresh: readonly NavbarLink[]): Props {
  const current = Array.isArray(props.links) ? props.links : null;
  if (!current || !current.every(isNavbarLink)) return props;
  const anchors = current.filter((link) => typeof link.linkTo !== "string");
  let links: NavbarLink[];
  if (screens.length >= 2) {
    const toScreens = screens.slice(0, NAVBAR_LINKS_MAX).map((screen) => ({ label: screen.name, href: "#", linkTo: screen.id }));
    const names = new Set(toScreens.map((link) => labelKey(link.label)));
    links = [...toScreens, ...anchors.filter((link) => !names.has(labelKey(link.label)))].slice(0, NAVBAR_LINKS_MAX);
  } else {
    if (anchors.length === current.length) return props;
    links = [...anchors];
    for (const link of fresh) {
      if (links.length >= current.length) break;
      if (!links.some((item) => labelKey(item.label) === labelKey(link.label))) links.push({ label: link.label, href: link.href });
    }
  }
  return JSON.stringify(links) === JSON.stringify(current) ? props : { ...props, links };
}

/* ------------------------------------------------------------------------------------------------ */
/* Page                                                                                             */
/* ------------------------------------------------------------------------------------------------ */

function compareByPosition(layout: LayoutDoc) {
  return (a: BlockId, b: BlockId) => {
    const ra = layout.blocks[a]!.rect;
    const rb = layout.blocks[b]!.rect;
    return ra.row - rb.row || ra.col - rb.col || (a < b ? -1 : a > b ? 1 : 0);
  };
}

/**
 * Compiles a screen's layout to its page: root (`${kind}.page`) → `shell` (`app.shell`, app screens whose nav
 * is not `none`) → `layout` (`ui.region` scope) → the inferred regions (`ui.region` `r-…`, structural) and the
 * blocks (element id = block id, type = the library's `sectionType`) as `toElementTree` nests them, overlays
 * last. Accepted children of non-container blocks are absorbed first (`absorbChildren`); their previous props
 * go to `page.stash` and come back when the block is moved out. Each block gets fresh props (per-block seed
 * after the first block of a section type), its `fit` and, with `options.previous`, the merge rules of
 * `options.mode`. App frames get the screen's own title, subtitle and primary action (`shellScreenCopy`).
 * Deterministic; throws `DesignDocError` on an invalid layout.
 */
export function buildPageFromLayout(
  layout: LayoutDoc,
  kind: ScreenKind,
  shell: AppShell | null,
  ctx: ContentContext,
  options: BuildFromLayoutOptions = {},
): BuildFromLayoutResult {
  const issues = validateLayout(layout);
  if (issues.length > 0) {
    throw new DesignDocError(`Invalid layout: ${issues.map((issue) => `/${issue.path.join("/")} ${issue.message}`).join("; ")}`);
  }
  const registry = options.registry ?? sectionRegistry;
  const mode = options.mode ?? "layout";
  const previous = options.previous;

  // ---- Absorb, infer, compile. ----
  const absorb = absorbChildren(layout);
  const compiled = absorb.layout;
  const cached = compiled === layout && options.structure !== undefined;
  const structure = cached ? options.structure! : inferStructure(compiled);
  const responsive = cached && options.responsive ? options.responsive : deriveResponsive(compiled, structure);
  const css = toCss(compiled, { kind, structure, responsive });
  const tree = toElementTree(structure);

  const absorbedTypes = new Map<BlockId, LibraryBlockType[]>();
  const absorbedIds = Object.keys(absorb.absorbed).sort(compareByPosition(layout));
  for (const child of absorbedIds) {
    const host = absorb.absorbed[child]!;
    absorbedTypes.set(host, [...(absorbedTypes.get(host) ?? []), layout.blocks[child]!.type]);
  }

  // ---- Per-block content context: the first block of a section type takes the document seed (or, for the
  // content sections of `SCREEN_SEEDED_TYPES`, the screen's own seed), then one seed per block. ----
  const screenCtx = options.screenId ? { ...ctx, seed: deriveSeed(ctx.seed, `screen:${options.screenId}`) } : ctx;
  const seen = new Set<string>();
  const seededCtx = new Map<BlockId, ContentContext>();
  for (const id of structure.order) {
    const type = getBlockDef(compiled.blocks[id]!.type).sectionType;
    seededCtx.set(id, seen.has(type) ? { ...ctx, seed: deriveSeed(ctx.seed, id) } : SCREEN_SEEDED_TYPES.has(type) ? screenCtx : ctx);
    seen.add(type);
  }

  // ---- The page's h1 (exactly one): a hero or the frame's page header; else the first visible text block; else
  // the first visible block whose section takes a heading `level` (a form, a list…). ----
  const hiddenInLayout = (id: BlockId): boolean => {
    for (let cur: BlockId | undefined = id, depth = 0; cur && depth <= 200; cur = compiled.blocks[cur]?.parentId, depth++) {
      if (compiled.blocks[cur]?.hidden === true) return true;
    }
    return false;
  };
  const sectionOf = (id: BlockId) => getBlockDef(compiled.blocks[id]!.type).sectionType;
  const withShell = kind === "app" && shell !== null && shell.nav !== "none";
  const hasPageHeading =
    (withShell && shell.header) || structure.order.some((id) => sectionOf(id) === HERO_TYPE && !hiddenInLayout(id));
  const overlayIds = new Set(structure.overlays.map((node) => node.id));
  const insideOverlay = (id: BlockId): boolean => {
    for (let cur: BlockId | undefined = id, depth = 0; cur && depth <= 200; cur = compiled.blocks[cur]?.parentId, depth++) {
      if (overlayIds.has(cur)) return true;
    }
    return false;
  };
  const takesLevel = (type: string): boolean => {
    const def = type === TEXT_TYPE ? undefined : registry.get(type);
    return def !== undefined && sectionTakesLevel(def, ctx);
  };
  const visibleOrder = structure.order.filter((id) => !hiddenInLayout(id) && !insideOverlay(id));
  const introTextId = visibleOrder.find((id) => sectionOf(id) === TEXT_TYPE);
  const headingId = hasPageHeading ? undefined : (introTextId ?? visibleOrder.find((id) => takesLevel(sectionOf(id))));

  // ---- What the screen is for (its name, then its visible blocks): the frame's header and its text blocks' copy. ----
  const visibleTypes = structure.order.filter((id) => !hiddenInLayout(id)).map((id) => compiled.blocks[id]!.type);
  const screenName = options.screenTitle;
  const textScreen =
    screenName === undefined
      ? undefined
      : (intro: boolean): UiTextScreen =>
          kind === "app"
            ? { kind, purpose: shellScreenPurpose(screenName, visibleTypes), intro }
            : { kind, purpose: landingScreenPurpose(screenName, visibleTypes), intro };

  // ---- Elements, in DOM order. ----
  const elements: Record<string, PageElement> = {};
  const freshText: { id: string; ctx: ContentContext; def: AnySectionDefinition; freshCopy?: (ctx: ContentContext) => Props }[] = [];
  const fingerprints: Record<BlockId, GeneratedFingerprint> = {};
  const hidden: string[] = [];
  const links: Record<string, string> = {};
  const add = (id: string, element: PageElement) => {
    if (hasOwn(elements, id)) throw new DesignDocError(`Duplicate element id "${id}" in the compiled layout`);
    elements[id] = element;
  };

  const rootType = pageRootType(kind);
  const rootDef = registry.get(rootType);
  const previousRoot = previous?.elements[previous.root];
  const rootProps = previousRoot?.type === rootType ? previousRoot.props : rootDef ? storedDefaultProps(rootDef, ctx) : {};
  add(ROOT_ELEMENT_ID, { type: rootType, props: rootProps, children: [withShell ? SHELL_ELEMENT_ID : LAYOUT_SCOPE_ID] });
  if (withShell) {
    add(SHELL_ELEMENT_ID, {
      type: APP_SHELL_TYPE,
      props: shellElementProps(shell, ctx, registry, previous, options, mode, visibleTypes),
      children: [LAYOUT_SCOPE_ID],
    });
  }
  // Region props are only the keys the layout decides (the rest comes from `ui.region`'s defaults at render).
  add(LAYOUT_SCOPE_ID, { type: REGION_TYPE, props: { role: "scope", screenKind: kind }, children: tree.map((el) => el.id) });

  const visit = (el: LayoutElement) => {
    const children = el.children.map((child) => child.id);
    if (el.role === "region") {
      add(el.id, { type: REGION_TYPE, props: { role: "inferred", layout: el.layout ?? "stack" }, children });
    } else {
      const block = compiled.blocks[el.id]!;
      const libraryDef = getBlockDef(block.type);
      const type = libraryDef.sectionType;
      const def = registry.get(type);
      const blockCtx = seededCtx.get(el.id) ?? ctx;
      const count = blockCount(block);
      const mobile = block.responsive?.mobile?.behavior;
      const input: FitInput = {
        w: block.rect.w,
        h: block.rect.h,
        widthPx: block.rect.w * COL_PX,
        heightPx: block.rect.h * ROW_UNIT,
        ...(count !== undefined && { count }),
        note: parseNote(block.note),
        estimate: estimateContent(layout.blocks[el.id]!, layout, el.id),
        absorbed: absorbedTypes.get(el.id) ?? [],
        kind,
        blockId: el.id,
        ...(mobile && { mobile }),
        ...(block.linkTo !== undefined && { linked: true }),
      };
      const fit: FitResult<Props> = def?.layout?.fit(input) ?? {};
      const fingerprint = fingerprintOf(block, variantOf(def, fit.variant) ?? def?.variants[0]?.id ?? "default");
      const overrides: Props = {};
      const derivers: ((props: Props) => Props)[] = [];
      if (def && type === TEXT_TYPE) overrides.level = el.id === headingId ? "h1" : (fit.props?.level ?? "h2");
      // Layout-owned and never a knob: a link added or removed without a size change still shows or hides the action.
      if (def && type === TEXT_TYPE && typeof fit.props?.showAction === "boolean") overrides.showAction = fit.props.showAction;
      if (def && takesLevel(type)) {
        if (el.id === headingId) overrides.level = "h1";
        else derivers.push((props) => (props.level === "h1" ? { ...props, level: "h2" } : props));
      }
      if (def && type === PLACEHOLDER_TYPE) {
        Object.assign(overrides, {
          blockType: block.type,
          blockLabel: block.label,
          blockNote: block.note ?? "",
          soon: libraryDef.status === "soon",
        });
      }
      if (def && type === NAVBAR_TYPE && kind === "landing" && options.landingScreens) {
        const screens = options.landingScreens;
        derivers.push((props) => withScreenLinks(props, screens, navLinks(blockCtx)));
      }
      const freshCopy =
        def && type === TEXT_TYPE && textScreen
          ? (copyCtx: ContentContext): Props => ({ ...uiScreenTextCopy(copyCtx, textScreen(el.id === introTextId)) })
          : undefined;
      const previousElement = previousBlockElement(previous, el.id, type);
      const props = blockProps(
        {
          block,
          type,
          def,
          ctx: blockCtx,
          fit,
          overrides,
          ...(derivers.length > 0 && { derive: (merged: Props) => derivers.reduce((acc, derive) => derive(acc), merged) }),
          ...(freshCopy && { freshCopy }),
          previous: previousElement,
          mode,
        },
        fingerprint,
      );
      add(el.id, { type, props, children });
      if (def && type === TEXT_TYPE && (!previousElement || mode === "content") && !(block.pinned ?? []).includes("/title")) {
        freshText.push({ id: el.id, ctx: blockCtx, def, ...(freshCopy && { freshCopy }) });
      }
      fingerprints[el.id] = fingerprint;
      if (block.hidden === true) hidden.push(el.id);
      if (block.linkTo) links[el.id] = block.linkTo;
    }
    el.children.forEach(visit);
  };
  tree.forEach(visit);

  dedupeTextTitles(elements, freshText);

  // ---- page.stash: the last props of blocks without an element of that type, so they come back. ----
  const stash: Record<string, StashedElement> = {};
  const previousStash: Readonly<Record<string, StashedElement>> = previous?.stash ?? {};
  // Absorbed blocks (a media inside a hero), until they are moved back out.
  for (const child of absorbedIds) {
    const block = layout.blocks[child]!;
    fingerprints[child] = fingerprintOf(block, ABSORBED_VARIANT);
    const host = absorb.absorbed[child]!;
    if (block.linkTo && !hasOwn(links, host)) links[host] = block.linkTo;
    const source = previousBlockElement(previous, child, getBlockDef(block.type).sectionType);
    if (source) stash[child] = stashEntry(child, source, block.pinned, registry, ctx, mode, false);
  }
  // Retyped blocks: the old type's props (the latest one), until the change is undone.
  for (const [id, element] of Object.entries(elements)) {
    if (!hasOwn(compiled.blocks, id)) continue;
    const before = previous && hasOwn(previous.elements, id) ? previous.elements[id] : undefined;
    const kept = hasOwn(previousStash, id) ? previousStash[id] : undefined;
    const source = before && before.type !== element.type ? before : kept && kept.type !== element.type ? kept : undefined;
    if (source) stash[id] = stashEntry(id, source, compiled.blocks[id]!.pinned, registry, ctx, mode, false);
  }
  // Removed blocks, with their pins (their layout block is gone), until a Layout undo brings them back: the ones
  // an earlier «Generar» removed first, then the ones removed now; the newest `MAX_REMOVED_STASH` stay.
  const gone = (id: string) => !hasOwn(layout.blocks, id) && id !== SHELL_ELEMENT_ID;
  const pinsOf = (id: string, fallback?: readonly string[]) => options.previousLayout?.blocks[id]?.pinned ?? fallback;
  const removed: [string, StashedElement][] = [];
  for (const [id, entry] of Object.entries(previousStash)) {
    if (!gone(id) || (previous && hasOwn(previous.elements, id))) continue;
    removed.push([id, stashEntry(id, entry, pinsOf(id, entry.pinned), registry, ctx, mode, true)]);
  }
  for (const [id, element] of Object.entries(previous?.elements ?? {})) {
    if (!gone(id) || id === ROOT_ELEMENT_ID || id === LAYOUT_SCOPE_ID || isInferredRegion(element)) continue;
    removed.push([id, stashEntry(id, element, pinsOf(id), registry, ctx, mode, true)]);
  }
  for (const [id, entry] of removed.slice(-MAX_REMOVED_STASH)) stash[id] = entry;
  // The app frame while the screen has no navigation: its props come back with it (`previousShellProps`).
  if (kind === "app" && !withShell) {
    const frame = previous?.elements[SHELL_ELEMENT_ID] ?? previousStash[SHELL_ELEMENT_ID];
    if (frame?.type === APP_SHELL_TYPE) stash[SHELL_ELEMENT_ID] = stashEntry(SHELL_ELEMENT_ID, frame, shell?.pinned, registry, ctx, mode, false);
  }

  // The previous page's dials (also when it has none), unless the screen changed kind.
  const dials = previous && previous.kind === kind ? previous.dials : (options.dials ?? PAGE_DIAL_DEFAULTS[kind]);
  const page: Page = {
    kind,
    layoutId: LAYOUT_PAGE_ID,
    ...(dials && Object.keys(dials).length > 0 && { dials: { ...dials } }),
    root: ROOT_ELEMENT_ID,
    elements,
    ...(hidden.length > 0 && { hidden }),
    ...(Object.keys(stash).length > 0 && { stash }),
  };
  return {
    page,
    css,
    fingerprints,
    absorbed: absorbedIds,
    warnings: [...absorb.warnings, ...structure.warnings],
    links,
  };
}
