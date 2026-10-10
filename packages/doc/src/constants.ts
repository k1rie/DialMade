import type { OutputKind } from "@dialmade/catalog";

/**
 * v2 adds `screens` + `screenOrder` (Modo Layout) beside `pages`. A v1 document migrates by bumping the
 * version (`migrateDesignDoc`): no data moves.
 */
export const DESIGN_DOC_VERSION = 2;

export const OUTPUT_KIND_IDS = ["brand", "landing", "app"] as const satisfies readonly OutputKind[];

export const LOCALE_IDS = ["es", "en"] as const;

export const MOTION_TIER_IDS = ["subtle", "standard", "expressive"] as const;

export const DIAL_KEYS = ["variance", "motion", "density"] as const;

/** Choices the user can pin so «Recomiéndame», shuffles or the AI never change them. */
export const LOCK_KEYS = [
  "seeds",
  "paletteStyleId",
  "recipeId",
  "pairingId",
  "motionTier",
  "dials.variance",
  "dials.motion",
  "dials.density",
] as const;

/**
 * The JSON Pointer each legacy lock key stands for. Legacy keys stay valid in `brief.locks` as soft
 * locks: `isLocked` honors them, `applyPatch` does not enforce them (only pointer locks are hard).
 */
export const LEGACY_LOCK_POINTERS = {
  seeds: "/brand/seeds",
  paletteStyleId: "/brief/paletteStyleId",
  recipeId: "/brief/recipeId",
  pairingId: "/brief/pairingId",
  motionTier: "/brief/motionTier",
  "dials.variance": "/brief/dials/variance",
  "dials.motion": "/brief/dials/motion",
  "dials.density": "/brief/dials/density",
} as const satisfies Record<(typeof LOCK_KEYS)[number], `/${string}`>;

/** Top-level members of the DesignDoc a lock or an import field may point into. */
export const POINTER_ROOTS = ["brand", "brief", "tokens", "system", "references", "pages", "screens"] as const;

/** Where a third-party import may not write: colors, font families and the brand itself (only attributes). */
export const THIRD_PARTY_FORBIDDEN_POINTERS = [
  "/brand",
  "/tokens/color",
  "/tokens/typography/heading",
  "/tokens/typography/body",
  "/tokens/typography/mono",
] as const;

export const OWNERSHIP_IDS = ["own", "third-party"] as const;

export const REFERENCE_KINDS = ["upload", "url", "mobbin-link"] as const;
export const REFERENCE_ORIGINS = ["screenshot", "pdf-page"] as const;

/** Kinds of import source. The last six arrive after v1. */
export const IMPORT_SOURCE_KINDS = [
  "paste",
  "css",
  "tokens",
  "design-md",
  "screenshot",
  "font-name",
  "tailwind-config",
  "scss",
  "palette-file",
  "pdf",
  "font-file",
  "url",
] as const;

export const CONFIDENCE_LEVELS = ["exact", "high", "medium", "low"] as const;

/** How an imported value was obtained; `edited` = the user changed it in the review. */
export const IMPORT_METHODS = ["declared", "named", "pixel", "pdf-text", "ai", "edited"] as const;

export const FONT_SOURCES = ["google", "system", "local", "unknown"] as const;

export const FINGERPRINT_METHODS = ["pixel", "ai", "manual"] as const;
export const FINGERPRINT_MODES = ["light", "dark", "mixed"] as const;
export const FINGERPRINT_DENSITIES = ["airy", "balanced", "compact"] as const;
export const FINGERPRINT_RADII = ["none", "sm", "md", "lg", "full"] as const;
export const RECIPE_SHADOWS = ["none", "soft", "crisp", "deep", "glow"] as const;
export const RECIPE_SURFACES = ["flat", "layered", "glass", "outlined"] as const;
export const TYPE_CLASSES = ["geometric", "grotesque", "humanist", "serif", "slab", "mono", "display"] as const;
export const FINGERPRINT_COLOR_ROLES = ["background", "foreground", "primary", "secondary", "cta", "muted", "border", "other"] as const;

export const FONT_SIZE_NAMES = ["display", "h1", "h2", "h3", "body", "small", "caption"] as const;
export const RADIUS_NAMES = ["sm", "md", "lg", "xl", "full"] as const;
export const SHADOW_NAMES = ["sm", "md", "lg"] as const;

