import {
  GENERIC_PRODUCT_ID,
  getLandingLayout,
  getProductType,
  getStyleRecipe,
  getTypographyPairing,
  type OutputKind,
  type StyleRecipe,
} from "@dialmade/catalog";
import {
  DESKTOP_COLUMNS,
  LABEL_MAX,
  LIBRARY,
  MAX_BLOCKS,
  MAX_HEIGHT_ROWS,
  ROW_UNIT,
  sanitizeLine,
  validateLayout,
  type AppNav,
  type AppShell as EngineAppShell,
  type LayoutBlock as EngineLayoutBlock,
  type LayoutDoc as EngineLayoutDoc,
  type LayoutIssueCode,
  type LibraryBlockType,
  type MobileBehavior,
  type ScreenKind as EngineScreenKind,
} from "@dialmade/layout";
import { PALETTE_STYLE_IDS, ROLE_KEYS, SCALE_STEPS, cssVarName, type PaletteStyleId } from "@dialmade/palette";
import { z } from "zod";
import { looksLikeBinding, isBinding } from "./bindings";
import {
  APP_NAV_IDS,
  BINDABLE_PATHS,
  CONFIDENCE_LEVELS,
  DESIGN_DOC_VERSION,
  DIAL_KEYS,
  FINGERPRINT_COLOR_ROLES,
  FINGERPRINT_DENSITIES,
  FINGERPRINT_METHODS,
  FINGERPRINT_MODES,
  FINGERPRINT_RADII,
  FONT_SIZE_NAMES,
  FONT_SOURCES,
  IMPORT_METHODS,
  IMPORT_SOURCE_KINDS,
  LAYOUT_PAGE_ID,
  LOCALE_IDS,
  LOCK_KEYS,
  MAX_PINNED,
  MAX_REMOVED_STASH,
  MAX_SCREENS,
  MAX_STASHED_SCREENS,
  MOBILE_BEHAVIORS,
  MOTION_TIER_IDS,
  OUTPUT_KIND_IDS,
  OWNERSHIP_IDS,
  POINTER_ROOTS,
  RECIPE_SHADOWS,
  RECIPE_SURFACES,
  REFERENCE_KINDS,
  REFERENCE_ORIGINS,
  RESERVED_SCREEN_IDS,
  ROUTE_MAX,
  SCREEN_KINDS,
  SHADOW_NAMES,
  THIRD_PARTY_FORBIDDEN_POINTERS,
  TYPE_CLASSES,
} from "./constants";
import { findNonJsonValue, isPlainObject } from "./json";
import { JSON_POINTER, coversPointer, isJsonPointer, pointerSegments } from "./pointer";

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const kindsMatchCatalog: Equals<(typeof OUTPUT_KIND_IDS)[number], OutputKind> = true;
const shadowsMatchCatalog: Equals<(typeof RECIPE_SHADOWS)[number], StyleRecipe["shadow"]> = true;
const surfacesMatchCatalog: Equals<(typeof RECIPE_SURFACES)[number], StyleRecipe["surface"]> = true;
const screenKindsMatchEngine: Equals<(typeof SCREEN_KINDS)[number], EngineScreenKind> = true;
const navsMatchEngine: Equals<(typeof APP_NAV_IDS)[number], AppNav> = true;
const behaviorsMatchEngine: Equals<(typeof MOBILE_BEHAVIORS)[number], MobileBehavior> = true;
void kindsMatchCatalog;
void shadowsMatchCatalog;
void surfacesMatchCatalog;
void screenKindsMatchEngine;
void navsMatchEngine;
void behaviorsMatchEngine;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ELEMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ELEMENT_TYPE = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

export const COLOR_ROLE_NAMES = ROLE_KEYS.map(cssVarName) as [string, ...string[]];
const SCALE_STEP_KEYS = SCALE_STEPS.map(String) as [string, ...string[]];

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb color");
/** A token color: `#rrggbb`, or `#rrggbbaa` when it has alpha (shadcn's dark `--border` is white at 10%). */
export const TokenColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/, "Expected a #rrggbb or #rrggbbaa color");
export const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase hex SHA-256");
export const OutputKindSchema = z.enum(OUTPUT_KIND_IDS);
export const LocaleSchema = z.enum(LOCALE_IDS);
export const MotionTierIdSchema = z.enum(MOTION_TIER_IDS);
export const PaletteStyleIdSchema = z.enum(PALETTE_STYLE_IDS as [PaletteStyleId, ...PaletteStyleId[]]);
export const ElementIdSchema = z.string().regex(ELEMENT_ID, "Element ids use letters, digits, '-' and '_' (max 64)");

export const DialSchema = z.number().int().min(1).max(10);
export const DialsSchema = z.strictObject({ variance: DialSchema, motion: DialSchema, density: DialSchema });
export const PartialDialsSchema = DialsSchema.partial();

export const BindingSchema = z.strictObject({ bind: z.enum(BINDABLE_PATHS) });

// ── brand ──────────────────────────────────────────────────────────────────────

const SingleLine = /^[^\u0000-\u001f\u007f]*$/;

export const BrandSchema = z.strictObject({
  name: z.string().min(1).max(80).regex(/\S/, "Name cannot be blank").regex(SingleLine, "Name must be a single line"),
  tagline: z.string().max(200).regex(SingleLine, "Tagline must be a single line").optional(),
  logoRef: z.string().min(1).max(2048).optional(),
  seeds: z.strictObject({ primary: HexColorSchema, secondary: HexColorSchema.optional() }),
  achromatic: z.boolean(),
});

// ── pointers & locks ───────────────────────────────────────────────────────────

/** A JSON Pointer into the DesignDoc (`/tokens/radius/md`): RFC 6901 syntax, rooted in a doc member. */
export const DocPointerSchema = z
  .templateLiteral(["/", z.string()])
  .refine((p) => p.length <= 256 && isJsonPointer(p), "Expected a JSON Pointer (RFC 6901), max 256 characters")
  .refine((p) => (POINTER_ROOTS as readonly string[]).includes(pointerSegments(p)[0]!), {
    message: `Pointers start at ${POINTER_ROOTS.map((root) => `/${root}`).join(", ")}`,
  });

export const LockKeySchema = z.enum(LOCK_KEYS);

/** A hard lock: `applyPatch` rejects any change at or below it. The list of locks itself cannot be locked. */
export const LockPointerSchema = DocPointerSchema.refine((p) => p !== "/brief" && !coversPointer("/brief/locks", p), {
  message: "/brief and /brief/locks cannot be locked",
});

