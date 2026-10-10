/** Shared DnD contracts used by DraggableItem, DropSlot, DndAnnouncer and DndProvider. */
export type DndPayload = Record<string, unknown>;

/** What a DropSlot receives in `onDrop`. */
export type DroppedItem<T extends DndPayload = DndPayload> = {
  id: string;
  type: string;
  label: string;
  data: T;
};

/** Fired on the drop target element when the Motion drop animation lands (detail: { sourceId }). */
export const DND_LANDED_EVENT = "dialmade:dnd-landed";

/** id of the hidden instructions every DraggableItem references with aria-describedby. */
export const DND_INSTRUCTIONS_ID = "dialmade-dnd-instructions";

export function labelOf(entity: { id: string | number; data?: unknown } | null | undefined): string {
  if (!entity) return "";
  const data = entity.data as { label?: unknown } | undefined;
  return typeof data?.label === "string" && data.label ? data.label : String(entity.id);
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
