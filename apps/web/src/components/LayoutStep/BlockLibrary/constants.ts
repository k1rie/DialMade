import type { LibraryBlockType } from "@dialmade/layout";
// The drag type and its data are shared with the canvas (the drop target): LayoutStep/constants + types.
import { LIBRARY_DRAG_TYPE } from "../constants";

/** Where a tile is shown; part of its drag id, since one type can be on screen in several places. */
export type LibrarySection = "suggested" | "results" | `category-${string}`;

/** Unique drag id of a tile: `<instance>:<section>:<type>`. */
export const libraryDragId = (instance: string, section: LibrarySection, type: LibraryBlockType): string =>
  `${LIBRARY_DRAG_TYPE}:${instance}:${section}:${type}`;

/** Marks the cell of a tile; its first element child is the focusable tile (arrow-key navigation). */
export const TILE_ATTR = "data-library-tile";

/**
 * Scroll margins for whatever takes focus under the sticky search (tiles and category toggles): focus
 * scrolls it clear of the search (about 52 px tall) instead of leaving it hidden underneath (WCAG 2.4.11).
 */
export const CLEAR_STICKY_SEARCH = "scroll-mt-20 scroll-mb-2";
