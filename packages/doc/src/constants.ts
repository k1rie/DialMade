import type { OutputKind } from "@dialmade/catalog";

export const DESIGN_DOC_VERSION = 1;

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
