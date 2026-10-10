import {
  GENERIC_PRODUCT_ID,
  getLandingLayout,
  getProductType,
  getStyleRecipe,
  getTypographyPairing,
  type OutputKind,
  type StyleRecipe,
} from "@dialmade/catalog";
import { PALETTE_STYLE_IDS, ROLE_KEYS, SCALE_STEPS, cssVarName, type PaletteStyleId } from "@dialmade/palette";
import { z } from "zod";
import { looksLikeBinding, isBinding } from "./bindings";
import {
  BINDABLE_PATHS,
  CONFIDENCE_LEVELS,
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
  LOCALE_IDS,
  LOCK_KEYS,
  MOTION_TIER_IDS,
  OUTPUT_KIND_IDS,
  OWNERSHIP_IDS,
  POINTER_ROOTS,
  RECIPE_SHADOWS,
  RECIPE_SURFACES,
  REFERENCE_KINDS,
  REFERENCE_ORIGINS,
  SHADOW_NAMES,
  THIRD_PARTY_FORBIDDEN_POINTERS,
  TYPE_CLASSES,
} from "./constants";
import { findNonJsonValue, isPlainObject } from "./json";
import { coversPointer, isJsonPointer, pointerSegments } from "./pointer";

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const kindsMatchCatalog: Equals<(typeof OUTPUT_KIND_IDS)[number], OutputKind> = true;
const shadowsMatchCatalog: Equals<(typeof RECIPE_SHADOWS)[number], StyleRecipe["shadow"]> = true;
const surfacesMatchCatalog: Equals<(typeof RECIPE_SURFACES)[number], StyleRecipe["surface"]> = true;
void kindsMatchCatalog;
void shadowsMatchCatalog;
void surfacesMatchCatalog;

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

function checkProps(props: Record<string, unknown>, path: (string | number)[], ctx: z.RefinementCtx) {
  const bad = findNonJsonValue(props);
  if (bad) {
    ctx.addIssue({ code: "custom", message: "Props must be JSON-compatible", path: [...path, ...bad] });
    return;
  }
  const visit = (value: unknown, at: (string | number)[]) => {
    if (looksLikeBinding(value)) {
      if (!isBinding(value)) {
        ctx.addIssue({
          code: "custom",
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
};

function checkTree(page: PageShape, ctx: z.RefinementCtx) {
  const { elements, root } = page;
  if (!(root in elements)) {
    ctx.addIssue({ code: "custom", message: `Root "${root}" is not in elements`, path: ["root"] });
    return;
  }
  const parent = new Map<string, string>();
  for (const [id, element] of Object.entries(elements)) {
    const namespace = element.type.split(".")[0];
    if (namespace !== page.kind && namespace !== "ui") {
      ctx.addIssue({
        code: "custom",
        message: `A ${page.kind} page only admits "${page.kind}.*" and "ui.*" elements, got "${element.type}"`,
        path: ["elements", id, "type"],
      });
    }
    checkProps(element.props, ["elements", id, "props"], ctx);
    element.children.forEach((child, i) => {
      const at = ["elements", id, "children", i];
      if (!(child in elements)) ctx.addIssue({ code: "custom", message: `Unknown child "${child}"`, path: at });
      else if (child === root) ctx.addIssue({ code: "custom", message: "The root cannot be a child", path: at });
      else if (parent.has(child)) ctx.addIssue({ code: "custom", message: `"${child}" has more than one parent`, path: at });
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
    if (!reachable.has(id)) {
      ctx.addIssue({ code: "custom", message: `"${id}" is not reachable from the root`, path: ["elements", id] });
    }
  }
  const hidden = page.hidden ?? [];
  if (new Set(hidden).size !== hidden.length) ctx.addIssue({ code: "custom", message: "Hidden ids must be unique", path: ["hidden"] });
  hidden.forEach((id, i) => {
    if (!(id in elements)) ctx.addIssue({ code: "custom", message: `Unknown hidden id "${id}"`, path: ["hidden", i] });
    else if (id === root) ctx.addIssue({ code: "custom", message: "The root cannot be hidden", path: ["hidden", i] });
  });
}

export const PageSchema = z
  .strictObject({
    kind: OutputKindSchema,
    layoutId: z.string().regex(SLUG),
    dials: PartialDialsSchema.optional(),
    root: ElementIdSchema,
    elements: z.record(ElementIdSchema, ElementSchema),
    hidden: z.array(ElementIdSchema).optional(),
  })
  .superRefine((page, ctx) => {
    checkTree(page, ctx);
    if (page.kind === "landing" && !getLandingLayout(page.layoutId)) {
      ctx.addIssue({ code: "custom", message: `Unknown landing layout "${page.layoutId}"`, path: ["layoutId"] });
    }
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
    version: z.literal(1),
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
  })
  .superRefine((doc, ctx) => {
    checkImports(doc.provenance.imports ?? [], ctx);
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
export type Page = z.output<typeof PageSchema>;
export type Pages = z.output<typeof PagesSchema>;
export type DesignDoc = z.output<typeof DesignDocSchema>;
export type DesignDocInput = z.input<typeof DesignDocSchema>;
export type PageInput = z.input<typeof PageSchema>;
