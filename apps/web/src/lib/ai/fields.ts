import type { OutputKind } from "@dialmade/catalog";
import { coversPointer, isBinding, orderedScreens, type DesignDoc, type Page, type PageElement } from "@dialmade/doc";
import {
  SHELL_ELEMENT_ID,
  VARIANT_PROP,
  contentContextFromDoc,
  isStructuralElement,
  resolveSectionProps,
  sectionRegistry,
  visibleProps,
  type AnySectionDefinition,
  type ContentContext,
  type SectionRegistry,
} from "@dialmade/sections";
import { MAX_COPY_FIELDS } from "./config";

/** One piece of text the model may rewrite. `pointer` is the RFC 6902 path in the DesignDoc. */
export type CopyField = {
  /** Short id the model answers with («f12»). */
  id: string;
  /** Element of the page (`hero-1`), or `null` for the brand tagline. */
  elementId: string | null;
  sectionType: string | null;
  /** Path inside the element's props (`["items", "2", "title"]`), or `["tagline"]` for the brand. */
  path: readonly string[];
  pointer: string;
  op: "replace" | "add";
  current: string;
  maxLength: number;
  /** Screen of the element (Modo Layout: the pointer is under `/screens/{screenId}/page`). Absent for legacy pages and the tagline. */
  screenId?: string;
};

/** One screen of a «Generar» request: the whole screen, or only some of its sections. */
export type ScreenCopyTarget = {
  /** Screen id (key of `doc.screens`). */
  id: string;
  /** Element ids of that screen's page (= block ids). Default: every visible section of the screen. */
  sectionIds?: readonly string[];
};

/**
 * Keys that are data, identity or configuration, never copy: links, icons, enums, numbers shown as
 * text, people and company names (the model must not invent real ones) and table rows.
 */
const SKIP_KEYS = new Set([
  VARIANT_PROP,
  "id",
  "key",
  "href",
  "url",
  "src",
  "icon",
  "kind",
  "align",
  "tone",
  "format",
  "email",
  "initials",
  "activeId",
  "value",
  "display",
  "time",
  "language",
  "timezone",
  "name",
  "actor",
  "company",
  "role",
  "workspace",
  "subject",
  "logos",
  "names",
  "rows",
  "cells",
  "categories",
  "trend",
  // Modo Layout: links between screens, routes, dates and times, and the user's own block name and note
  // (shown as typed in `ui.placeholder`, and sent to the model as data in <layout_notes>).
  "linkTo",
  "route",
  "screen",
  "date",
  "day",
  "start",
  "end",
  "blockLabel",
  "blockNote",
]);

/**
 * Extra data keys of some sections inside screens: list rows name a (fictional) person and a relative time,
 * card `meta` is a figure, and the shell's title, nav labels and search box mirror the screens and the shared
 * chrome (the layout rewrites them on every «Generar»).
 */
const SCREEN_SKIP_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  "ui.list": new Set(["primary", "meta"]),
  "ui.cards": new Set(["meta"]),
  "app.shell": new Set(["title", "nav", "searchPlaceholder"]),
};

const MIN_TEXT = 2;
const MAX_TEXT = 600;
const BRAND_TAGLINE_MAX = 200;

