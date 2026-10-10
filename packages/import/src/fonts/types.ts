import type { FontMatch } from "../types";

/** A CSS font stack, resolved: the family to use, the rest as fallback, and its Google Fonts match. */
export interface ResolvedFontStack {
  /**
   * First real family; when the stack is only system/generic families (platform fonts such as Roboto or
   * Arial included, after a system keyword), its first entry.
   */
  family: string;
  /** The rest of the stack, in order. */
  fallback: string[];
  match: FontMatch;
  /** The family was deduced (an undefined `var(--font-inter)` → Inter, or a unique fuzzy match): confidence drops to medium. */
  deduced?: boolean;
}

/**
 * Font matching (src/fonts/): exact → alias → fuzzy against Google Fonts, metric-compatible free
 * families (Arial → Arimo) and system stacks. The core calls it for every `FontCandidate` a parser
 * returns.
 */
export interface FontMatcher {
  /** One family name (`Inter`, `Source Sans Pro`, `Arial`) → its match. */
  match(family: string): FontMatch;
  /** A whole stack (`-apple-system, "SF Pro Text", var(--font-inter), sans-serif`); `null` when it has no usable entry. */
  resolveStack(stack: string | readonly string[]): ResolvedFontStack | null;
}
