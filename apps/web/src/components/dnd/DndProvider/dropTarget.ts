/** A rect in viewport px (what `getBoundingClientRect()` gives). */
export type DropRect = { left: number; top: number; width: number; height: number };

/**
 * Optional field of a droppable's `data` (`useDroppable({ data })`): where the dragged item lands inside the
 * droppable, in viewport px. The drop animation reads it once, when the item starts flying (after the
 * `onDragEnd` handlers ran), and flies into that rect. Without it, or when it returns `null`, the item flies
 * into the whole droppable. E.g. the Layout canvas is one droppable and returns the grid cell under the pointer.
 */
export type DropRectSource = { dropRect?: () => DropRect | null };

const isUsable = (rect: DropRect | null | undefined): rect is DropRect =>
  !!rect &&
  [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) &&
  rect.width > 0 &&
  rect.height > 0;

/** The landing rect a droppable's `data` provides, or `null` (none, or not a usable rect). */
export function dropRectOf(data: unknown): DropRect | null {
  const source = data as DropRectSource | null | undefined;
  if (typeof source?.dropRect !== "function") return null;
  const rect = source.dropRect();
  return isUsable(rect) ? rect : null;
}
