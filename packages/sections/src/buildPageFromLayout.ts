import { DesignDocError, LAYOUT_PAGE_ID, PAGE_DIAL_DEFAULTS, ROOT_ELEMENT_ID, type Page, type PageElement } from "@dialmade/doc";
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
import { APP_SHELL_TYPE, VARIANT_PROP, pageRootType } from "./constants";
import { deriveSeed } from "./content/rng";
import { resolveSectionProps, storedDefaultProps } from "./props";
import { sectionRegistry, type SectionRegistry } from "./registry";
import type { AnySectionDefinition, ContentContext, FitInput, FitResult } from "./types";

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

/** A screen in the app's navigation: the shell's nav items when the nav is built from screens. */
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
  /** App screens: `app.shell` props shared by every app screen (from another screen's page); they win over `previous`. */
  shellProps?: Readonly<Record<string, unknown>>;
  /** The screen's name: the shell's page title. */
  screenTitle?: string;
  /** The screen's id: the active nav item when the nav is built from screens. */
  screenId?: string;
  /** App screens with navigation, in order: the shell's nav items (`id` = screen id, label = name, at most 10). */
  navScreens?: readonly NavScreen[];
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
  /** Blocks merged into their parent's section (a media inside a hero): no element. */
  absorbed: BlockId[];
  /** `inferStructure` warnings of the compiled layout plus `not-accepted` for moved children. */
  warnings: LayoutWarning[];
  /** Element id → screen (`linkTo`), for `PageRenderer`/`renderStaticPage` `links`. Absorbed links go to their host. */
  links: Record<string, string>;
}

type Props = Record<string, unknown>;

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
  const props = mergedProps(context, fingerprint);
  if (!def || !previous) return withOverrides(props, overrides);
  if (previous.type !== context.type) {
    // A new block type: only the pinned values that still fit its props, then a schema check.
    const pinned = writePinned(withOverrides(props, overrides), previous.props, block.pinned, true);
    return pinned === props ? props : repair(def, pinned, props, ctx);
  }
  return writePinned(withOverrides(props, overrides), previous.props, block.pinned, false);
}

/** Props before the overrides and the pinned values. */
function mergedProps({ block, type, def, ctx, fit, previous, mode }: BlockContext, fingerprint: GeneratedFingerprint): Props {
  if (!def) return previous?.type === type ? previous.props : {};
  const owned = pick(fit.props, def.layout?.owns ?? []);
  const fitVariant = variantOf(def, fit.variant);
  const fresh = () => {
    const base: Props = { ...storedDefaultProps(def, ctx), ...(def.layout?.defaults?.(ctx) ?? {}), ...(fit.props ?? {}) };
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
  fresh: readonly { id: string; ctx: ContentContext; def: AnySectionDefinition }[],
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
  for (const { id, ctx, def } of fresh) {
    const element = elements[id]!;
    let title = titleOf(element);
    if (title !== undefined && taken.has(title)) {
      for (let k = 1; k <= TITLE_ATTEMPTS; k++) {
        const alternative = storedDefaultProps(def, { ...ctx, seed: deriveSeed(ctx.seed, `${id}#${k}`) }).title;
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

function shellElementProps(
  shell: AppShell,
  ctx: ContentContext,
  registry: SectionRegistry,
  previous: Page | undefined,
  options: BuildFromLayoutOptions,
  mode: "layout" | "content",
): Props {
  const def = registry.get(APP_SHELL_TYPE);
  const fresh: Props = def ? storedDefaultProps(def, ctx) : {};
  const stored = previous?.elements[SHELL_ELEMENT_ID];
  const previousProps = stored?.type === APP_SHELL_TYPE ? stored.props : undefined;
  const kept = mode === "content" ? pick(previousProps, SHELL_SETTINGS) : (previousProps ?? {});
  const props: Props = { ...fresh, ...kept, ...(options.shellProps ?? {}) };

  props[VARIANT_PROP] = shellVariant(shell.nav, props[VARIANT_PROP]);
  props.showPageHeader = shell.header;
  if (options.screenTitle) props.title = options.screenTitle;

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
  return props;
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
 * last. Accepted children of non-container blocks are absorbed first (`absorbChildren`). Each block gets fresh
 * props (per-block seed after the first block of a section type), its `fit` and, with `options.previous`, the
 * merge rules of `options.mode`. Deterministic; throws `DesignDocError` on an invalid layout.
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

  // ---- Per-block content context: the base seed for the first block of a section type, then one per block. ----
  const seen = new Set<string>();
  const seededCtx = new Map<BlockId, ContentContext>();
  for (const id of structure.order) {
    const type = getBlockDef(compiled.blocks[id]!.type).sectionType;
    seededCtx.set(id, seen.has(type) ? { ...ctx, seed: deriveSeed(ctx.seed, id) } : ctx);
    seen.add(type);
  }

  // ---- The page's h1: the first visible text block when no hero and no shell page header draws one. ----
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
  const headingId = hasPageHeading
    ? undefined
    : structure.order.find((id) => sectionOf(id) === TEXT_TYPE && !hiddenInLayout(id) && !insideOverlay(id));

  // ---- Elements, in DOM order. ----
  const elements: Record<string, PageElement> = {};
  const freshText: { id: string; ctx: ContentContext; def: AnySectionDefinition }[] = [];
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
      props: shellElementProps(shell, ctx, registry, previous, options, mode),
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
      };
      const fit: FitResult<Props> = def?.layout?.fit(input) ?? {};
      const fingerprint = fingerprintOf(block, variantOf(def, fit.variant) ?? def?.variants[0]?.id ?? "default");
      const overrides: Props = {};
      if (def && type === TEXT_TYPE) overrides.level = el.id === headingId ? "h1" : (fit.props?.level ?? "h2");
      if (def && type === PLACEHOLDER_TYPE) {
        Object.assign(overrides, {
          blockType: block.type,
          blockLabel: block.label,
          blockNote: block.note ?? "",
          soon: libraryDef.status === "soon",
        });
      }
      const previousElement = previous?.elements[el.id];
      const props = blockProps(
        { block, type, def, ctx: blockCtx, fit, overrides, previous: previousElement, mode },
        fingerprint,
      );
      add(el.id, { type, props, children });
      if (def && type === TEXT_TYPE && (!previousElement || mode === "content") && !(block.pinned ?? []).includes("/title")) {
        freshText.push({ id: el.id, ctx: blockCtx, def });
      }
      fingerprints[el.id] = fingerprint;
      if (block.hidden === true) hidden.push(el.id);
      if (block.linkTo) links[el.id] = block.linkTo;
    }
    el.children.forEach(visit);
  };
  tree.forEach(visit);

  dedupeTextTitles(elements, freshText);

  for (const child of absorbedIds) {
    const block = layout.blocks[child]!;
    fingerprints[child] = fingerprintOf(block, ABSORBED_VARIANT);
    const host = absorb.absorbed[child]!;
    if (block.linkTo && !hasOwn(links, host)) links[host] = block.linkTo;
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
