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

/**
 * Offset that draws the dragged row in slot `over` (its natural box is `boxes[from]`): moving down, its bottom
 * meets the bottom of the row it passed; moving up, its top meets that row's top. The keyboard grab places the row
 * there while the others make room with `shiftFor`.
 */
export function slotOffset(boxes: readonly RowBox[], from: number, over: number): number {
  const box = boxes[from];
  const target = boxes[over];
  if (!box || !target || over === from) return 0;
  return over > from ? target.top + target.height - (box.top + box.height) : target.top - box.top;
}

/* ------------------------------------------------------------------------------------------------ */
/* Keyboard                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

/** A row picked up with Space/Enter: which screen and the slot it is drawn in now. */
export type ScreenGrab = { id: string; at: number };

export type ScreenKey = { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean };

/**
 * What a key does on a screen row:
 * - `focus`: ↑/↓, Home, End move focus to that row, which is selected (automatic activation, like tabs);
 * - `grab` / `drop` / `cancel` / `move` / `edge`: Space or Enter picks the row up (with more than one screen);
 *   while it is held, ↑/↓, Home and End move it (`edge` at the ends), Space or Enter drops it, Tab drops it and
 *   lets focus move on (`keepKey`), Esc puts it back. CLAUDE.md keeps Space and Enter for grab and drop;
 * - `shift`: Alt+↑/↓ moves the row one place right away; `rename`: F2; `menu`: the context menu key or Shift+F10.
 * `none` lets the key through.
 */
export type ScreenKeyStep =
  | { type: "none" }
  | { type: "focus"; to: number }
  | { type: "grab" }
  | { type: "move"; to: number }
  | { type: "edge"; delta: -1 | 1 }
  | { type: "drop"; keepKey: boolean }
  | { type: "cancel" }
  | { type: "shift"; delta: -1 | 1 }
  | { type: "rename" }
  | { type: "menu" };

export function screenKeyStep(grab: ScreenGrab | null, id: string, index: number, length: number, event: ScreenKey): ScreenKeyStep {
  const { key, altKey, ctrlKey, metaKey, shiftKey } = event;
  const plain = !altKey && !ctrlKey && !metaKey && !shiftKey;
  const grabKey = (key === " " || key === "Enter") && plain;
  if (grab) {
    // Another row's keys while one is held (focus moved without a blur): the held one is dropped first.
    if (grab.id !== id) return { type: "drop", keepKey: !grabKey };
    if (grabKey) return { type: "drop", keepKey: false };
    if (key === "Tab") return { type: "drop", keepKey: true };
    if (key === "Escape") return { type: "cancel" };
    if (ctrlKey || metaKey) return { type: "none" };
    const target = key === "ArrowUp" ? grab.at - 1 : key === "ArrowDown" ? grab.at + 1 : key === "Home" ? 0 : key === "End" ? length - 1 : null;
    if (target === null) return { type: "none" };
    if (target < 0 || target >= length || target === grab.at) return { type: "edge", delta: key === "ArrowUp" || key === "Home" ? -1 : 1 };
    return { type: "move", to: target };
  }
  if (key === "F2" && !altKey && !ctrlKey && !metaKey) return { type: "rename" };
  if (key === "ContextMenu" || (key === "F10" && shiftKey && !altKey && !ctrlKey && !metaKey)) return { type: "menu" };
  if (grabKey) return length > 1 ? { type: "grab" } : { type: "none" };
  if ((key === "ArrowUp" || key === "ArrowDown") && altKey && !ctrlKey && !metaKey && !shiftKey) return { type: "shift", delta: key === "ArrowUp" ? -1 : 1 };
  if (!plain || length === 0) return { type: "none" };
  const to = key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : key === "Home" ? 0 : key === "End" ? length - 1 : null;
  if (to === null) return { type: "none" };
  return { type: "focus", to: Math.max(0, Math.min(length - 1, to)) };
}
