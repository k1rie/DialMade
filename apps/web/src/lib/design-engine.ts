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
  type DesignDoc,
  type Dials,
  type LockKey,
  type PatchOperation,
  type PatchResult,
} from "@dialmade/doc";
import { generateTheme, type PaletteStyleId } from "@dialmade/palette";
import { addDefaultPage } from "@dialmade/sections";
import { brandNameFromFile } from "./brand-name";
import { deriveDesign } from "./design-derived";

/**
 * Pure DesignDoc operations used by the `useDesignDoc` store. This module pulls @dialmade/doc,
 * @dialmade/catalog and @dialmade/sections (the section registry and its CSS), so the store loads it
 * lazily (`loadDesignEngine`) and the Home keeps a small bundle.
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

function guard(run: () => DesignDoc): PatchResult {
  try {
    return { ok: true, doc: run() };
  } catch (error) {
    if (error instanceof DesignDocError) {
      return { ok: false, error: { reason: "invalid-document", message: error.message, issues: [...error.issues] } };
    }
    return failure(error instanceof Error ? error.message : String(error));
  }
}

const isLocked = (doc: DesignDoc, key: LockKey) => doc.brief.locks.includes(key);
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

/** Seeds, achromatic flag and palette style from the Palette Lab; pages and edits are kept. */
export function syncPalette(doc: DesignDoc, palette: PaletteSnapshot): PatchResult {
  const ops: PatchOperation[] = [];
  const seeds = { primary: palette.primary, ...(palette.secondary && { secondary: palette.secondary }) };
  if (doc.brand.seeds.primary !== seeds.primary || doc.brand.seeds.secondary !== seeds.secondary) {
    ops.push({ op: "replace", path: "/brand/seeds", value: seeds });
    const achromatic = palette.achromatic ?? achromaticOf(palette.primary);
    if (achromatic !== doc.brand.achromatic) ops.push({ op: "replace", path: "/brand/achromatic", value: achromatic });
  }
  if (doc.brief.paletteStyleId !== palette.styleId) ops.push({ op: "replace", path: "/brief/paletteStyleId", value: palette.styleId });
  return patch(doc, ops);
}

/** Adds the default page of `kind` (sections with their stored copy) from @dialmade/sections. */
export function withPage(doc: DesignDoc, kind: OutputKind, options: { layoutId?: string; replace?: boolean } = {}): PatchResult {
  if (doc.pages[kind] && !options.replace) return unchanged(doc);
  return guard(() => addDefaultPage(doc, kind, { ...options }));
}

/** Removes a page; refuses to remove the last one. The focus moves to the first remaining page. */
export function withoutPage(doc: DesignDoc, kind: OutputKind): PatchResult {
  if (!doc.pages[kind]) return unchanged(doc);
  const remaining = pageKinds(doc).filter((k) => k !== kind);
  if (remaining.length === 0) return failure("The last page cannot be removed");
  const ops: PatchOperation[] = [{ op: "remove", path: `/pages/${kind}` }];
  if (doc.brief.focus === kind) ops.push({ op: "replace", path: "/brief/focus", value: remaining[0] });
  return patch(doc, ops);
}

/** Focus on `kind`, creating its page when missing. */
export function withFocus(doc: DesignDoc, kind: OutputKind): PatchResult {
  const paged = withPage(doc, kind);
  if (!paged.ok) return paged;
  return patch(paged.doc, paged.doc.brief.focus === kind ? [] : [{ op: "replace", path: "/brief/focus", value: kind }]);
}

/** `cascade` also takes the recipe's pairing and motion tier (unless locked). */
export function withRecipe(doc: DesignDoc, recipeId: string, options: { cascade?: boolean } = {}): PatchResult {
  const recipe = getStyleRecipe(recipeId);
  if (!recipe) return failure(`Unknown style recipe "${recipeId}"`);
  const ops: PatchOperation[] = [];
  if (doc.brief.recipeId !== recipe.id) ops.push({ op: "replace", path: "/brief/recipeId", value: recipe.id });
  if (options.cascade) {
    if (recipe.pairingId && recipe.pairingId !== doc.brief.pairingId && !isLocked(doc, "pairingId")) {
      ops.push({ op: "replace", path: "/brief/pairingId", value: recipe.pairingId });
    }
    if (recipe.defaultMotion !== doc.brief.motionTier && !isLocked(doc, "motionTier")) {
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

/** Dials are rounded and clamped to 1–10. `scope` "global" edits `brief.dials`; a kind edits that page's own dials. */
export function withDials(doc: DesignDoc, dials: Partial<Dials>, scope: "global" | OutputKind = "global"): PatchResult {
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
  const page = doc.pages[scope];
  if (!page) return failure(`There is no ${scope} page`);
  const next = { ...page.dials };
  for (const [key, value] of entries) next[key] = clampDial(value);
  const same = entries.every(([key]) => page.dials?.[key] === next[key]);
  return patch(doc, same ? [] : [{ op: "add", path: `/pages/${scope}/dials`, value: next }]);
}

/** Rebuilds every existing page with default content (edits and hidden sections are lost; page dials stay). */
function rebuildPages(doc: DesignDoc, options: { keepLayout: boolean }): PatchResult {
  return guard(() => {
    let next = doc;
    for (const kind of pageKinds(doc)) {
      const previous = doc.pages[kind]!;
      next = addDefaultPage(next, kind, { replace: true, ...(options.keepLayout && { layoutId: previous.layoutId }) });
      if (previous.dials) {
        const result = applyPatch(next, [{ op: "add", path: `/pages/${kind}/dials`, value: previous.dials }]);
        if (result.ok) next = result.doc;
      }
    }
    return next;
  });
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
  pageKinds,
  deriveDesign,
};

export type DesignEngine = typeof designEngine;