export const BINDABLE_PATHS = ["brand.name", "brand.tagline"] as const;

export const DEFAULT_DIALS = { variance: 5, motion: 5, density: 5 } as const;

/** Page-level dial defaults: the App page is born denser than the rest. */
export const PAGE_DIAL_DEFAULTS: Readonly<Record<OutputKind, { density?: number }>> = {
  brand: {},
  landing: {},
  app: { density: 7 },
};

export const ROOT_ELEMENT_ID = "root";

/** Landing layouts come from @dialmade/catalog; brand and app have a single layout for now. */
export const DEFAULT_LAYOUT_IDS: Readonly<Record<Exclude<OutputKind, "landing">, string>> = {
  brand: "brand-board",
  app: "app-dashboard",
};

/** A section of a default page tree; `children` only for containers. */
export interface DefaultSectionSpec {
  readonly type: string;
  readonly children?: readonly DefaultSectionSpec[];
}

/** Container of the App page: sidebar + topbar around the widgets. */
export const APP_SHELL_TYPE = "app.shell";

/** Widgets inside `app.shell`, in order: the example screen, then the UI kit. Single source for doc and sections. */
export const APP_SHELL_WIDGETS: readonly string[] = [
  "app.kpiRow",
  "app.chartCard",
  "app.activity",
  "app.dataTable",
  "app.componentGallery",
];

/** Default section tree for a new page. Landing sections come from the chosen landing layout. */
export const DEFAULT_PAGE_SECTIONS: {
  readonly brand: readonly string[];
  readonly app: readonly DefaultSectionSpec[];
} = {
  brand: [
    "brand.cover",
    "brand.identity",
    "brand.palette",
    "brand.type",
    "brand.shape",
    "brand.components",
    "brand.artDirection",
  ],
  app: [{ type: APP_SHELL_TYPE, children: APP_SHELL_WIDGETS.map((type) => ({ type })) }],
};

/** File names used by the export pack (and referenced by the prompt packs). */
export const EXPORT_FILES = {
  themeCss: "theme.css",
  dtcg: "tokens.tokens.json",
  figmaLight: "figma-light.tokens.json",
  figmaDark: "figma-dark.tokens.json",
  figmaNumbers: "figma-numbers.tokens.json",
  designMd: "DESIGN.md",
} as const;

/**
 * Files the code pack writes next to each screen's `index.html` (Modo Layout), referenced by DESIGN.md and
 * the prompt packs' file list when the document has screens. Apart from `EXPORT_FILES` because they repeat
 * per screen and only exist in documents with screens.
 */
export const SCREEN_EXPORT_FILES = {
  layoutCss: "layout.css",
  layoutJson: "layout.json",
} as const;

// ── screens (DesignDoc v2, Modo Layout) ──────────────────────────────────────────

/** Kinds of a screen. The template sets it; it is never inferred from the blocks. */
export const SCREEN_KINDS = ["landing", "app"] as const satisfies readonly OutputKind[];

/** Most screens per document (bounds validation cost and the AI copy request size). */
export const MAX_SCREENS = 24;

/** `page.layoutId` of every screen page: the page comes from the screen's own layout («Layout propio»). */
export const LAYOUT_PAGE_ID = "custom";

/** Screen ids that would be ambiguous next to the legacy page keys (`PageKey` = "brand" | ScreenId). */
export const RESERVED_SCREEN_IDS = ["brand", "landing", "app"] as const;

/** Longest screen route, in characters. */
export const ROUTE_MAX = 96;

/** Navigation frame of an app screen (`AppShell.nav`). */
export const APP_NAV_IDS = ["sidebar", "rail", "topnav", "none"] as const;
export type AppNavId = (typeof APP_NAV_IDS)[number];

/** Mobile behaviors a block can take (`LayoutBlock.responsive.<bp>.behavior`), as in @dialmade/layout. */
export const MOBILE_BEHAVIORS = [
  "stack",
  "hamburger",
  "drawer",
  "tabbar",
  "grid-2x2",
  "one-column",
  "carousel",
  "card-list",
  "agenda",
  "text-first",
  "sheet",
  "accordion",
  "scroll-x",
  "hide",
] as const;

/** Most pinned prop pointers per block (`LayoutBlock.pinned`). */
export const MAX_PINNED = 128;
