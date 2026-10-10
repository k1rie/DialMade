import {
  GENERIC_PRODUCT_ID,
  defaultLandingLayout,
  defaultsFor,
  getLandingLayout,
  type Locale,
  type OutputKind,
} from "@dialmade/catalog";
import { ENGINE_VERSION, generateTheme, parseColor, type PaletteStyleId } from "@dialmade/palette";
import type { z } from "zod";
import {
  DEFAULT_DIALS,
  DEFAULT_LAYOUT_IDS,
  DEFAULT_PAGE_SECTIONS,
  DESIGN_DOC_VERSION,
  PAGE_DIAL_DEFAULTS,
  ROOT_ELEMENT_ID,
} from "./constants";
import { cloneJson } from "./json";
import {
  DesignDocSchema,
  PagesSchema,
  type DesignDoc,
  type DesignDocInput,
  type Dials,
  type LockKey,
  type Page,
  type PageElement,
  type Provenance,
  type Reference,
} from "./schema";

export class DesignDocError extends Error {
  override readonly name = "DesignDocError";

  constructor(
    message: string,
    readonly issues: readonly z.core.$ZodIssue[] = [],
  ) {
    super(issues.length > 0 ? `${message}: ${formatIssues(issues)}` : message);
  }
}

export function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.length > 0 ? `/${issue.path.join("/")}` : "/"} ${issue.message}`).join("; ");
}

export type SafeParseResult = { success: true; data: DesignDoc } | { success: false; issues: z.core.$ZodIssue[] };

export function safeParseDesignDoc(input: unknown): SafeParseResult {
  const result = DesignDocSchema.safeParse(input);
  return result.success ? { success: true, data: result.data } : { success: false, issues: result.error.issues };
}

/** Validates (and fills defaults of) a stored document. Throws `DesignDocError`. */
export function parseDesignDoc(input: unknown): DesignDoc {
  const result = safeParseDesignDoc(input);
  if (!result.success) throw new DesignDocError("Invalid DesignDoc", result.issues);
  return result.data;
}

function normalizeHex(input: string, label: string): string {
  const hex = parseColor(input);
  if (!hex) throw new DesignDocError(`Invalid ${label} color "${input}"`);
  return hex;
}

export interface CreateDesignDocInput {
  brand: {
    name: string;
    tagline?: string;
    logoRef?: string;
    /** Any CSS color; stored as `#rrggbb`. */
    seeds: { primary: string; secondary?: string };
    /** Defaults to what @dialmade/palette detects for the primary seed. */
    achromatic?: boolean;
  };
  brief?: {
    productType?: string;
    focus?: OutputKind;
    locale?: Locale;
    paletteStyleId?: PaletteStyleId;
    recipeId?: string;
    pairingId?: string;
    motionTier?: "subtle" | "standard" | "expressive";
    dials?: Partial<Dials>;
    locks?: LockKey[];
  };
  tokens?: DesignDocInput["tokens"];
  system?: DesignDocInput["system"];
  references?: Reference[];
  provenance?: Partial<Provenance>;
  /** Pages to start with. Each `pages[k].kind` must be `k`. */
  pages?: Partial<Record<OutputKind, Page>>;
}

/**
 * Builds a valid DesignDoc v1. Missing choices come from `@dialmade/catalog` defaults for the product
 * type (`"generic"` when none): recipe, pairing and motion tier. Throws `DesignDocError`.
 */
export function createDesignDoc(input: CreateDesignDocInput): DesignDoc {
  const primary = normalizeHex(input.brand.seeds.primary, "primary");
  const secondary = input.brand.seeds.secondary === undefined ? undefined : normalizeHex(input.brand.seeds.secondary, "secondary");
  const brief = input.brief ?? {};
  const productType = brief.productType ?? GENERIC_PRODUCT_ID;
  const defaults = defaultsFor(productType);

  const draft: DesignDocInput = {
    version: DESIGN_DOC_VERSION,
    brand: {
      name: input.brand.name,
      ...(input.brand.tagline !== undefined && { tagline: input.brand.tagline }),
      ...(input.brand.logoRef !== undefined && { logoRef: input.brand.logoRef }),
      seeds: secondary ? { primary, secondary } : { primary },
      achromatic: input.brand.achromatic ?? generateTheme({ primary }).achromatic,
    },
    brief: {
      productType,
      focus: brief.focus ?? "brand",
      locale: brief.locale ?? "es",
      paletteStyleId: brief.paletteStyleId ?? "brand",
      recipeId: brief.recipeId ?? defaults.recipe.id,
      pairingId: brief.pairingId ?? defaults.pairing.id,
      motionTier: brief.motionTier ?? defaults.motion.id,
      dials: { ...DEFAULT_DIALS, ...brief.dials },
      locks: brief.locks ?? [],
    },
    tokens: input.tokens ?? {},
    system: input.system ?? {},
    references: input.references ?? [],
    provenance: { engineVersion: ENGINE_VERSION, ...input.provenance },
    pages: input.pages ?? {},
  };
  return parseDesignDoc(cloneJson(draft));
}

