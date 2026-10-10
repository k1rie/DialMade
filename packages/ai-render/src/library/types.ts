// The reference library of «Diseño con IA»: blocks of our own, written once by hand with the token-only vocabulary,
// that the model adapts instead of inventing a composition from scratch. Every entry is original work: it captures
// a PATTERN (structure, hierarchy, proportions: what makes a block read as designed), never another product's
// copy, imagery or marks. See ./README.md for the rules.
import type { AiAxes } from "@dialmade/doc";

/** The layout block types the library covers (a subset of `LibraryBlockType` of @dialmade/layout). */
export type LibraryBlockType =
  | "navbar"
  | "hero"
  | "features"
  | "logos"
  | "testimonials"
  | "pricing"
  | "cta"
  | "footer"
  | "kpis"
  | "chart"
  | "table"
  | "activity"
  | "list"
  | "cards"
  | "empty"
  | "form"
  | "faq"
  | "text";

/** Art-direction axis values the entry suits. An axis it does not list is neutral for it. */
export type LibraryFits = { [K in keyof AiAxes]?: readonly AiAxes[K][] };

export type LibraryBlock = {
  /** Stable id: `<type>-<pattern>`, kebab-case. */
  id: string;
  type: LibraryBlockType;
  /** One line: WHAT makes the pattern work, in design terms (it travels in the prompt). */
  pattern: string;
  fits: LibraryFits;
  /**
   * Reviewed and kept by the person who owns the taste of the library. An approved entry outranks drafts of the same
   * type when the art direction fits about equally; drafts are still used when a type has nothing approved.
   */
  approved?: true;
  /** Surfaces: `landing` blocks breathe, `app` blocks are dense. */
  surface: "landing" | "app";
  /** Sample HTML with neutral, fictional copy. The root's `data-block-id` is rewritten to the target block's id. */
  html: string;
};