/** A lock: a JSON Pointer (hard) or a legacy key (soft, kept for compatibility). */
export const LockSchema = z.union([LockKeySchema, LockPointerSchema]);

// ── brief ──────────────────────────────────────────────────────────────────────

export const BriefSchema = z.strictObject({
  productType: z.string().min(1).default(GENERIC_PRODUCT_ID),
  focus: OutputKindSchema,
  locale: LocaleSchema,
  paletteStyleId: PaletteStyleIdSchema,
  recipeId: z.string().regex(SLUG),
  pairingId: z.string().regex(SLUG),
  motionTier: MotionTierIdSchema,
  dials: DialsSchema,
  locks: z
    .array(LockSchema)
    .max(500)
    .default([])
    .refine((locks) => new Set(locks).size === locks.length, "Locks must be unique"),
});

// ── tokens ─────────────────────────────────────────────────────────────────────
// Only explicit values are stored: the user's edits and the imported values they accepted (one value,
// one place; `provenance.imports` says where each came from). Everything else (colors from the seeds
// and palette style, type scale, radii, spacing, shadows, durations, component tokens) is recomputed by
// `resolveTokens` from brand + brief + recipe + pairing + dials, so it never goes stale. Stored values
// win over the derived ones and over the dials.

const Px = (max: number) => z.number().min(0).max(max);
const Ms = z.number().int().min(0).max(5000);
const unique = <T>(items: readonly T[]) => new Set(items).size === items.length;
const SingleLineText = (max: number) => z.string().min(1).max(max).regex(/^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]*$/, "Single line, no control or bidi characters");

/** A font family name as written in CSS (`Inter`, `Source Sans 3`, `-apple-system`), without quotes. */
export const FontFamilyNameSchema = z
  .string()
  .regex(/^[\p{L}\p{N}_.+&-](?:[\p{L}\p{N} _.+&-]{0,62}[\p{L}\p{N}_.+&-])?$/u, "Font family names use letters, digits, spaces and _ . + & - (max 64)");

const FontWeightSchema = z.number().int().min(1).max(1000);

/** The user's own family for a role. The CSS stack is `family, substitute, ...fallback`. */
export const FontFamilyTokenSchema = z.strictObject({
  family: FontFamilyNameSchema,
  /** `google`: loaded from Google Fonts; `system`/`local`/`unknown`: never loaded. */
  source: z.enum(FONT_SOURCES).optional(),
  /** Free family loaded in its place (Arial → Arimo): metric-compatible, alias or chosen by the user. */
  substitute: FontFamilyNameSchema.optional(),
  /** Rest of the stack (`["system-ui", "sans-serif"]`); generic keywords are written unquoted. */
  fallback: z.array(FontFamilyNameSchema).max(12).optional(),
  weights: z.array(FontWeightSchema).max(12).refine(unique, "Weights must be unique").optional(),
});

/** Per-step type metrics. Sizes are not here: they live in `tokens.fontSize`. */
export const TypeStepSchema = z.strictObject({
  /** Unitless line height. */
  lineHeight: z.number().min(0.5).max(3).optional(),
  /** Letter spacing in em. */
  letterSpacing: z.number().min(-0.25).max(0.5).optional(),
  weight: FontWeightSchema.optional(),
});

export const TypographyTokensSchema = z.strictObject({
  heading: FontFamilyTokenSchema.optional(),
  body: FontFamilyTokenSchema.optional(),
  mono: FontFamilyTokenSchema.optional(),
  scale: z.partialRecord(z.enum(FONT_SIZE_NAMES), TypeStepSchema).prefault({}),
});

export const ShadowLayerSchema = z.strictObject({
  x: z.number().min(-256).max(256),
  y: z.number().min(-256).max(256),
  blur: z.number().min(0).max(512),
  spread: z.number().min(-256).max(256),
  color: HexColorSchema,
  alpha: z.number().min(0).max(1),
});

/** Shadow per elevation level; `[]` means no shadow at that level. */
export const ElevationTokensSchema = z.partialRecord(z.enum(SHADOW_NAMES), z.array(ShadowLayerSchema).max(6));

/** Imported 50–950 scale (opaque; missing steps are generated). */
export const ColorScaleTokensSchema = z.partialRecord(z.enum(SCALE_STEP_KEYS), HexColorSchema);

export const TokenOverridesSchema = z.strictObject({
  color: z
    .strictObject({
      light: z.partialRecord(z.enum(COLOR_ROLE_NAMES), TokenColorSchema).prefault({}),
      dark: z.partialRecord(z.enum(COLOR_ROLE_NAMES), TokenColorSchema).prefault({}),
      /** `accent` is exported as `--color-cta-*`, like @dialmade/palette. */
      scales: z.strictObject({ brand: ColorScaleTokensSchema.optional(), accent: ColorScaleTokensSchema.optional() }).optional(),
    })
    .prefault({}),
  radius: z.strictObject({ sm: Px(64), md: Px(64), lg: Px(96), xl: Px(128) }).partial().prefault({}),
  fontSize: z
    .strictObject({
      display: Px(200),
      h1: Px(160),
      h2: Px(128),
      h3: Px(96),
      body: Px(32).min(10),
      small: Px(24).min(9),
      caption: Px(20).min(8),
    })
    .partial()
    .prefault({}),
  space: z.partialRecord(z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]), Px(256)).prefault({}),
  borderWidth: Px(8).optional(),
  motion: z
    .strictObject({ fast: Ms, base: Ms, slow: Ms, ease: z.string().regex(/^cubic-bezier\([\d.,\s-]+\)$|^[a-z-]+$/) })
    .partial()
    .prefault({}),
  /** Own font families (absent role = the pairing's family) and per-step metrics. */
  typography: TypographyTokensSchema.prefault({}),
  elevation: ElevationTokensSchema.prefault({}),
});

// ── system (per-component overrides on top of the recipe) ───────────────────────

export const ShapeSchema = z.enum(["square", "rounded", "pill"]);
export const SizeSchema = z.enum(["compact", "normal", "roomy"]);

