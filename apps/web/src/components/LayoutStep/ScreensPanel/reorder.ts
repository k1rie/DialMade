/*
 * Pure geometry of reordering the screen list by pointer. Rows are measured once when the drag starts
 * (natural boxes, without transforms, relative to the list); while dragging, the dragged row follows the
 * pointer and the rows it passes move by its span to make room. Nothing is reordered until the drop.
 */

/** Pointer travel (px) before a press on a row becomes a drag; less is a click. */
export const DRAG_THRESHOLD_PX = 4;

/** A row's natural box relative to the list (offsetTop / offsetHeight). */
export type RowBox = { top: number; height: number };

/** Whether the pointer moved far enough from where it was pressed to start a drag. */
export function exceedsThreshold(dx: number, dy: number, threshold: number = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

/** Keeps the dragged row inside the list: its top never above the first row, its bottom never below the last. */
export function clampOffset(boxes: readonly RowBox[], from: number, offset: number): number {
  const box = boxes[from];
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  if (!box || !first || !last || !Number.isFinite(offset)) return 0;
  const min = first.top - box.top;
  const max = last.top + last.height - (box.top + box.height);
  return Math.min(Math.max(offset, min), Math.max(min, max));
}

/** Index the dragged row would take: how many other rows have their middle above the dragged row's middle. */
export function overIndex(boxes: readonly RowBox[], from: number, center: number): number {
  let index = 0;
  boxes.forEach((box, i) => {
    if (i !== from && box.top + box.height / 2 < center) index++;
  });
  return index;
}

/** How far the other rows move to make room: the dragged row's height plus the gap next to it. */
export function dragSpan(boxes: readonly RowBox[], from: number): number {
  const box = boxes[from];
  if (!box) return 0;
  const next = boxes[from + 1];
  const previous = boxes[from - 1];
  const gap = next ? next.top - (box.top + box.height) : previous ? box.top - (previous.top + previous.height) : 0;
  return box.height + Math.max(0, gap);
}

/** Offset of row `index` while the row from `from` hovers over position `over`. */
export function shiftFor(index: number, from: number, over: number, span: number): number {
  if (index === from) return 0;
  if (from < over && index > from && index <= over) return -span;
  if (from > over && index < from && index >= over) return span;
  return 0;
}

/** Where a keyboard move (Alt+↑ −1, Alt+↓ +1) lands; `null` at the edges or for an unknown row. */
export function stepIndex(index: number, delta: number, length: number): number | null {
  if (index < 0 || index >= length || delta === 0) return null;
  const next = index + delta;
  return next < 0 || next >= length ? null : next;
}
