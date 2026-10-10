// Limits of the layout AI («Describe tu producto» and «Sugerir con IA» for free blocks). Client-safe: shared by
// the route, BYOK, «mi Claude» and the deterministic fallback.
import type { LibraryBlockType, ReadyBlockType } from "@dialmade/layout";

export const LAYOUT_AI_ENDPOINT = "/api/ai/layout";

/** Bump it when the meaning of the answer changes. */
export const LAYOUT_PROMPT_VERSION = "layout-1";

/** The user's description, in UTF-16 code units (like a short brief, not a spec). */
export const MAX_DESCRIPTION_LENGTH = 500;
export const MIN_DESCRIPTION_LENGTH = 3;

/** Variants per proposal: the user asks for 2 or 3; the answer keeps at most 3. */
export const LAYOUT_VARIANTS = [2, 3] as const;
export type LayoutVariantCount = (typeof LAYOUT_VARIANTS)[number];
export const LAYOUT_MAX_VARIANTS = 3;
/** Screens per variant and blocks per screen kept from an answer (the prompt asks for fewer). */
export const LAYOUT_MAX_SCREENS = 6;
export const LAYOUT_MAX_BLOCKS = 16;
/** Screens of the project named in an «add screens» request, so the AI does not repeat them. */
export const LAYOUT_MAX_EXISTING = 24;

/** Free blocks per «Sugerir con IA» request (one free use for all of them). */
export const MAP_MAX_BLOCKS = 24;
/** Neighbor types sent with each free block. */
export const MAP_MAX_NEIGHBORS = 8;

/**
 * Proposed rects are clamped to this (a screen of 3,200 px; a block of 1,280 px): the model's numbers never reach
 * the canvas unbounded. The canvas limits (`MAX_ROW`, `MAX_HEIGHT_ROWS`) are far larger.
 */
export const PROPOSAL_MAX_ROW = 400;
export const PROPOSAL_MAX_HEIGHT = 160;

/** Output caps (thinking at effort `low` counts toward them). Three variants of ~4 screens are ~3K tokens of JSON. */
export const PROPOSE_MAX_OUTPUT_TOKENS = 8000;
export const MAP_MAX_OUTPUT_TOKENS = 2000;

/** The JSON body of /api/ai/layout: a description or 24 boxes are a few KB. */
export const MAX_LAYOUT_BODY_BYTES = 32_000;

/** «Bloque libre» that nobody chose: `map` answers with it to leave a box as it is. */
export const KEEP_FREE: LibraryBlockType = "free";

/**
 * Block types a proposal may use: the ready library minus «Bloque libre» (a proposal names every box), «Contenedor»
 * (nesting is the user's call), «Barra lateral» (on app screens the navigation is the frame, `nav`) and «Modal»
 * (an overlay, not part of a page's structure).
 */
export const PROPOSAL_BLOCK_TYPES = [
  "navbar",
  "footer",
  "hero",
  "features",
  "logos",
  "testimonials",
  "pricing",
  "cta",
  "text",
  "media",
  "kpis",
  "chart",
  "table",
  "activity",
  "cards",
  "calendar",
  "list",
  "settings",
  "form",
  "empty",
] as const satisfies readonly ReadyBlockType[];
export type ProposalBlockType = (typeof PROPOSAL_BLOCK_TYPES)[number];

/** Types «Sugerir con IA» may pick for a free block: every ready block but «Contenedor» (`free` = leave it). */
export const MAP_BLOCK_TYPES = [...PROPOSAL_BLOCK_TYPES, "sidebar", "modal", "free"] as const satisfies readonly ReadyBlockType[];
export type MapBlockType = (typeof MAP_BLOCK_TYPES)[number];
