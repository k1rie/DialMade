import {
  GENERIC_PRODUCT_ID,
  OUTPUT_KINDS,
  defaultsFor,
  getProductType,
  getStyleRecipe,
  getTypographyPairing,
  type Locale,
  type OutputKind,
} from "@dialmade/catalog";
import {
  DesignDocError,
  applyPatch,
  createDesignDoc,
  hardLocks,
  hasScreens,
  isLocked,
  orderedScreens,
  pageForKey,
  pointerSegments,
  screenPointer,
  unlock,
  valueAtPointer,
  type DesignDoc,
  type Dials,
  type Lock,
  type LockKey,
  type Page,
  type PageKey,
  type PatchOperation,
  type PatchResult,
  type Screen,
} from "@dialmade/doc";
import type { AppShell, BlockId, GeneratedFingerprint, LayoutBlock, LayoutDoc, ResponsiveLayout, ScreenKind, Structure } from "@dialmade/layout";
import { generateTheme, type PaletteStyleId } from "@dialmade/palette";
import {
  APP_SHELL_TYPE,
  SHELL_ELEMENT_ID,
  addDefaultPage,
  buildDefaultPage,
  buildPageFromLayout,
  contentContextFromDoc,
  type ContentContext,
  type NavScreen,
} from "@dialmade/sections";
import { brandNameFromFile } from "./brand-name";
import { deriveDesign } from "./design-derived";

/**
 * Pure DesignDoc operations used by the `useDesignDoc` store: brand, brief, legacy pages and the screens of
 * Modo Layout («Generar», copy rebuilds). This module pulls @dialmade/doc, @dialmade/catalog and
 * @dialmade/sections (the section registry and its CSS), so the store loads it lazily (`loadDesignEngine`)
 * and the Home keeps a small bundle.
 *
 * Every operation returns a `PatchResult`. When nothing changes it returns `{ ok: true, doc }` with
 * the same object, so the store can skip the update (and the undo entry).
 */

export type PaletteSnapshot = {
  /** `#rrggbb` */
  primary: string;
  /** `#rrggbb` */
  secondary?: string;
  styleId: PaletteStyleId;
  /** From the flow's theme when available; derived from the primary otherwise. */
  achromatic?: boolean;
  /** Logo file name: the brand name is guessed from it (`brisa.svg` → «Brisa»). */
  logoName?: string;
};

export type CreateFromPaletteOptions = {
  name?: string;
  /** Used when no name is given and the file name says nothing. */
  defaultName: string;
  locale: Locale;
  focus?: OutputKind;
  productType?: string;
};

const DIAL_RANGE = { min: 1, max: 10 } as const;

const unchanged = (doc: DesignDoc): PatchResult => ({ ok: true, doc });
const failure = (message: string, reason: "operation-failed" | "invalid-document" = "operation-failed"): PatchResult => ({
  ok: false,
  error: { reason, message },
});

function patch(doc: DesignDoc, ops: PatchOperation[]): PatchResult {
  return ops.length === 0 ? unchanged(doc) : applyPatch(doc, ops);
}

/** Runs a build that may throw (`DesignDocError` from @dialmade/doc or @dialmade/sections) as a `PatchResult`. */
function guardResult(run: () => PatchResult): PatchResult {
  try {
    return run();
  } catch (error) {
    if (error instanceof DesignDocError) {
      return { ok: false, error: { reason: "invalid-document", message: error.message, issues: [...error.issues] } };
    }
    return failure(error instanceof Error ? error.message : String(error));
  }
}

const guard = (run: () => DesignDoc): PatchResult => guardResult(() => ({ ok: true, doc: run() }));

const achromaticOf = (primary: string) => generateTheme({ primary }).achromatic;
const clampDial = (value: number) => Math.min(DIAL_RANGE.max, Math.max(DIAL_RANGE.min, Math.round(value)));

