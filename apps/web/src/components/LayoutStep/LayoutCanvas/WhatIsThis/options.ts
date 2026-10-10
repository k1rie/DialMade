import type { LibraryBlockType, ScreenKind } from "@dialmade/layout";

/** Suggestions shown before typing (`suggestTypesForShape` gives five). */
export const SUGGESTION_COUNT = 5;
/** Search results shown at most. */
export const RESULT_LIMIT = 8;

export type WhatIsThisInput = {
  query: string;
  /** From `suggestTypesForShape(rect, layout, kind, { id })`. */
  suggestions: readonly LibraryBlockType[];
  /** The library search (`searchBlocks`), best first. */
  search: (query: string) => readonly LibraryBlockType[];
  kind: ScreenKind;
};

export type WhatIsThisOptions = { mode: "suggestions" | "results"; types: LibraryBlockType[] };

/**
 * Types offered by «¿Qué es esto?»: the shape suggestions while the search is blank, else the search
 * results. Never «Bloque libre» (that is «Dejar como bloque libre») and never a sidebar on a landing screen
 * (it only exists as an app navigation frame).
 */
export function whatIsThisOptions({ query, suggestions, search, kind }: WhatIsThisInput): WhatIsThisOptions {
  const allowed = (type: LibraryBlockType) => type !== "free" && !(type === "sidebar" && kind === "landing");
  const unique = (types: readonly LibraryBlockType[], limit: number) => [...new Set(types)].filter(allowed).slice(0, limit);
  if (query.trim() === "") return { mode: "suggestions", types: unique(suggestions, SUGGESTION_COUNT) };
  return { mode: "results", types: unique(search(query), RESULT_LIMIT) };
}

/** Next highlighted option for ArrowDown (+1) / ArrowUp (−1), wrapping; −1 when there is none. */
export function moveActive(active: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  if (active < 0) return delta > 0 ? 0 : count - 1;
  return (((active + delta) % count) + count) % count;
}
