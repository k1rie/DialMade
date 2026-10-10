/** Indent per tree level, in px. */
export const LAYER_INDENT_PX = 14;

/** Type-ahead: keys typed within this many ms add to the same search. */
export const TYPEAHEAD_RESET_MS = 500;

/** Data attributes the tree reads with event delegation (one handler on the tree, not one per row). */
export const LAYER_KEY_ATTR = "data-layer-key";
export const LAYER_ACTION_ATTR = "data-layer-action";

/** What a click on a part of a row does: open/close the node, or show/hide the block. */
export type LayerAction = "toggle" | "visibility";