export function pageKinds(doc: DesignDoc): OutputKind[] {
  return OUTPUT_KINDS.filter((kind) => doc.pages[kind] !== undefined);
}

export function createFromPalette(palette: PaletteSnapshot, options: CreateFromPaletteOptions): PatchResult {
  return guard(() =>
    createDesignDoc({
      brand: {
        name: options.name?.trim() || brandNameFromFile(palette.logoName) || options.defaultName,
        seeds: { primary: palette.primary, ...(palette.secondary && { secondary: palette.secondary }) },
        achromatic: palette.achromatic ?? achromaticOf(palette.primary),
      },
      brief: {
        locale: options.locale,
        paletteStyleId: palette.styleId,
        ...(options.focus && { focus: options.focus }),
        ...(options.productType && { productType: options.productType }),
      },
      provenance: { createdAt: new Date().toISOString() },
    }),
  );
}

/** Seeds the Palette Lab cannot change because an import locked them («tu guía manda»). */
export function lockedSeeds(doc: DesignDoc): ("primary" | "secondary")[] {
  return (["primary", "secondary"] as const).filter((seed) => isLocked(doc, `/brand/seeds/${seed}`));
}

/**
 * Seeds, achromatic flag and palette style from the Palette Lab; pages and edits are kept. Each one
 * goes on its own: a seed locked by an import is left as is (the Lab shows its lock), and the style
 * still applies.
 */
export function syncPalette(doc: DesignDoc, palette: PaletteSnapshot): PatchResult {
  const ops: PatchOperation[] = [];
  const locked = new Set(lockedSeeds(doc));
  if (!locked.has("primary") && doc.brand.seeds.primary !== palette.primary) {
    ops.push({ op: "replace", path: "/brand/seeds/primary", value: palette.primary });
    const achromatic = palette.achromatic ?? achromaticOf(palette.primary);
    if (achromatic !== doc.brand.achromatic && !isLocked(doc, "/brand/achromatic")) ops.push({ op: "replace", path: "/brand/achromatic", value: achromatic });
  }
  if (!locked.has("secondary") && doc.brand.seeds.secondary !== palette.secondary) {
    if (palette.secondary) ops.push({ op: doc.brand.seeds.secondary ? "replace" : "add", path: "/brand/seeds/secondary", value: palette.secondary });
    else ops.push({ op: "remove", path: "/brand/seeds/secondary" });
  }
  if (doc.brief.paletteStyleId !== palette.styleId && !isLocked(doc, "/brief/paletteStyleId")) {
    ops.push({ op: "replace", path: "/brief/paletteStyleId", value: palette.styleId });
  }
  return patch(doc, ops);
}

/** A document with screens (Modo Layout) has no landing/app page: those come from screens built in «Layout». */
const SCREENS_OWN_PAGES = "This document has screens: landing and app pages come from the Layout step";

/** Adds the default page of `kind` (sections with their stored copy) from @dialmade/sections. */
export function withPage(doc: DesignDoc, kind: OutputKind, options: { layoutId?: string; replace?: boolean } = {}): PatchResult {
  if (doc.pages[kind] && !options.replace) return unchanged(doc);
  if (kind !== "brand" && hasScreens(doc)) return failure(SCREENS_OWN_PAGES);
  return guard(() => addDefaultPage(doc, kind, { ...options }));
}

/**
 * Removes a page; refuses to remove the last thing to show (the last page of a document without screens).
 * Without screens the focus moves to the first remaining page; with screens the style guide can go.
 */
export function withoutPage(doc: DesignDoc, kind: OutputKind): PatchResult {
  if (!doc.pages[kind]) return unchanged(doc);
  const ops: PatchOperation[] = [{ op: "remove", path: `/pages/${kind}` }];
  if (hasScreens(doc)) return patch(doc, ops);
  const remaining = pageKinds(doc).filter((k) => k !== kind);
  if (remaining.length === 0) return failure("The last page cannot be removed");
  if (doc.brief.focus === kind) ops.push({ op: "replace", path: "/brief/focus", value: remaining[0] });
  return patch(doc, ops);
}