const escapePointer = (segment: string) => segment.replace(/~/g, "~0").replace(/\//g, "~1");
export const toPointer = (segments: readonly string[]) => `/${segments.map(escapePointer).join("/")}`;

/** A field may grow to about twice its length (short labels get some room). */
export const maxLengthFor = (current: string) => Math.min(MAX_TEXT, Math.max(48, Math.ceil(current.length * 2)));

function getAt(value: unknown, path: readonly string[]): unknown {
  let node = value;
  for (const segment of path) {
    if (Array.isArray(node)) node = node[Number(segment)];
    else if (node && typeof node === "object") node = (node as Record<string, unknown>)[segment];
    else return undefined;
  }
  return node;
}

function withValueAt(value: unknown, path: readonly string[], next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path as [string, ...string[]];
  if (Array.isArray(value)) {
    const copy = value.slice();
    copy[Number(head)] = withValueAt(copy[Number(head)], rest, next);
    return copy;
  }
  const record = (value ?? {}) as Record<string, unknown>;
  return { ...record, [head]: withValueAt(record[head], rest, next) };
}

/** Same length, different text: an enum or a pattern rejects it, a free-text prop accepts it. */
function probeFor(text: string): string {
  const reversed = [...text].reverse().join("");
  return reversed !== text ? reversed : `${text.slice(1)}${text[0]}`;
}

/** True when the section schema accepts any text at `path` (so it is copy, not an enum or id). */
function isFreeText(def: AnySectionDefinition, props: Record<string, unknown>, path: readonly string[], text: string): boolean {
  if (typeof getAt(props, path) !== "string") return false;
  return def.schema.safeParse(withValueAt(props, path, probeFor(text))).success;
}

type Leaf = { path: string[]; text: string };

function* stringLeaves(value: unknown, path: string[] = [], skip: ReadonlySet<string> = SKIP_KEYS): Generator<Leaf> {
  if (typeof value === "string") {
    yield { path, text: value };
    return;
  }
  if (isBinding(value)) return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* stringLeaves(item, [...path, String(index)], skip);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (skip.has(key)) continue;
      yield* stringLeaves(item, [...path, key], skip);
    }
  }
}

/** Index in `stored` of an item `visibleProps` kept: the same object, else the same `id`. */
function storedIndex(stored: readonly unknown[], item: unknown): number {
  const same = stored.indexOf(item);
  if (same >= 0 || !item || typeof item !== "object") return same;
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" ? stored.findIndex((entry) => !!entry && typeof entry === "object" && (entry as { id?: unknown }).id === id) : -1;
}

/**
 * String leaves of the stored props that the section shows (`visibleProps`), with paths into the STORED props:
 * keys a flag hides are left out, and lists cut or reordered by `count`/`purpose` keep only the items shown,
 * each with its stored index.
 */
function* visibleLeaves(
  stored: Readonly<Record<string, unknown>>,
  visible: Readonly<Record<string, unknown>>,
  skip: ReadonlySet<string>,
  topSkip: ReadonlySet<string>,
): Generator<Leaf> {
  for (const [key, shown] of Object.entries(visible)) {
    if (topSkip.has(key) || skip.has(key) || !Object.hasOwn(stored, key)) continue;
    const value = stored[key];
    if (Array.isArray(shown) && Array.isArray(value) && shown !== value) {
      for (const item of shown) {
        const index = storedIndex(value, item);
        if (index >= 0) yield* stringLeaves(value[index], [key, String(index)], skip);
      }
      continue;
    }
    yield* stringLeaves(value, [key], skip);
  }
}

/** Visible elements in render order (depth first), without the root and hidden subtrees. */
export function visibleElementIds(page: Page): string[] {
  const hidden = new Set(page.hidden ?? []);
  const out: string[] = [];
  const visit = (id: string) => {
    const element = page.elements[id];
    if (!element || hidden.has(id)) return;
    out.push(id);
    element.children.forEach(visit);
  };
  page.elements[page.root]?.children.forEach(visit);
  return out;
}

export type CollectCopyFieldsOptions = {
  /** Only these elements (default: every visible one). */
  sectionIds?: readonly string[];
  registry?: SectionRegistry;
  maxFields?: number;
};

type PendingField = Omit<CopyField, "id">;

const bindsTagline = (def: AnySectionDefinition) => Object.values(def.bindings ?? {}).includes("brand.tagline");

/** The copy leaves of one element that pass the length and free-text checks, in prop order. */
function elementFields(
  def: AnySectionDefinition,
  element: PageElement,
  ctx: ContentContext,
  leaves: Iterable<Leaf>,
  pointer: (path: readonly string[]) => string,
  extra: Pick<PendingField, "elementId" | "sectionType"> & { screenId?: string },
): PendingField[] {
  const { props } = resolveSectionProps(def, element.props, ctx);
  const out: PendingField[] = [];
  for (const leaf of leaves) {
    const text = leaf.text.trim();
    if (text.length < MIN_TEXT || text.length > MAX_TEXT) continue;
    if (!isFreeText(def, props, leaf.path, leaf.text)) continue;
    out.push({ ...extra, path: leaf.path, pointer: pointer(leaf.path), op: "replace", current: leaf.text, maxLength: maxLengthFor(text) });
  }
  return out;
}

