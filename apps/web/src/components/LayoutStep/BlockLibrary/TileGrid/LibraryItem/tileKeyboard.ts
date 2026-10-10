import type { TileMode } from "../../libraryModel";

/** Ids of the shared hidden hints a tile points `aria-describedby` at (rendered once by BlockLibrary). */
export type LibraryHints = {
  /** How a tile works: a click adds it; Space or Enter picks it up and drops it; Esc cancels. */
  keys: string;
  soon: string;
  frame: string;
  appOnly: string;
};

/**
 * - `swallow`: keep the key from the drag sensor and do nothing (a held or modified Space/Enter).
 * - `pass`: the drag sensor and the grid handle it.
 */
export type TileKeyAction = "swallow" | "pass";

export type TileKeyInput = {
  key: string;
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
};

/**
 * What a key does on a draggable library tile. Space and Enter are reserved for grab and drop (CLAUDE.md):
 * on a resting tile both reach the drag sensor, which picks the tile up; a keyboard drop that lands on no
 * target places the block in the next free slot (`useLibraryDrop`). The click is the single-pointer
 * alternative (WCAG 2.5.7). A held or modified Space/Enter on a resting tile never starts a drag.
 */
export function tileKeyAction(event: TileKeyInput, dragIdle: boolean): TileKeyAction {
  if ((event.key !== "Enter" && event.key !== " ") || event.defaultPrevented || !dragIdle) return "pass";
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return "swallow";
  return "pass";
}

/**
 * The whole `aria-describedby` of a tile, in reading order: how it works, then what it does on this screen.
 * It replaces the generic drag instructions (they say Enter picks up, which a tile does not do).
 */
export function tileDescription(hints: LibraryHints, mode: TileMode, soon: boolean): string {
  if (mode === "appOnly") return hints.appOnly;
  return [hints.keys, mode === "frame" && hints.frame, soon && hints.soon].filter(Boolean).join(" ");
}