/** Focus on `kind`, creating its page when missing (a document with screens only changes the focus). */
export function withFocus(doc: DesignDoc, kind: OutputKind): PatchResult {
  const paged = hasScreens(doc) ? unchanged(doc) : withPage(doc, kind);
  if (!paged.ok) return paged;
  return patch(paged.doc, paged.doc.brief.focus === kind ? [] : [{ op: "replace", path: "/brief/focus", value: kind }]);
}

/** `cascade` also takes the recipe's pairing and motion tier (unless locked: legacy pins and import locks alike). */
export function withRecipe(doc: DesignDoc, recipeId: string, options: { cascade?: boolean } = {}): PatchResult {
  const recipe = getStyleRecipe(recipeId);
  if (!recipe) return failure(`Unknown style recipe "${recipeId}"`);
  const ops: PatchOperation[] = [];
  if (doc.brief.recipeId !== recipe.id) ops.push({ op: "replace", path: "/brief/recipeId", value: recipe.id });
  if (options.cascade) {
    if (recipe.pairingId && recipe.pairingId !== doc.brief.pairingId && !isLocked(doc, "/brief/pairingId")) {
      ops.push({ op: "replace", path: "/brief/pairingId", value: recipe.pairingId });
    }
    if (recipe.defaultMotion !== doc.brief.motionTier && !isLocked(doc, "/brief/motionTier")) {
      ops.push({ op: "replace", path: "/brief/motionTier", value: recipe.defaultMotion });
    }
  }
  return patch(doc, ops);
}

export function withPairing(doc: DesignDoc, pairingId: string): PatchResult {
  const pairing = getTypographyPairing(pairingId);
  if (!pairing) return failure(`Unknown typography pairing "${pairingId}"`);
  return patch(doc, doc.brief.pairingId === pairing.id ? [] : [{ op: "replace", path: "/brief/pairingId", value: pairing.id }]);
}

export function withPaletteStyle(doc: DesignDoc, styleId: PaletteStyleId): PatchResult {
  return patch(doc, doc.brief.paletteStyleId === styleId ? [] : [{ op: "replace", path: "/brief/paletteStyleId", value: styleId }]);
}

/** Where a page lives in the document: `/pages/{kind}` or `/screens/{id}/page`. */
export function pagePointer(key: PageKey): string {
  return (OUTPUT_KINDS as readonly string[]).includes(key) ? `/pages/${key}` : screenPointer(key, "page");
}

/**
 * Dials are rounded and clamped to 1–10. `scope` "global" edits `brief.dials`; a page key (a kind or a
 * screen id) edits that page's own dials.
 */
