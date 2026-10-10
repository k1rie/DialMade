/**
 * Helpers for `SectionDefinition.visible`: the stored props as the section shows them. Layout pages store
 * repeatable lists at their maximum and let `count` decide what renders, so a description of the page
 * (DESIGN.md, prompt packs, the AI copy collector) must cut them the same way the component does.
 */

type Stored = Readonly<Record<string, unknown>>;

/**
 * `visible` hook of a section that renders `stored[list].slice(0, max(min, stored[countKey]))`. Leaves the
 * props untouched when the list is not an array, the count is not a finite number or nothing is cut.
 */
export function countedList(list: string, countKey = "count", min = 1): (stored: Stored) => Record<string, unknown> {
  return (stored) => {
    const items = stored[list];
    const count = stored[countKey];
    if (!Array.isArray(items) || typeof count !== "number" || !Number.isFinite(count)) return { ...stored };
    const shown = Math.max(min, Math.floor(count));
    return items.length > shown ? { ...stored, [list]: items.slice(0, shown) } : { ...stored };
  };
}
