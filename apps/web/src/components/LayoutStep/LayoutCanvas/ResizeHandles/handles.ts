// Type-only and relative: vitest runs this module without the `@/` alias.
import type { Handle } from "../../../../lib/geometry/rect";

/** Edges first, corners last: on a small block the corner hit areas win where they overlap. */
const ORDER: readonly Handle[] = ["n", "e", "s", "w", "nw", "ne", "se", "sw"];

/** Edge handles need room for themselves plus both corners (3 hit areas of 24 px). */
export const EDGE_MIN_PX = 72;

/**
 * The handles a selected block shows, in paint order: edges only when the block has room for them, and
 * no «ne» corner under a warnings badge (the badge sits on that corner, above the handles; a hidden
 * handle there would turn a click on the badge's rim into a resize).
 */
export function visibleHandles(width: number, height: number, badge = false): Handle[] {
  return ORDER.filter((handle) => {
    if ((handle === "n" || handle === "s") && width < EDGE_MIN_PX) return false;
    if ((handle === "e" || handle === "w") && height < EDGE_MIN_PX) return false;
    if (handle === "ne" && badge) return false;
    return true;
  });
}