/** Caps the fields (keeping room for the tagline when it is offered) and numbers them `f1…`. */
function numberFields(doc: DesignDoc, pending: PendingField[], offerTagline: boolean, maxFields: number): CopyField[] {
  const kept = pending.slice(0, Math.max(0, offerTagline ? maxFields - 1 : maxFields));
  if (offerTagline) {
    kept.push({
      elementId: null,
      sectionType: null,
      path: ["tagline"],
      pointer: "/brand/tagline",
      op: "add",
      current: doc.brand.tagline ?? "",
      maxLength: BRAND_TAGLINE_MAX,
    });
  }
  return kept.map((field, index) => ({ ...field, id: `f${index + 1}` }));
}

/**
 * Text props of a page the AI may rewrite: string leaves the section schema accepts as free text,
 * minus bindings (`{ bind }`), data and identity keys. The brand tagline is offered when the whole
 * page is requested or a requested section binds it.
 */
export function collectCopyFields(doc: DesignDoc, kind: OutputKind, options: CollectCopyFieldsOptions = {}): CopyField[] {
  const page = doc.pages[kind];
  if (!page) return [];
  const registry = options.registry ?? sectionRegistry;
  const maxFields = options.maxFields ?? MAX_COPY_FIELDS;
  const ctx = contentContextFromDoc(doc, { locale: doc.brief.locale });
  const wanted = options.sectionIds ? new Set(options.sectionIds) : null;
  const ids = visibleElementIds(page).filter((id) => !wanted || wanted.has(id));

  const pending: PendingField[] = [];
  let offerTagline = !wanted;

  for (const elementId of ids) {
    const element = page.elements[elementId]!;
    const def = registry.get(element.type);
    if (!def) continue;
    const bound = new Set(Object.keys(def.bindings ?? {}));
    if (bindsTagline(def)) offerTagline = true;
    const leaves = function* () {
      for (const [key, value] of Object.entries(element.props)) {
        if (bound.has(key) || SKIP_KEYS.has(key)) continue;
        yield* stringLeaves(value, [key]);
      }
    };
    const pointer = (path: readonly string[]) => toPointer(["pages", kind, "elements", elementId, "props", ...path]);
    pending.push(...elementFields(def, element, ctx, leaves(), pointer, { elementId, sectionType: element.type }));
  }

  return numberFields(doc, pending, offerTagline, maxFields);
}

/** The screens of a request that the document does not have (the caller answers `no-page`). */
export const missingScreens = (doc: Pick<DesignDoc, "screens">, targets: readonly ScreenCopyTarget[]): string[] =>
  targets.filter((target) => !Object.hasOwn(doc.screens, target.id)).map((target) => target.id);

/**
 * The requested sections per screen: `null` = the whole screen. Repeated screens merge (a whole request wins).
 * Unknown screens are kept: the caller decides (`no-page`).
 */
export function requestedSections(targets: readonly ScreenCopyTarget[]): Map<string, ReadonlySet<string> | null> {
  const out = new Map<string, Set<string> | null>();
  for (const target of targets) {
    const previous = out.get(target.id);
    if (previous === null) continue;
    if (!target.sectionIds) {
      out.set(target.id, null);
      continue;
    }
    const set = previous ?? new Set<string>();
    target.sectionIds.forEach((id) => set.add(id));
    out.set(target.id, set);
  }
  return out;
}

export type ScreenCopyPlan = {
  /** What is sent (at most `maxFields`, the tagline last when offered). */
  fields: CopyField[];
  /** Fields before the cap: more than `maxFields` → «La IA reescribe los primeros 160 textos». */
  total: number;
  truncated: boolean;
};

/**
 * The leaf sits inside an object (an array item, a nested object) that links to a screen (`linkTo`): its label
 * mirrors that screen's name (a landing navbar's link to a screen), which the build writes on every «Generar».
 */