export function withDials(doc: DesignDoc, dials: Partial<Dials>, scope: "global" | PageKey = "global"): PatchResult {
  const entries = (Object.entries(dials) as [keyof Dials, number | undefined][]).filter(
    (entry): entry is [keyof Dials, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
  );
  if (scope === "global") {
    const ops = entries
      .map(([key, value]) => [key, clampDial(value)] as const)
      .filter(([key, value]) => doc.brief.dials[key] !== value)
      .map(([key, value]): PatchOperation => ({ op: "replace", path: `/brief/dials/${key}`, value }));
    return patch(doc, ops);
  }
  const page = pageForKey(doc, scope);
  if (!page) return failure(`There is no ${scope} page`);
  const next = { ...page.dials };
  for (const [key, value] of entries) next[key] = clampDial(value);
  const same = entries.every(([key]) => page.dials?.[key] === next[key]);
  return patch(doc, same ? [] : [{ op: "add", path: `${pagePointer(scope)}/dials`, value: next }]);
}

/* ------------------------------------------------------------------------------------------------ */
/* Screens (Modo Layout)                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** One screen to compile: what the Layout step's «Generar» hands over (`GeneratedScreen` fits it). */
export type GeneratedScreenInput = {
  screenId: string;
  name: string;
  kind: ScreenKind;
  route: string;
  shell: AppShell | null;
  layout: LayoutDoc;
  /** Precomputed for this layout's geometry (the canvas cache); computed again when missing. */
  structure?: Structure;
  responsive?: ResponsiveLayout;
};

export type GenerateOptions = {
  /**
   * The user confirmed «¿Desbloquear y borrar?»: removing blocks (or pages) that hold a hard lock is allowed,
   * and the locks left pointing at nothing are dropped in the same write. Changed locked values are always
   * kept as they were, with or without it.
   */
  allowLocked?: boolean;
  /** Content context of the copy (default: `contentContextFromDoc(doc)`). */
  contentContext?: ContentContext;
};

type ScreenRecord = Record<string, Screen>;

/**
 * App frame props a screen that gets its frame now (a new app screen, or one that had no navigation) takes from
 * the frame the other app screens already show: its copy and settings. Title, nav, active item and page header
 * come from each screen. A screen that already has a frame keeps its own props (never overwritten: an edit on
 * one screen's frame is not lost to another's).
 */
const SHARED_SHELL_KEYS = ["brandName", "workspace", "searchPlaceholder", "user", "tone", "density", "showSearch", "variant"] as const;

const hasFrame = (page: Page | undefined) => page?.elements[SHELL_ELEMENT_ID]?.type === APP_SHELL_TYPE;

function sharedShellProps(doc: DesignDoc): Record<string, unknown> | undefined {
  for (const screen of orderedScreens(doc)) {
    if (!hasFrame(screen.page)) continue;
    const props = screen.page.elements[SHELL_ELEMENT_ID]!.props;
    const out: Record<string, unknown> = {};
    for (const key of SHARED_SHELL_KEYS) if (Object.hasOwn(props, key)) out[key] = props[key];
    return out;
  }
  return undefined;
}

/**
 * The layout as the document last compiled it, for the blocks it knows: `generated` (the fingerprint
 * `buildPageFromLayout` compares, so only what changed is refitted) and `pinned` (written by «Ajustar»: the
 * document is their only source) come from the screen's stored layout; a block the document does not know
 * has neither. Geometry, type, label, note, count, hidden and links stay as given. Same object when nothing
 * changes.
 */
function withDocBaseline(layout: LayoutDoc, stored: LayoutDoc | undefined): LayoutDoc {
  let blocks: Record<BlockId, LayoutBlock> | undefined;
  for (const [id, block] of Object.entries(layout.blocks)) {
    const known = stored && Object.hasOwn(stored.blocks, id) ? stored.blocks[id] : undefined;
    const generated = known?.generated;
    const pinned = known?.pinned;
    if (block.generated === generated && block.pinned === pinned) continue;
    if (sameJson(block.generated, generated) && sameJson(block.pinned, pinned)) continue;
    const next: LayoutBlock = { ...block };
    if (generated) next.generated = generated;
    else delete next.generated;
    if (pinned && pinned.length > 0) next.pinned = pinned;
    else delete next.pinned;
    (blocks ??= { ...layout.blocks })[id] = next;
  }
  return blocks ? { ...layout, blocks } : layout;
}

/** The layout with the fingerprints of the build written to `block.generated` (the same write as the page). */
function withFingerprints(layout: LayoutDoc, fingerprints: Readonly<Record<BlockId, GeneratedFingerprint>>): LayoutDoc {
  let blocks: Record<BlockId, LayoutBlock> | undefined;
  for (const [id, block] of Object.entries(layout.blocks)) {
    const generated = fingerprints[id];
    if (!generated || sameJson(block.generated, generated)) continue;
    (blocks ??= { ...layout.blocks })[id] = { ...block, generated };
  }
  return blocks ? { ...layout, blocks } : layout;
}

const sameJson = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * Compiles screens to their pages with `buildPageFromLayout`: each one with its previous page (same id) so
 * edits, pinned values, hidden blocks and dials survive, a new frame taking the props of the existing ones, the
 * nav built from the app screens that have one, and the fingerprints written back into the layouts.
 */
function buildScreens(doc: DesignDoc, sources: readonly GeneratedScreenInput[], ctx: ContentContext, mode: "layout" | "content"): ScreenRecord {
  const navScreens: NavScreen[] = sources
    .filter((source) => source.kind === "app" && source.shell !== null && source.shell.nav !== "none")
    .map((source) => ({ id: source.screenId, name: source.name }));
  const shellProps = sharedShellProps(doc);
  const out: ScreenRecord = {};
  for (const source of sources) {
    const stored = Object.hasOwn(doc.screens, source.screenId) ? doc.screens[source.screenId] : undefined;
    const layout = withDocBaseline(source.layout, stored?.layout);
    const result = buildPageFromLayout(layout, source.kind, source.shell, ctx, {
      ...(stored && { previous: stored.page }),
      ...(source.structure && { structure: source.structure }),
      ...(source.responsive && { responsive: source.responsive }),
      mode,
      ...(shellProps && source.kind === "app" && !hasFrame(stored?.page) && { shellProps }),
      screenTitle: source.name,
      screenId: source.screenId,
      navScreens,
    });
    out[source.screenId] = {
      id: source.screenId,
      name: source.name,
      kind: source.kind,
      route: source.route,
      layout: withFingerprints(layout, result.fingerprints),
      page: result.page,
      shell: source.shell,
    };
  }
  return out;
}

/** The screens of `doc` as build sources (rebuilding from their own layouts). */
const sourcesOf = (doc: DesignDoc): GeneratedScreenInput[] =>
  orderedScreens(doc).map((screen) => ({
    screenId: screen.id,
    name: screen.name,
    kind: screen.kind,
    route: screen.route,
    shell: screen.shell,
    layout: screen.layout,
  }));

/** `root` with `value` at `segments`, copying the containers on the path (never mutates `root`). */
function writeAt(root: unknown, segments: readonly string[], value: unknown): unknown {
  if (segments.length === 0) return value;
  const [head, ...rest] = segments as [string, ...string[]];
  if (Array.isArray(root)) {
    const index = Number(head);
    if (!/^(0|[1-9]\d*)$/.test(head) || index >= root.length) return root;
    const copy = [...root];
    copy[index] = writeAt(root[index], rest, value);
    return copy;
  }
  if (typeof root !== "object" || root === null || !Object.hasOwn(root, head)) return root;
  const record = root as Record<string, unknown>;
  return { ...record, [head]: writeAt(record[head], rest, value) };
}

/** Roots of the document a rebuild rewrites: locks under them are checked before the write. */
const REBUILT_ROOTS = ["/screens/", "/pages/"];

/**
 * Hard locks under the rewritten parts keep their value: a locked value the rebuild changed is written back
 * as it was (a locale change never rewrites a locked text). Locked values the rebuild removes are left for
 * `applyPatch` to refuse (`locked`), so the user is asked first. Mutates nothing: returns the new values.
 */
function keepLockedValues(doc: DesignDoc, next: { screens: ScreenRecord; pages: DesignDoc["pages"] }): { screens: ScreenRecord; pages: DesignDoc["pages"] } {
  let out = next;
  for (const lock of hardLocks(doc)) {
    if (!REBUILT_ROOTS.some((root) => lock.startsWith(root))) continue;
    const before = valueAtPointer(doc, lock);
    const after = valueAtPointer(out, lock);
    if (before === undefined || after === undefined || sameJson(before, after)) continue;
    out = writeAt(out, pointerSegments(lock), before) as typeof out;
  }
  return out;
}

/** Lock entries under the rewritten parts that point at nothing in `next` (their value was removed). */
function danglingLockOps(doc: DesignDoc, next: { screens: ScreenRecord; pages: DesignDoc["pages"] }): PatchOperation[] {
  const ops: PatchOperation[] = [];
  doc.brief.locks.forEach((lock, index) => {
    if (!lock.startsWith("/") || !REBUILT_ROOTS.some((root) => lock.startsWith(root))) return;
    if (valueAtPointer(next, lock) === undefined) ops.push({ op: "remove", path: `/brief/locks/${index}` });
  });
  return ops.reverse();
}

/**
 * «Generar» (Modo Layout) as ONE validated write: `screens` + `screenOrder` (every screen's page compiled by
 * `buildPageFromLayout` with its previous page, new app frames like the existing ones, the nav built from the
 * app screens, and the `block.generated` fingerprints),
 * the style guide (`pages.brand`) when it is missing, `brief.focus` = the kind of the first screen, and
 * `pages.landing` / `pages.app` removed (screens replace them: an explicit conversion). Pinned values come from
 * the document (the Layout draft never edits them), hidden blocks and links from the given layouts.
 *
 * Hard locks: a locked value that would change keeps its value; removing a block (or page) that holds a lock
 * fails with `locked` (and the lock) unless `allowLocked` (the user confirmed «¿Desbloquear y borrar?»), which
 * also drops the locks left pointing at nothing. Builds the next document once and validates it once.
 */
export function withGeneratedScreens(doc: DesignDoc, screens: readonly GeneratedScreenInput[], options: GenerateOptions = {}): PatchResult {
  if (screens.length === 0) return failure("Nothing to generate: the layout has no screens");
  return guardResult(() => {
    const ctx = options.contentContext ?? contentContextFromDoc(doc);
    const built = buildScreens(doc, screens, ctx, "layout");
    const pages: DesignDoc["pages"] = { ...doc.pages };
    delete pages.landing;
    delete pages.app;
    if (!pages.brand) pages.brand = buildDefaultPage("brand", ctx);
    const next = keepLockedValues(doc, { screens: built, pages });
    const focus = screens[0]!.kind;

    const ops: PatchOperation[] = [
      { op: "replace", path: "/screens", value: next.screens },
      { op: "replace", path: "/screenOrder", value: screens.map((screen) => screen.screenId) },
    ];
    for (const kind of ["landing", "app"] as const) if (doc.pages[kind]) ops.push({ op: "remove", path: `/pages/${kind}` });
    if (!doc.pages.brand && next.pages.brand) ops.push({ op: "add", path: "/pages/brand", value: next.pages.brand });
    if (doc.brief.focus !== focus && !isLocked(doc, "/brief/focus", { hardOnly: true })) ops.push({ op: "replace", path: "/brief/focus", value: focus });
    if (options.allowLocked) ops.push(...danglingLockOps(doc, next));
    return applyPatch(doc, ops, { allowLocked: options.allowLocked ?? false });
  });
}

/**
 * Regenerates the copy of every page in the document's (new) locale or product: screens from their own layout
 * (`buildPageFromLayout` mode "content": ids, hidden blocks, dials, variants, layout-owned keys and pinned values
 * stay; critique #2), legacy and brand pages from their defaults (their edits and hidden sections are lost; page
 * dials stay; `keepLayout` keeps the landing layout). One write, through `applyPatch`: locked values stay.
 */
function rebuildPages(doc: DesignDoc, options: { keepLayout: boolean }): PatchResult {
  return guardResult(() => {
    const ctx = contentContextFromDoc(doc);
    const pages: DesignDoc["pages"] = { ...doc.pages };
    for (const kind of pageKinds(doc)) {
      const previous = doc.pages[kind]!;
      const page: Page = buildDefaultPage(kind, ctx, options.keepLayout ? previous.layoutId : undefined);
      pages[kind] = previous.dials ? { ...page, dials: previous.dials } : page;
    }
    const screens = hasScreens(doc) ? buildScreens(doc, sourcesOf(doc), ctx, "content") : doc.screens;
    const next = keepLockedValues(doc, { screens, pages });
    const ops: PatchOperation[] = pageKinds(doc).map((kind) => ({ op: "replace", path: `/pages/${kind}`, value: next.pages[kind] }));
    if (hasScreens(doc)) ops.push({ op: "replace", path: "/screens", value: next.screens });
    return patch(doc, ops);
  });
}

/** «Desbloquear»: removes the lock on `pointer` (a `PatchFailure.lock`, and its legacy alias). An explicit user action. */
export function withoutLock(doc: DesignDoc, pointer: string): PatchResult {
  return unlock(doc, pointer as Lock);
}

/**
 * `applyDefaults` also sets the catalog's recipe, pairing and motion tier for that product (unless
 * locked). `rebuildPages` regenerates the pages' copy and the landing layout for it.
 */
export function withProductType(
  doc: DesignDoc,
  productTypeId: string,
  options: { applyDefaults?: boolean; rebuildPages?: boolean } = {},
): PatchResult {
  if (productTypeId !== GENERIC_PRODUCT_ID && !getProductType(productTypeId)) return failure(`Unknown product type "${productTypeId}"`);
  const ops: PatchOperation[] = [];
  if (doc.brief.productType !== productTypeId) ops.push({ op: "replace", path: "/brief/productType", value: productTypeId });
  if (options.applyDefaults) {
    const defaults = defaultsFor(productTypeId);
    const choices: [LockKey, "recipeId" | "pairingId" | "motionTier", string][] = [
      ["recipeId", "recipeId", defaults.recipe.id],
      ["pairingId", "pairingId", defaults.pairing.id],
      ["motionTier", "motionTier", defaults.motion.id],
    ];
    for (const [lock, field, value] of choices) {
      if (doc.brief[field] !== value && !isLocked(doc, lock)) ops.push({ op: "replace", path: `/brief/${field}`, value });
    }
  }
  const patched = patch(doc, ops);
  if (!patched.ok || !options.rebuildPages) return patched;
  return rebuildPages(patched.doc, { keepLayout: false });
}

/** Locale of the user's pages (copy and @dialmade/ui texts). `rebuildPages` regenerates the stored copy in it. */
export function withContentLocale(doc: DesignDoc, locale: Locale, options: { rebuildPages?: boolean } = {}): PatchResult {
  const patched = patch(doc, doc.brief.locale === locale ? [] : [{ op: "replace", path: "/brief/locale", value: locale }]);
  if (!patched.ok || !options.rebuildPages) return patched;
  return rebuildPages(patched.doc, { keepLayout: true });
}

/** `tagline: null` (or blank) removes it. Bindings ({ bind: "brand.name" }) update every page. */
export function withBrandText(doc: DesignDoc, text: { name?: string; tagline?: string | null }): PatchResult {
  const ops: PatchOperation[] = [];
  if (text.name !== undefined) {
    const name = text.name.trim();
    if (name !== doc.brand.name) ops.push({ op: "replace", path: "/brand/name", value: name });
  }
  if (text.tagline !== undefined) {
    const tagline = text.tagline?.trim() || undefined;
    if (tagline !== doc.brand.tagline) {
      ops.push(tagline === undefined ? { op: "remove", path: "/brand/tagline" } : { op: "add", path: "/brand/tagline", value: tagline });
    }
  }
  return patch(doc, ops);
}

export const designEngine = {
  applyPatch,
  createFromPalette,
  syncPalette,
  withPage,
  withoutPage,
  withFocus,
  withRecipe,
  withPairing,
  withPaletteStyle,
  withDials,
  withProductType,
  withContentLocale,
  withBrandText,
  withGeneratedScreens,
  withoutLock,
  pageKinds,
  deriveDesign,
};

export type DesignEngine = typeof designEngine;
