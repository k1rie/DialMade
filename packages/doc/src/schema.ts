import {
  GENERIC_PRODUCT_ID,
  getLandingLayout,
  getProductType,
  getStyleRecipe,
  getTypographyPairing,
  type OutputKind,
} from "@dialmade/catalog";
import { PALETTE_STYLE_IDS, ROLE_KEYS, cssVarName, type PaletteStyleId } from "@dialmade/palette";
import { z } from "zod";
import { looksLikeBinding, isBinding } from "./bindings";
import {
  BINDABLE_PATHS,
  DIAL_KEYS,
  LOCALE_IDS,
  LOCK_KEYS,
  MOTION_TIER_IDS,
  OUTPUT_KIND_IDS,
} from "./constants";
import { findNonJsonValue, isPlainObject } from "./json";

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const kindsMatchCatalog: Equals<(typeof OUTPUT_KIND_IDS)[number], OutputKind> = true;
void kindsMatchCatalog;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ELEMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ELEMENT_TYPE = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/;

export const COLOR_ROLE_NAMES = ROLE_KEYS.map(cssVarName) as [string, ...string[]];

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb color");
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

// ── brief ──────────────────────────────────────────────────────────────────────

export const LockKeySchema = z.enum(LOCK_KEYS);

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
    .array(LockKeySchema)
    .default([])
    .refine((locks) => new Set(locks).size === locks.length, "Locks must be unique"),
});

// ── tokens ─────────────────────────────────────────────────────────────────────
// Only explicit user overrides are stored. Everything else (colors from the seeds and palette style,
// type scale, radii, spacing, shadows, durations, component tokens) is recomputed by `resolveTokens`
// from brand + brief + recipe + dials, so it never goes stale. Overrides win over the dials.

const Px = (max: number) => z.number().min(0).max(max);
const Ms = z.number().int().min(0).max(5000);

export const TokenOverridesSchema = z.strictObject({
  color: z
    .strictObject({
      light: z.partialRecord(z.enum(COLOR_ROLE_NAMES), HexColorSchema).prefault({}),
      dark: z.partialRecord(z.enum(COLOR_ROLE_NAMES), HexColorSchema).prefault({}),
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

export const ReferenceSchema = z.strictObject({
  id: ElementIdSchema,
  kind: z.enum(["upload", "url", "mobbin-link"]),
  sourceUrl: z.url({ protocol: /^https?$/ }).optional(),
  label: z.string().max(120).optional(),
  fingerprint: z
    .strictObject({
      colors: z.array(HexColorSchema).max(12).optional(),
      tags: z.array(z.string().min(1).max(40)).max(20).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
});

export const ProvenanceSchema = z.strictObject({
  engineVersion: z.string().min(1),
  catalogSha: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  createdAt: z.iso.datetime().optional(),
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
