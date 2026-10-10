import type { Breakpoint, DerivedBreakpoint } from "./types";

/** Hard cap of blocks per layout (validation and `too-many-blocks`). */
export const MAX_BLOCKS = 200;
/** Max length of a block note, in UTF-16 code units (like Zod's `.max`). */
export const NOTE_MAX = 200;
/** Max length of a block label, in UTF-16 code units. */
export const LABEL_MAX = 60;
/** XY-cut tolerance, in grid units: an overlap of up to τ still cuts when it is small next to the blocks. */
export const TAU = 1;

/** Desktop grid. */
export const DESKTOP_COLUMNS = 12;
export const TABLET_COLUMNS = 8;
export const MOBILE_COLUMNS = 4;
export const COLUMNS: Readonly<Record<Breakpoint, 12 | 8 | 4>> = {
  desktop: DESKTOP_COLUMNS,
  tablet: TABLET_COLUMNS,
  mobile: MOBILE_COLUMNS,
};
/** px per grid row. */
export const ROW_UNIT = 8;
/** Width of one desktop column in px, used only to estimate aspect ratios (12 × 120 = 1440). */
export const COL_PX = 120;

/** Spacing scale in px, the same as `@dialmade/doc` (`--dl-space-1` … `--dl-space-10`). */
export const BASE_SPACE: readonly number[] = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

/** Default CSS scope selector and container name of `toCss`. */
export const DEFAULT_SCOPE = ".dl-layout";
export const CONTAINER_NAME = "dl-layout";
/** Container query conditions per derived breakpoint. Tablet also matches mobile widths (cascade). */
export const CONTAINER_QUERIES: Readonly<Record<DerivedBreakpoint, string>> = {
  tablet: "(width < 64rem)",
  mobile: "(width < 40rem)",
};
/** Tablet only (not mobile): used for the few rules that mobile cannot undo, like hiding a leaf. */
export const TABLET_ONLY_QUERY = "(40rem <= width < 64rem)";

/** Rows between wrapped lines and between stacked row/grid children in derived rects. */
export const DERIVED_GAP_ROWS = 2;
