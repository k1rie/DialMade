import type { FontMatcher } from "./types";

export { GENERIC_FAMILIES, isPlatformFamily, isSystemFamily, splitFontStack } from "./stack";
export { familyKey } from "./normalize";
export { readNextFonts, type NextFontDeclaration } from "./nextFont";
export type { FontMatcher, ResolvedFontStack } from "./types";

/** The font matcher, loaded on demand (its index of Google Fonts is large). */
export const loadFontMatcher = (): Promise<FontMatcher> => import("./matcher").then((m) => m.createFontMatcher());