/** A section to create: a type, or a spec with optional id, props and (for containers) children. */
export type PageSectionInput =
  | string
  | { type: string; id?: string; props?: Record<string, unknown>; children?: readonly PageSectionInput[] };

export interface CreatePageOptions {
  layoutId?: string;
  /** Children of the root, in order. Defaults to the layout's sections (landing) or DEFAULT_PAGE_SECTIONS. */
  sections?: readonly PageSectionInput[];
  dials?: Partial<Dials>;
  /** Used to pick the default landing layout. */
  productType?: string;
}

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** `"landing.socialProof"` → `"social-proof"`. */
export function elementIdBase(type: string): string {
  return kebab(type.split(".").slice(1).join("-"));
}

export function defaultLayoutId(kind: OutputKind, productType: string = GENERIC_PRODUCT_ID): string {
  return kind === "landing" ? defaultLandingLayout(productType).id : DEFAULT_LAYOUT_IDS[kind];
}

/**
 * A page skeleton: a `${kind}.page` root whose children are the sections, with ids like `hero-1`
 * (the App page nests its widgets inside `app.shell`). Props start empty so each section renders its
 * own defaults. Low level: the app creates pages with `addDefaultPage` from @dialmade/sections, which
 * builds the same tree with each section's default props and variants. Throws `DesignDocError`.
 */
export function createPage(kind: OutputKind, options: CreatePageOptions = {}): Page {
  const layoutId = options.layoutId ?? defaultLayoutId(kind, options.productType);
  const sections =
    options.sections ??
    (kind === "landing" ? (getLandingLayout(layoutId)?.sections ?? []) : DEFAULT_PAGE_SECTIONS[kind]);

  const elements: Record<string, PageElement> = {};
  const counts = new Map<string, number>();
  const add = (section: PageSectionInput): string => {
    const spec = typeof section === "string" ? { type: section } : section;
    let id = spec.id;
    if (!id) {
      const base = elementIdBase(spec.type);
      let n = counts.get(base) ?? 0;
      do {
        n += 1;
        id = `${base}-${n}`;
      } while (id in elements);
      counts.set(base, n);
    }
    if (id in elements || id === ROOT_ELEMENT_ID) throw new DesignDocError(`Duplicate element id "${id}"`);
    const element: PageElement = { type: spec.type, props: cloneJson(spec.props ?? {}), children: [] };
    elements[id] = element;
    element.children = (spec.children ?? []).map(add);
    return id;
  };
  const children = sections.map(add);

  const dials = { ...PAGE_DIAL_DEFAULTS[kind], ...options.dials };
  const page = {
    kind,
    layoutId,
    ...(Object.keys(dials).length > 0 && { dials }),
    root: ROOT_ELEMENT_ID,
    elements: { [ROOT_ELEMENT_ID]: { type: `${kind}.page`, props: {}, children }, ...elements },
  };
  const parsed = PagesSchema.safeParse({ [kind]: page });
  if (!parsed.success) throw new DesignDocError(`Invalid ${kind} page`, parsed.error.issues);
  return parsed.data[kind]!;
}

/**
 * Returns a new document with `pages[kind]`. Without `page`, a default skeleton is created
 * (landing layout chosen from the product type). Throws when the page exists (unless `replace`)
 * or when `page.kind !== kind`.
 */
export function addPage(doc: DesignDoc, kind: OutputKind, page?: Page, options: { replace?: boolean } = {}): DesignDoc {
  if (page && page.kind !== kind) throw new DesignDocError(`Page kind "${page.kind}" does not match "${kind}"`);
  if (doc.pages[kind] && !options.replace) throw new DesignDocError(`The ${kind} page already exists`);
  const next = cloneJson(doc);
  next.pages[kind] = cloneJson(page ?? createPage(kind, { productType: doc.brief.productType }));
  return parseDesignDoc(next);
}

/** Global dials with the page's own overrides (e.g. the App page's density) on top. */
export function effectiveDials(doc: DesignDoc, kind?: OutputKind): Dials {
  return { ...doc.brief.dials, ...(kind ? doc.pages[kind]?.dials : undefined) };
}