export const SystemSchema = z.strictObject({
  button: z
    .strictObject({
      shape: ShapeSchema,
      weight: z.number().int().min(100).max(900).multipleOf(100),
      shadow: z.boolean(),
    })
    .partial()
    .prefault({}),
  card: z
    .strictObject({ elevation: z.literal([0, 1, 2, 3]), border: z.boolean(), padding: SizeSchema })
    .partial()
    .prefault({}),
  input: z.strictObject({ shape: ShapeSchema }).partial().prefault({}),
  badge: z.strictObject({ shape: ShapeSchema }).partial().prefault({}),
  nav: z.strictObject({ size: SizeSchema }).partial().prefault({}),
  table: z.strictObject({ size: SizeSchema }).partial().prefault({}),
  sidebar: z.strictObject({ width: z.enum(["narrow", "normal", "wide"]) }).partial().prefault({}),
});

// ── references & provenance ─────────────────────────────────────────────────────

export const OwnershipSchema = z.enum(OWNERSHIP_IDS);
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS);

const WebUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2048)
  .refine((url) => !/^[a-z]+:\/\/[^/?#]*@/i.test(url), "URLs cannot carry credentials");

/**
 * Style fingerprint of a reference: attributes, never pixels. `colors` come from pixel extraction
 * (the AI never returns hex); `colorRoles` point into `colors`.
 */
export const FingerprintSchema = z
  .strictObject({
    colors: z.array(HexColorSchema).max(12).optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).optional(),
    notes: z.string().max(500).optional(),
    method: z.enum(FINGERPRINT_METHODS).optional(),
    /** AI model that produced it (`method: "ai"`). */
    model: z.string().min(1).max(80).optional(),
    mode: z.enum(FINGERPRINT_MODES).optional(),
    density: z.enum(FINGERPRINT_DENSITIES).optional(),
    radius: z.enum(FINGERPRINT_RADII).optional(),
    elevation: z.enum(RECIPE_SHADOWS).optional(),
    surface: z.enum(RECIPE_SURFACES).optional(),
    headingClass: z.enum(TYPE_CLASSES).optional(),
    bodyClass: z.enum(TYPE_CLASSES).exclude(["display"]).optional(),
    recipeId: z.string().regex(SLUG).optional(),
    pairingId: z.string().regex(SLUG).optional(),
    layoutId: z.string().regex(SLUG).optional(),
    colorRoles: z
      .array(z.strictObject({ swatchIndex: z.number().int().min(0).max(11), role: z.enum(FINGERPRINT_COLOR_ROLES) }))
      .max(12)
      .optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
  })
  .superRefine((fp, ctx) => {
    if (fp.recipeId && !getStyleRecipe(fp.recipeId)) {
      ctx.addIssue({ code: "custom", message: `Unknown style recipe "${fp.recipeId}"`, path: ["recipeId"] });
    }
    if (fp.pairingId && !getTypographyPairing(fp.pairingId)) {
      ctx.addIssue({ code: "custom", message: `Unknown typography pairing "${fp.pairingId}"`, path: ["pairingId"] });
    }
    fp.colorRoles?.forEach((entry, i) => {
      if (entry.swatchIndex >= (fp.colors?.length ?? 0)) {
        ctx.addIssue({ code: "custom", message: "swatchIndex points past fingerprint.colors", path: ["colorRoles", i, "swatchIndex"] });
      }
    });
  });

/**
 * A visual reference. No bytes and no thumbnails: an upload keeps only its `contentHash`. Links
 * (`url`, `mobbin-link`) need `sourceUrl`; a Mobbin link is a bare card (no hash, origin or fingerprint).
 * Without `ownership` it is treated as third-party.
 */
export const ReferenceSchema = z
  .strictObject({
    id: ElementIdSchema,
    kind: z.enum(REFERENCE_KINDS),
    origin: z.enum(REFERENCE_ORIGINS).optional(),
    ownership: OwnershipSchema.default("third-party"),
    contentHash: Sha256Schema.optional(),
    sourceUrl: WebUrlSchema.optional(),
    label: z.string().max(120).regex(SingleLine, "Label must be a single line").optional(),
    fingerprint: FingerprintSchema.optional(),
    /** What it informs: slugs (`recipe`, `density`) or doc pointers (`/brief/recipeId`). */
    usedFor: z.array(SingleLineText(128)).max(20).default([]).refine(unique, "usedFor entries must be unique"),
  })
  .superRefine((ref, ctx) => {
    if (ref.kind !== "upload" && !ref.sourceUrl) {
      ctx.addIssue({ code: "custom", message: `A ${ref.kind} reference needs sourceUrl`, path: ["sourceUrl"] });
    }
    if (ref.kind !== "upload" && ref.origin) {
      ctx.addIssue({ code: "custom", message: "Only uploads have an origin", path: ["origin"] });
    }
    if (ref.kind === "mobbin-link") {
      for (const key of ["contentHash", "fingerprint"] as const) {
        if (ref[key] !== undefined) ctx.addIssue({ code: "custom", message: `A Mobbin link cannot carry ${key}`, path: [key] });
      }
    }
  });

/** One accepted value: where it lives in the doc (`path`) and where it came from (`locator`). */
export const ImportFieldSchema = z.strictObject({
  path: DocPointerSchema,
  /** `globals.css:12 --primary`, `#/color/brand/500`, `captura 2`. */
  locator: SingleLineText(200),
  confidence: ConfidenceSchema,
  method: z.enum(IMPORT_METHODS),
});

/** One imported file or paste. The file itself is never stored: only its name, size and SHA-256. */
export const ImportRecordSchema = z.strictObject({
  sourceId: ElementIdSchema,
  kind: z.enum(IMPORT_SOURCE_KINDS),
  /** `shadcn-oklch`, `shadcn-hsl`, `tailwind-v4`, `dtcg-2025.10`, `figma-native`, `tokens-studio`… */
  format: z.string().regex(/^[a-z0-9][a-z0-9.+-]{0,63}$/, "Formats are lowercase slugs (max 64)"),
  fileName: SingleLineText(128),
  sha256: Sha256Schema,
  bytes: z.number().int().min(0).max(100 * 1024 * 1024),
  /** Parser and version, e.g. `css@1.0.0`. */
  parser: z.string().regex(/^[a-z0-9][a-z0-9-]*@\d+\.\d+\.\d+$/, "Expected name@x.y.z"),
  ownership: OwnershipSchema,
  /** When the user declared «Es mi marca o tengo permiso de su titular» for the batch. */
  rightsConfirmedAt: z.iso.datetime().optional(),
  fields: z.array(ImportFieldSchema).max(2000).default([]),
  /** Locators of detections the user discarded, so a re-import does not offer them again. */
  dismissed: z.array(SingleLineText(200)).max(2000).default([]).refine(unique, "Dismissed locators must be unique"),
});

export const ProvenanceSchema = z.strictObject({
  engineVersion: z.string().min(1),
  catalogSha: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  createdAt: z.iso.datetime().optional(),
  imports: z.array(ImportRecordSchema).max(100).optional(),
});

// ── pages ──────────────────────────────────────────────────────────────────────

export const ElementSchema = z.strictObject({
  type: z.string().regex(ELEMENT_TYPE, "Element types are namespaced, e.g. 'landing.hero' or 'ui.button'"),
  props: z.record(z.string(), z.unknown()),
  children: z.array(ElementIdSchema),
});

/** A validation problem with its path relative to the checked value. Zod refinements turn them into issues. */
type Issue = { path: (string | number)[]; message: string };

function addIssues(ctx: z.RefinementCtx, issues: readonly Issue[], prefix: readonly (string | number)[] = []) {
  for (const issue of issues) ctx.addIssue({ code: "custom", message: issue.message, path: [...prefix, ...issue.path] });
}

function propsIssues(props: Record<string, unknown>, path: (string | number)[], issues: Issue[]) {
  const bad = findNonJsonValue(props);
  if (bad) {
    issues.push({ message: "Props must be JSON-compatible", path: [...path, ...bad] });
    return;
  }
  const visit = (value: unknown, at: (string | number)[]) => {
    if (looksLikeBinding(value)) {
      if (!isBinding(value)) {
        issues.push({
          message: `Bindings must be exactly { bind: ${BINDABLE_PATHS.map((p) => `"${p}"`).join(" | ")} }`,
          path: at,
        });
      }
      return;
    }
    if (Array.isArray(value)) value.forEach((item, i) => visit(item, [...at, i]));
    else if (isPlainObject(value)) for (const [key, child] of Object.entries(value)) visit(child, [...at, key]);
  };
  for (const [key, value] of Object.entries(props)) visit(value, [...path, key]);
}

type PageShape = {
  kind: OutputKind;
  root: string;
  elements: Record<string, { type: string; props: Record<string, unknown>; children: string[] }>;
  hidden?: string[] | undefined;
  stash?: Record<string, { type: string; props: Record<string, unknown>; pinned?: string[] | undefined }> | undefined;
};

const quoteList = (items: readonly string[]) => {
  const quoted = items.map((item) => `"${item}.*"`);
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}` : (quoted[0] ?? "");
};

/**
 * Tree rules of a page: element namespaces in `namespaces`, JSON props and valid bindings, one parent per
 * element, everything reachable from the root (never a child), `hidden` ids unique, existing and not the root.
 */
function treeIssues(page: PageShape, namespaces: readonly string[], owner: string): Issue[] {
  const issues: Issue[] = [];
  const { elements, root } = page;
  if (!(root in elements)) {
    issues.push({ message: `Root "${root}" is not in elements`, path: ["root"] });
    return issues;
  }
  const parent = new Map<string, string>();
  for (const [id, element] of Object.entries(elements)) {
    const namespace = element.type.split(".")[0]!;
    if (!namespaces.includes(namespace)) {
      issues.push({
        message: `A ${owner} only admits ${quoteList(namespaces)} elements, got "${element.type}"`,
        path: ["elements", id, "type"],
      });
    }
    propsIssues(element.props, ["elements", id, "props"], issues);
    element.children.forEach((child, i) => {
      const at = ["elements", id, "children", i];
      if (!(child in elements)) issues.push({ message: `Unknown child "${child}"`, path: at });
      else if (child === root) issues.push({ message: "The root cannot be a child", path: at });
      else if (parent.has(child)) issues.push({ message: `"${child}" has more than one parent`, path: at });
      else parent.set(child, id);
    });
  }
  const reachable = new Set<string>();
  const stack = [root];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const child of elements[id]?.children ?? []) if (child in elements) stack.push(child);
  }
  for (const id of Object.keys(elements)) {
    if (!reachable.has(id)) issues.push({ message: `"${id}" is not reachable from the root`, path: ["elements", id] });
  }
  const hidden = page.hidden ?? [];
  if (new Set(hidden).size !== hidden.length) issues.push({ message: "Hidden ids must be unique", path: ["hidden"] });
  hidden.forEach((id, i) => {
    if (!(id in elements)) issues.push({ message: `Unknown hidden id "${id}"`, path: ["hidden", i] });
    else if (id === root) issues.push({ message: "The root cannot be hidden", path: ["hidden", i] });
  });
  for (const [id, entry] of Object.entries(page.stash ?? {})) {
    // A retyped block keeps its element (new type) and its previous props (old type) side by side.
    if (id in elements && elements[id]!.type === entry.type) {
      issues.push({ message: `"${id}" has an element of the same type: only blocks without one (or of another type) are stashed`, path: ["stash", id] });
    }
    const namespace = entry.type.split(".")[0]!;
    if (!namespaces.includes(namespace)) {
      issues.push({ message: `A ${owner} only admits ${quoteList(namespaces)} elements, got "${entry.type}"`, path: ["stash", id, "type"] });
    }
    propsIssues(entry.props, ["stash", id, "props"], issues);
  }
  return issues;
}

/** A prop the user edited, as a JSON Pointer relative to the element's props (`/title`, `/items/2/title`). */
const PinnedPointerSchema = z
  .string()
  .max(256)
  .refine((pointer) => pointer.length > 0 && JSON_POINTER.test(pointer), "Pinned props are JSON Pointers relative to props, e.g. /title");

/** `pinned` of a block, a stashed block or an app frame: unique pointers, at most `MAX_PINNED`. */
const PinnedListSchema = z.array(PinnedPointerSchema).max(MAX_PINNED).refine(unique, "Pinned props must be unique");

/**
 * The last props of a block without an element of that type, kept by `buildPageFromLayout` so they come back:
 * a block another block's section absorbed (a media inside a hero) until it is moved back out, a block whose
 * type changed (its old-type props, until the change is undone) and a block a «Generar» removed (until a Layout
 * undo brings it back, at most `MAX_REMOVED_STASH`). Only a removed block carries `pinned`: its layout block is
 * gone, so its pinned props travel with it.
 */
export const StashedElementSchema = z.strictObject({
  type: z.string().regex(ELEMENT_TYPE, "Element types are namespaced, e.g. 'landing.hero' or 'ui.button'"),
  props: z.record(z.string(), z.unknown()),
  pinned: PinnedListSchema.optional(),
});

/** Absorbed and retyped blocks (at most one per block), removed ones and the app frame. */
const STASH_MAX = MAX_BLOCKS + MAX_REMOVED_STASH + 1;

/** The members of a page, without its rules: `PageSchema` adds the v1 rules, `ScreenSchema` the screen-page ones. */
const PageShapeSchema = z.strictObject({
  kind: OutputKindSchema,
  layoutId: z.string().regex(SLUG),
  dials: PartialDialsSchema.optional(),
  root: ElementIdSchema,
  elements: z.record(ElementIdSchema, ElementSchema),
  hidden: z.array(ElementIdSchema).optional(),
  /**
   * Screen pages only: props of absorbed, retyped and removed blocks by block id (`StashedElementSchema`), and
   * of the app frame (`shell`) while the screen has no navigation.
   */
  stash: z
    .record(ElementIdSchema, StashedElementSchema)
    .refine(
      (stash) => Object.keys(stash).length <= STASH_MAX,
      `At most ${STASH_MAX} stashed blocks`,
    )
    .optional(),
});

export const PageSchema = PageShapeSchema.superRefine((page, ctx) => {
  addIssues(ctx, treeIssues(page, [page.kind, "ui"], `${page.kind} page`));
  if (page.kind === "landing" && !getLandingLayout(page.layoutId)) {
    ctx.addIssue({ code: "custom", message: `Unknown landing layout "${page.layoutId}"`, path: ["layoutId"] });
  }
  if (page.stash !== undefined) ctx.addIssue({ code: "custom", message: "Only screen pages keep a stash", path: ["stash"] });
});

export const PagesSchema = z
  .strictObject({
    brand: PageSchema.optional(),
    landing: PageSchema.optional(),
    app: PageSchema.optional(),
  })
  .superRefine((pages, ctx) => {
    for (const kind of OUTPUT_KIND_IDS) {
      const page = pages[kind];
      if (page && page.kind !== kind) {
        ctx.addIssue({ code: "custom", message: `pages.${kind}.kind must be "${kind}", got "${page.kind}"`, path: [kind, "kind"] });
      }
    }
  });

// ── screens (v2, Modo Layout) ─────────────────────────────────────────────────────
// A screen is a page the user drew: its `layout` (the boxes on the 12-column grid, owned by
// @dialmade/layout) and the `page` compiled from it by @dialmade/sections («Generar»). The schema only
// checks types and formats here; the layout's geometry and graph rules are `validateLayout`'s.

/** Text the engine already cleaned (`sanitizeLabel`/`sanitizeNote`): NFC, one line, no invisible characters. */
const isCleanLine = (value: string) => sanitizeLine(value, Number.MAX_SAFE_INTEGER) === value;
const CLEAN_LINE_MESSAGE = "Must be one clean line (NFC, no control or invisible characters, no extra spaces)";

/** `count` bound of blocks that are not repeatable (`LOOSE_COUNT_MAX` in @dialmade/layout). */
const LOOSE_COUNT_MAX = 99;

/** Every block type of the library (ready and soon), in library order. */
export const LibraryBlockTypeSchema = z.enum(LIBRARY.map((def) => def.type) as [LibraryBlockType, ...LibraryBlockType[]]);

/** Rect in grid units. Integers, bounds and the 12-column fit are checked by `validateLayout`. */
const GridRectSchema = z.strictObject({ col: z.number(), row: z.number(), w: z.number(), h: z.number() });

const BlockOverrideSchema = z.strictObject({
  hidden: z.boolean().optional(),
  behavior: z.enum(MOBILE_BEHAVIORS).optional(),
  order: z.number().int().min(0).max(MAX_BLOCKS).optional(),
});

/** Fingerprint of the last «Generar» (critique #3): a regenerate only touches what changed. */
const GeneratedFingerprintSchema = z.strictObject({
  type: LibraryBlockTypeSchema,
  w: z.number().int().min(1).max(DESKTOP_COLUMNS),
  h: z.number().int().min(1).max(MAX_HEIGHT_ROWS),
  count: z.number().int().min(1).max(LOOSE_COUNT_MAX).optional(),
  /** `estimateContent` variant or the section variant `fit` chose (`split`, `week`, `default`…). */
  variant: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/, "Variants are short tokens"),
  /** `hashString(note)` of @dialmade/layout (base36 FNV-1a). */
  noteHash: z.string().regex(/^[0-9a-z]{1,13}$/, "Expected a base36 hash").optional(),
});

export const LayoutBlockSchema = z.strictObject({
  type: LibraryBlockTypeSchema,
  /** Max length (`LABEL_MAX`) is checked by `validateLayout`. */
  label: z.string().min(1).refine(isCleanLine, CLEAN_LINE_MESSAGE),
  /** Data for the copy, never instructions. Max length (`NOTE_MAX`) is checked by `validateLayout`. */
  note: z.string().min(1).refine(isCleanLine, CLEAN_LINE_MESSAGE).optional(),
  count: z.number().optional(),
  rect: GridRectSchema,
  parentId: z.string().optional(),
  z: z.number(),
  hidden: z.boolean().optional(),
  pinned: PinnedListSchema.optional(),
  generated: GeneratedFingerprintSchema.optional(),
  responsive: z.strictObject({ tablet: BlockOverrideSchema.optional(), mobile: BlockOverrideSchema.optional() }).optional(),
  /** Screen this block links to (preview navigation and export). Checked against `screens` by the document. */
  linkTo: ElementIdSchema.optional(),
});

/** `validateLayout` codes the Zod types already report (they would repeat the same problem). */
const ZOD_LAYOUT_CODES: ReadonlySet<LayoutIssueCode> = new Set(["version", "columns", "row-unit", "invalid-id", "unknown-type"]);

/**
 * The boxes of a screen (`LayoutDoc` of @dialmade/layout). Its rules are `validateLayout`'s: ids (no `r-`),
 * rects inside the grid (`MAX_ROW`, `MAX_HEIGHT_ROWS`), parents and cycles, `count`, label/note length
 * (`LABEL_MAX`, `NOTE_MAX`), `z` and `MAX_BLOCKS`. Each issue carries its engine code in `params.layoutCode`.
 */
export const LayoutDocSchema = z
  .strictObject({
    version: z.literal(1),
    columns: z.literal(DESKTOP_COLUMNS),
    rowUnit: z.literal(ROW_UNIT),
    blocks: z.record(ElementIdSchema, LayoutBlockSchema),
  })
  .superRefine((layout, ctx) => {
    for (const issue of validateLayout(layout)) {
      if (ZOD_LAYOUT_CODES.has(issue.code)) continue;
      ctx.addIssue({ code: "custom", message: issue.message, path: issue.path, params: { layoutCode: issue.code } });
    }
  });

/** Navigation frame of an app screen (critique #4). `nav` is shared by every app screen with navigation. */
export const AppShellSchema = z.strictObject({
  nav: z.enum(APP_NAV_IDS),
  /** Page header (title and primary action) above the content. */
  header: z.boolean(),
  activeItem: SingleLineText(64).optional(),
  /** Frame props edited in «Ajustar» (pointers relative to the `app.shell` props): regenerating keeps them. */
  pinned: PinnedListSchema.optional(),
});

/** `/` or `/` + lowercase slug segments (`/precios`, `/app/ajustes-2`), at most `ROUTE_MAX` characters. */
export const RouteSchema = z
  .string()
  .max(ROUTE_MAX)
  .regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/, "Routes are / or /slug segments (a-z, 0-9, -)");

export const ScreenKindSchema = z.enum(SCREEN_KINDS);

/** A screen id: an element id that is not a legacy page key (`brand`, `landing`, `app`). */
export const ScreenIdSchema = ElementIdSchema.refine((id) => !(RESERVED_SCREEN_IDS as readonly string[]).includes(id), {
  message: `Screen ids cannot be ${RESERVED_SCREEN_IDS.map((id) => `"${id}"`).join(", ")}`,
});

/** Namespaces a screen page admits (critique #1): landing and app sections mix freely; brand never. */
const SCREEN_NAMESPACES = ["landing", "app", "ui"] as const;

type ScreenPageShape = PageShape & { layoutId: string };

/** Rules of a screen's page (on top of the page members): kind, root type, `layoutId` and tree. */
function screenPageIssues(page: ScreenPageShape, kind: (typeof SCREEN_KINDS)[number]): Issue[] {
  const issues: Issue[] = [];
  if (page.kind !== kind) issues.push({ message: `A ${kind} screen needs a ${kind} page, got "${page.kind}"`, path: ["kind"] });
  if (page.layoutId !== LAYOUT_PAGE_ID) {
    issues.push({ message: `Screen pages use layoutId "${LAYOUT_PAGE_ID}", got "${page.layoutId}"`, path: ["layoutId"] });
  }
  const root = page.elements[page.root];
  if (root && root.type !== `${kind}.page`) {
    issues.push({ message: `The root of a ${kind} screen page is "${kind}.page", got "${root.type}"`, path: ["elements", page.root, "type"] });
  }
  issues.push(...treeIssues(page, SCREEN_NAMESPACES, "screen page"));
  return issues;
}

/**
 * Issues of `page` as the page of a `kind` screen (members and screen-page rules), formatted like
 * `formatIssues` (`/elements/x/type message`). Empty when valid. For other packages' tests.
 */
export function checkScreenPage(page: unknown, kind: (typeof SCREEN_KINDS)[number]): string[] {
  const format = (path: readonly PropertyKey[], message: string) =>
    `${path.length > 0 ? `/${path.map(String).join("/")}` : "/"} ${message}`;
  const shape = PageShapeSchema.safeParse(page);
  if (!shape.success) return shape.error.issues.map((issue) => format(issue.path, issue.message));
  return screenPageIssues(shape.data, kind).map((issue) => format(issue.path, issue.message));
}

export const ScreenSchema = z
  .strictObject({
    id: ScreenIdSchema,
    name: z.string().min(1).max(LABEL_MAX).refine(isCleanLine, CLEAN_LINE_MESSAGE),
    kind: ScreenKindSchema,
    route: RouteSchema,
    layout: LayoutDocSchema,
    /** Compiled from `layout` by @dialmade/sections. Its own rules replace `PageSchema`'s (no catalog lookup). */
    page: PageShapeSchema,
    /** Navigation frame: an object for app screens (`nav: "none"` for none), `null` for landing screens. */
    shell: AppShellSchema.nullable(),
  })
  .superRefine((screen, ctx) => {
    addIssues(ctx, screenPageIssues(screen.page, screen.kind), ["page"]);
    if (screen.kind === "app" && screen.shell === null) {
      ctx.addIssue({ code: "custom", message: 'An app screen needs a shell (nav "none" for no navigation)', path: ["shell"] });
    } else if (screen.kind === "landing" && screen.shell !== null) {
      ctx.addIssue({ code: "custom", message: "Only app screens have a shell", path: ["shell"] });
    }
  });

type ScreenShape = z.output<typeof ScreenSchema>;
type ScreensDocShape = {
  pages: { landing?: unknown; app?: unknown };
  screens: Record<string, ScreenShape>;
  screenOrder: string[];
};

/**
 * Document rules of the screens: record keys are the ids, `screenOrder` is a permutation of them, routes
 * are unique, block ids are unique across screens (the later screen is reported), links point to existing
 * screens, app screens with navigation share it, and `pages.landing` / `pages.app` are absent once there are
 * screens (one source of truth; `pages.brand` stays).
 */
function screensIssues(doc: ScreensDocShape): Issue[] {
  const issues: Issue[] = [];
  const keys = Object.keys(doc.screens);
  if (keys.length > MAX_SCREENS) issues.push({ message: `At most ${MAX_SCREENS} screens`, path: ["screens"] });
  for (const key of keys) {
    const id = doc.screens[key]?.id;
    if (id !== key) issues.push({ message: `Screen key "${key}" and id "${id}" differ`, path: ["screens", key, "id"] });
  }
  const listed = new Set<string>();
  doc.screenOrder.forEach((id, i) => {
    if (listed.has(id)) issues.push({ message: `"${id}" is twice in screenOrder`, path: ["screenOrder", i] });
    else if (!Object.hasOwn(doc.screens, id)) issues.push({ message: `Unknown screen "${id}"`, path: ["screenOrder", i] });
    listed.add(id);
  });
  for (const key of keys) {
    if (!listed.has(key)) issues.push({ message: `Screen "${key}" is missing from screenOrder`, path: ["screens", key] });
  }
  // Checked in display order, so the later screen is the one reported.
  const ordered = [...new Set([...doc.screenOrder.filter((id) => Object.hasOwn(doc.screens, id)), ...keys])];
  const routes = new Map<string, string>();
  /** Block id → the screen that has it: block ids are element ids of the compiled pages and of the AI pointers. */
  const blockOwners = new Map<string, string>();
  let nav: { id: string; nav: string } | undefined;
  for (const id of ordered) {
    const screen = doc.screens[id]!;
    const owner = routes.get(screen.route);
    if (owner !== undefined) issues.push({ message: `Route "${screen.route}" is already used by "${owner}"`, path: ["screens", id, "route"] });
    else routes.set(screen.route, id);
    if (screen.kind === "app" && screen.shell && screen.shell.nav !== "none") {
      if (!nav) nav = { id, nav: screen.shell.nav };
      else if (screen.shell.nav !== nav.nav) {
        issues.push({
          message: `App screens share their navigation: "${nav.id}" uses "${nav.nav}", got "${screen.shell.nav}"`,
          path: ["screens", id, "shell", "nav"],
        });
      }
    }
    for (const [blockId, block] of Object.entries(screen.layout?.blocks ?? {})) {
      const owner = blockOwners.get(blockId);
      if (owner !== undefined) {
        issues.push({
          message: `Block id "${blockId}" is already used by screen "${owner}": block ids are unique across screens`,
          path: ["screens", id, "layout", "blocks", blockId],
        });
      } else blockOwners.set(blockId, id);
      if (block.linkTo !== undefined && !Object.hasOwn(doc.screens, block.linkTo)) {
        issues.push({ message: `Unknown screen "${block.linkTo}"`, path: ["screens", id, "layout", "blocks", blockId, "linkTo"] });
      }
    }
  }
  if (keys.length > 0 || doc.screenOrder.length > 0) {
    for (const kind of ["landing", "app"] as const) {
      if (doc.pages[kind] !== undefined) {
        issues.push({ message: `pages.${kind} must be absent when the document has screens`, path: ["pages", kind] });
      }
    }
  }
  return issues;
}

/**
 * Rules of `screenStash` (screens a «Generar» removed): record keys are the ids, at most `MAX_STASHED_SCREENS`,
 * and never a screen the document still has (bringing one back takes it out of the stash in the same write).
 * The document rules of the screens (routes, links, shared navigation) do not apply: nothing renders them.
 */
function screenStashIssues(doc: { screens: Record<string, unknown>; screenStash?: Record<string, ScreenShape> | undefined }): Issue[] {
  const issues: Issue[] = [];
  const stash = doc.screenStash ?? {};
  const keys = Object.keys(stash);
  if (keys.length > MAX_STASHED_SCREENS) issues.push({ message: `At most ${MAX_STASHED_SCREENS} stashed screens`, path: ["screenStash"] });
  for (const key of keys) {
    const id = stash[key]?.id;
    if (id !== key) issues.push({ message: `Stashed screen key "${key}" and id "${id}" differ`, path: ["screenStash", key, "id"] });
    if (Object.hasOwn(doc.screens, key)) issues.push({ message: `"${key}" is a screen of the document: it cannot be stashed too`, path: ["screenStash", key] });
  }
  return issues;
}

/**
 * Cheap bounds checked before the full parse (`safeParseDesignDoc`, `applyPatch`): more than `MAX_SCREENS`
 * screens (or `screenOrder` entries), or a layout with more than `MAX_BLOCKS` blocks, is rejected without
 * validating a single screen, so an oversized document never pays for the whole parse. Same paths and
 * messages as the full parse (the blocks issue keeps its engine code in `params.layoutCode`). Empty when the
 * input is within bounds or is not shaped like a document (the parse reports that).
 */
export function documentSizeIssues(input: unknown): z.core.$ZodIssue[] {
  if (!isPlainObject(input)) return [];
  const issues: z.core.$ZodIssue[] = [];
  const custom = (path: PropertyKey[], message: string, params?: Record<string, unknown>): z.core.$ZodIssue => ({
    code: "custom",
    path,
    message,
    input: undefined,
    ...(params && { params }),
  });
  const { screens, screenOrder, screenStash } = input;
  if (Array.isArray(screenOrder) && screenOrder.length > MAX_SCREENS) issues.push(custom(["screenOrder"], `At most ${MAX_SCREENS} screens`));
  if (isPlainObject(screenStash)) {
    const keys = Object.keys(screenStash);
    if (keys.length > MAX_STASHED_SCREENS) issues.push(custom(["screenStash"], `At most ${MAX_STASHED_SCREENS} stashed screens`));
    else {
      for (const key of keys) {
        const screen = screenStash[key];
        const blocks = isPlainObject(screen) && isPlainObject(screen.layout) ? screen.layout.blocks : undefined;
        if (isPlainObject(blocks) && Object.keys(blocks).length > MAX_BLOCKS) {
          issues.push(custom(["screenStash", key, "layout", "blocks"], `At most ${MAX_BLOCKS} blocks`, { layoutCode: "too-many-blocks" }));
        }
      }
    }
  }
  if (isPlainObject(screens)) {
    const keys = Object.keys(screens);
    if (keys.length > MAX_SCREENS) issues.push(custom(["screens"], `At most ${MAX_SCREENS} screens`));
    else {
      for (const key of keys) {
        const screen = screens[key];
        const blocks = isPlainObject(screen) && isPlainObject(screen.layout) ? screen.layout.blocks : undefined;
        if (isPlainObject(blocks) && Object.keys(blocks).length > MAX_BLOCKS) {
          issues.push(custom(["screens", key, "layout", "blocks"], `At most ${MAX_BLOCKS} blocks`, { layoutCode: "too-many-blocks" }));
        }
      }
    }
  }
  return issues;
}

// ── document ───────────────────────────────────────────────────────────────────

type ImportShape = { sourceId: string; ownership: string; fields: { path: string }[] };

/** Unique source ids; third-party sources only bring attributes (no colors, font families or brand). */
function checkImports(imports: readonly ImportShape[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  imports.forEach((record, i) => {
    if (seen.has(record.sourceId)) {
      ctx.addIssue({ code: "custom", message: `Duplicate import sourceId "${record.sourceId}"`, path: ["provenance", "imports", i, "sourceId"] });
    }
    seen.add(record.sourceId);
    if (record.ownership !== "third-party") return;
    record.fields.forEach((field, j) => {
      const forbidden = THIRD_PARTY_FORBIDDEN_POINTERS.find((root) => coversPointer(root, field.path) || coversPointer(field.path, root));
      if (forbidden) {
        ctx.addIssue({
          code: "custom",
          message: `A third-party import cannot set ${forbidden} (only attributes)`,
          path: ["provenance", "imports", i, "fields", j, "path"],
        });
      }
    });
  });
}

export const DesignDocSchema = z
  .strictObject({
    version: z.literal(DESIGN_DOC_VERSION),
    brand: BrandSchema,
    brief: BriefSchema,
    tokens: TokenOverridesSchema.prefault({}),
    system: SystemSchema.prefault({}),
    references: z
      .array(ReferenceSchema)
      .max(50)
      .default([])
      .refine((refs) => new Set(refs.map((r) => r.id)).size === refs.length, "Reference ids must be unique"),
    provenance: ProvenanceSchema,
    pages: PagesSchema.prefault({}),
    /** Screens of Modo Layout, by id. Their order is `screenOrder`. */
    screens: z.record(ElementIdSchema, ScreenSchema).prefault({}),
    screenOrder: z.array(ElementIdSchema).max(MAX_SCREENS).default([]),
    /**
     * Screens a «Generar» removed, by id, oldest first (at most `MAX_STASHED_SCREENS`): when a Layout undo
     * brings one back, the next «Generar» rebuilds it from its last page and pins (critique: never lose edits).
     * Never rendered, exported or sent to the AI.
     */
    screenStash: z.record(ElementIdSchema, ScreenSchema).optional(),
  })
  .superRefine((doc, ctx) => {
    checkImports(doc.provenance.imports ?? [], ctx);
    addIssues(ctx, screensIssues(doc));
    addIssues(ctx, screenStashIssues(doc));
    const { productType, recipeId, pairingId } = doc.brief;
    if (productType !== GENERIC_PRODUCT_ID && !getProductType(productType)) {
      ctx.addIssue({ code: "custom", message: `Unknown product type "${productType}"`, path: ["brief", "productType"] });
    }
    if (!getStyleRecipe(recipeId)) {
      ctx.addIssue({ code: "custom", message: `Unknown style recipe "${recipeId}"`, path: ["brief", "recipeId"] });
    }
    if (!getTypographyPairing(pairingId)) {
      ctx.addIssue({ code: "custom", message: `Unknown typography pairing "${pairingId}"`, path: ["brief", "pairingId"] });
    }
  });

export type HexColor = z.output<typeof HexColorSchema>;
export type Dials = z.output<typeof DialsSchema>;
export type DialKey = (typeof DIAL_KEYS)[number];
export type LockKey = z.output<typeof LockKeySchema>;
export type LockPointer = z.output<typeof LockPointerSchema>;
/** A lock in `brief.locks`: a JSON Pointer (hard) or a legacy key (soft). */
export type Lock = z.output<typeof LockSchema>;
export type TokenColor = z.output<typeof TokenColorSchema>;
export type ColorScaleTokens = z.output<typeof ColorScaleTokensSchema>;
export type FontFamilyTokenValue = z.output<typeof FontFamilyTokenSchema>;
export type TypeStep = z.output<typeof TypeStepSchema>;
export type TypographyTokens = z.output<typeof TypographyTokensSchema>;
export type ShadowLayerToken = z.output<typeof ShadowLayerSchema>;
export type ElevationTokens = z.output<typeof ElevationTokensSchema>;
export type Ownership = z.output<typeof OwnershipSchema>;
export type Confidence = z.output<typeof ConfidenceSchema>;
export type Fingerprint = z.output<typeof FingerprintSchema>;
export type ReferenceInput = z.input<typeof ReferenceSchema>;
export type ImportField = z.output<typeof ImportFieldSchema>;
export type ImportRecord = z.output<typeof ImportRecordSchema>;
export type ImportRecordInput = z.input<typeof ImportRecordSchema>;
export type ProvenanceInput = z.input<typeof ProvenanceSchema>;
export type Brand = z.output<typeof BrandSchema>;
export type Brief = z.output<typeof BriefSchema>;
export type TokenOverrides = z.output<typeof TokenOverridesSchema>;
export type ComponentShape = z.output<typeof ShapeSchema>;
export type ComponentSize = z.output<typeof SizeSchema>;
export type DesignSystem = z.output<typeof SystemSchema>;
export type Reference = z.output<typeof ReferenceSchema>;
export type Provenance = z.output<typeof ProvenanceSchema>;
export type PageElement = z.output<typeof ElementSchema>;
/** An absorbed block's props in `page.stash` (screen pages). */
export type StashedElement = z.output<typeof StashedElementSchema>;
export type Page = z.output<typeof PageSchema>;
export type Pages = z.output<typeof PagesSchema>;
export type DesignDoc = z.output<typeof DesignDocSchema>;
export type DesignDocInput = z.input<typeof DesignDocSchema>;
export type PageInput = z.input<typeof PageSchema>;
export type ScreenId = string;
export type ScreenKind = z.output<typeof ScreenKindSchema>;
/** The boxes of a screen: the same type as `LayoutDoc` in @dialmade/layout. */
export type ScreenLayout = z.output<typeof LayoutDocSchema>;
/** One box of a screen layout: the same type as `LayoutBlock` in @dialmade/layout. */
export type ScreenLayoutBlock = z.output<typeof LayoutBlockSchema>;
/** Navigation frame of an app screen: the same type as `AppShell` in @dialmade/layout. */
export type ScreenShell = z.output<typeof AppShellSchema>;
export type Screen = z.output<typeof ScreenSchema>;
export type ScreenInput = z.input<typeof ScreenSchema>;
export type Route = z.output<typeof RouteSchema>;

// The doc types are the engine types, member for member (screen.layout goes straight to toCss & co.): a
// field added on one side and not on the other fails to compile.
type Identical<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const layoutMatchesEngine: Identical<ScreenLayout, EngineLayoutDoc> = true;
const blockMatchesEngine: Identical<ScreenLayoutBlock, EngineLayoutBlock> = true;
const shellMatchesEngine: Identical<ScreenShell, EngineAppShell> = true;
void layoutMatchesEngine;
void blockMatchesEngine;
void shellMatchesEngine;