function insideScreenLink(props: Readonly<Record<string, unknown>>, path: readonly string[]): boolean {
  let node: unknown = props;
  for (const segment of path.slice(0, -1)) {
    node = Array.isArray(node) ? node[Number(segment)] : node && typeof node === "object" ? (node as Record<string, unknown>)[segment] : undefined;
    if (node && typeof node === "object" && !Array.isArray(node) && typeof (node as { linkTo?: unknown }).linkTo === "string") return true;
  }
  return false;
}

/** A `PageElement` is a section with copy of its own (not the layout scope or an inferred region). */
const isCopySection = (def: AnySectionDefinition | undefined, element: PageElement): def is AnySectionDefinition =>
  def !== undefined && !isStructuralElement(def, element);

/**
 * One request for several screens (Modo Layout, critique #7): the screens in `screenOrder` that are requested,
 * each screen's visible sections in render order, through `visibleProps` (only what renders: lists cut to
 * `count`, copy hidden by a flag left out). Pointers are `/screens/{sid}/page/elements/{eid}/props/…`, one id
 * counter and one cap for all screens, and the brand tagline once. Skips structural regions, props the user
 * edited (`layout.blocks[eid].pinned`, and the app frame's `shell.pinned`), the data keys of `SCREEN_SKIP_KEYS`
 * and the labels of links to screens (they mirror the screens' names).
 */
export function screenCopyPlan(doc: DesignDoc, targets: readonly ScreenCopyTarget[], options: Omit<CollectCopyFieldsOptions, "sectionIds"> = {}): ScreenCopyPlan {
  const registry = options.registry ?? sectionRegistry;
  const maxFields = options.maxFields ?? MAX_COPY_FIELDS;
  const ctx = contentContextFromDoc(doc, { locale: doc.brief.locale });
  const requested = requestedSections(targets);
  const pending: PendingField[] = [];
  let offerTagline = false;

  for (const screen of orderedScreens(doc)) {
    if (!requested.has(screen.id)) continue;
    const wanted = requested.get(screen.id)!;
    if (wanted === null) offerTagline = true;
    const { page, layout } = screen;
    for (const elementId of visibleElementIds(page)) {
      if (wanted && !wanted.has(elementId)) continue;
      const element = page.elements[elementId]!;
      const def = registry.get(element.type);
      if (!isCopySection(def, element)) continue;
      if (bindsTagline(def)) offerTagline = true;
      const extraSkip = SCREEN_SKIP_KEYS[element.type];
      const skip = extraSkip ? new Set([...SKIP_KEYS, ...extraSkip]) : SKIP_KEYS;
      const bound = new Set(Object.keys(def.bindings ?? {}));
      const pinned = Object.hasOwn(layout.blocks, elementId)
        ? (layout.blocks[elementId]!.pinned ?? [])
        : elementId === SHELL_ELEMENT_ID
          ? (screen.shell?.pinned ?? [])
          : [];
      const leaves = function* () {
        for (const leaf of visibleLeaves(element.props, visibleProps(element, registry), skip, bound)) {
          const relative = toPointer(leaf.path);
          if (pinned.some((pin) => coversPointer(pin, relative)) || insideScreenLink(element.props, leaf.path)) continue;
          yield leaf;
        }
      };
      const pointer = (path: readonly string[]) => toPointer(["screens", screen.id, "page", "elements", elementId, "props", ...path]);
      pending.push(...elementFields(def, element, ctx, leaves(), pointer, { elementId, sectionType: element.type, screenId: screen.id }));
    }
  }

  const total = pending.length + (offerTagline ? 1 : 0);
  return { fields: numberFields(doc, pending, offerTagline, maxFields), total, truncated: total > maxFields };
}

/** `screenCopyPlan(...).fields`: the fields of a multi-screen request. */
export function collectScreenCopyFields(
  doc: DesignDoc,
  targets: readonly ScreenCopyTarget[],
  options: Omit<CollectCopyFieldsOptions, "sectionIds"> = {},
): CopyField[] {
  return screenCopyPlan(doc, targets, options).fields;
}
