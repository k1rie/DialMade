// Shared with BlockLibrary (drag type) and BlockInspector (minimum size, toast id): LayoutStep/constants.
export { ADJUSTED_TOAST_ID, LIBRARY_DRAG_TYPE, MIN_BLOCK_SIZE } from "../constants";

/** Id of the canvas droppable (one per DndProvider: one LayoutStep per page). */
export const CANVAS_DROP_ID = "layout-canvas";

/** Frame height in rows: max(layout bottom + FRAME_PAD_ROWS, FRAME_MIN_ROWS) + extra rows. */
export const FRAME_MIN_ROWS = 100;
export const FRAME_PAD_ROWS = 24;

/** Gutter around the device frame inside the canvas scroller, in screen px. */
export const FRAME_GUTTER_PX = 32;

/** Pointer travel (screen px) before a press on a block becomes a move, or a press while drawing a drag. */
export const DRAG_THRESHOLD_PX = 3;

/** Below this size (screen px) a block shows only its icon, with the name in a tooltip. */
export const TINY_BLOCK_PX = { width: 56, height: 32 } as const;
/** From this height the note gets its own line. */
export const NOTE_MIN_HEIGHT_PX = 46;
/** From this size the «Tabla · 8 filas» chip fits at the bottom-left. */
export const CHIP_MIN_PX = { width: 128, height: 76 } as const;

/*
 * Stacking (all inside the scroller, which isolates it: nothing here paints over the page's bars or popovers).
 * Blocks get 1…N in tree order (`stackingOrder`): each block's subtree is a contiguous band right above it.
 */
/** Base z-index of the block being moved, resized or held, and of its descendants (above every other block). */
export const Z_ACTIVE = 1_000_000;
/** z-index of the layers above every block: resize handles, the drawing, «Ver estructura», drop feedback. */
export const Z_OVERLAY = 2_000_000;
/** Warning badges: above the resize handles (the «ne» one is left out under a badge) and above every block. */
export const Z_BADGE = Z_OVERLAY + 1;

/** Distance (screen px) from the scroller's top/bottom edge where a gesture starts auto-scrolling. */
export const AUTO_SCROLL_EDGE_PX = 48;
/** Fastest auto-scroll step, in px per animation frame. */
export const AUTO_SCROLL_MAX_STEP = 18;

/** Horizontal guides during a gesture: one every 64 design px (8 rows). */
export const GUIDE_ROWS = 8;

/** Height of the fake browser bar above the frame (screen px), like the Composer's. */
export const FRAME_BAR_PX = 30;
