"use client";

import type { ScreenId } from "@dialmade/layout";
import { animate, useReducedMotion, type MotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { snappy } from "@/lib/motion";
import { clampOffset, dragSpan, exceedsThreshold, overIndex, shiftFor, slotOffset, type RowBox, type ScreenGrab } from "./reorder";

export type ScreenReorderOptions = {
  /** Screen ids in list order (the store's `screenOrder`). */
  order: readonly ScreenId[];
  /** The list; it must be the rows' offsetParent (position: relative). */
  listRef: RefObject<HTMLElement | null>;
  /** The row element of a screen (its natural box is measured with offsetTop/offsetHeight). */
  rowOf: (id: ScreenId) => HTMLElement | null;
  /** The vertical offset each row is drawn with (a motion value per row). */
  offsetOf: (id: ScreenId) => MotionValue<number> | undefined;
  /** Commits the move (one undo step). Returns whether the order changed. `via`: what dropped it. */
  onDrop: (id: ScreenId, to: number, via: "pointer" | "keyboard") => boolean;
  /** Esc, a lost pointer or a cancelled gesture: nothing moved. */
  onCancel: (id: ScreenId, index: number) => void;
};

export type ScreenReorder = {
  /** The screen being dragged, for the lifted look. */
  draggingId: ScreenId | null;
  /** Wire to the row's `onPointerDown`. Mouse and pen only: touch keeps scrolling (the row menu moves rows). */
  onPointerDown: (id: ScreenId, event: ReactPointerEvent<HTMLElement>) => void;
  /** Call first in the row's `onClick`: `true` swallows the click that ends a drag. */
  consumeClick: () => boolean;
  /**
   * Runs a reorder made without the pointer (Alt+↑/↓, menu) so the rows slide to their new places.
   * `run` returns whether the order changed.
   */
  flip: (run: () => boolean) => boolean;
  /** The row held with the keyboard (Space/Enter) and the slot it is drawn in, or `null`. */
  keyboardHeld: () => ScreenGrab | null;
  /** Picks a row up with the keyboard (lifted, nothing moves yet). `false` when it cannot (one screen, a drag running). */
  keyboardGrab: (id: ScreenId) => boolean;
  /** Draws the held row in slot `to` while the others make room (no store write). Returns whether it moved. */
  keyboardMove: (to: number) => boolean;
  /** Drops the held row where it is drawn: one `onDrop` when the slot changed. Its start and end slots, or `null`. */
  keyboardDrop: () => { from: number; to: number } | null;
  /** Puts the held row back (nothing was written). Its slot, or `null` when none was held. */
  keyboardCancel: () => number | null;
};

/** A row held with the keyboard: rows measured once at the grab, like a pointer drag. */
type KeyboardSession = { id: ScreenId; from: number; over: number; ids: ScreenId[]; boxes: RowBox[]; span: number };

type Session = {
  id: ScreenId;
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  /** Pointer y relative to the list at press time (stays right when the list scrolls). */
  startRel: number;
  from: number;
  over: number;
  ids: ScreenId[];
  boxes: RowBox[];
  span: number;
  started: boolean;
};

/**
 * Pointer reordering of the screen rows (no dnd-kit: the global DndProvider's keyboard sensor would take
 * Space/Enter on the rows, and its canvas droppables would see screen drags). The dragged row follows the
 * pointer inside the list, the others slide to make room with the `snappy` spring, and the drop commits
 * one `moveScreen`; the row then settles into its slot (FLIP, also used by `flip` for keyboard and menu
 * moves). Esc cancels. Reduced motion jumps instead of sliding.
 *
 * The keyboard grab (Space/Enter on a row, WCAG 2.5.7) works the same way: the held row is drawn in its new slot
 * and the store is written once, on the drop (Esc writes nothing). The DOM never reorders mid-grab, so the row
 * keeps focus. Alt+↑/↓ and the row menu stay as one-step alternatives (`flip`).
 */
export function useScreenReorder({ order, listRef, rowOf, offsetOf, onDrop, onCancel }: ScreenReorderOptions): ScreenReorder {
  const reduced = useReducedMotion();
  const [draggingId, setDraggingId] = useState<ScreenId | null>(null);
  const session = useRef<Session | null>(null);
  const keyboard = useRef<KeyboardSession | null>(null);
  const detach = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  /** Where each row is drawn right before a reorder (list-relative), for the FLIP after the commit. */
  const settle = useRef<Map<ScreenId, number> | null>(null);
  const latest = useRef({ order, rowOf, offsetOf, onDrop, onCancel, reduced });

  useLayoutEffect(() => {
    latest.current = { order, rowOf, offsetOf, onDrop, onCancel, reduced };
  });

  const slide = useCallback((value: MotionValue<number> | undefined, target: number) => {
    if (!value) return;
    if (latest.current.reduced) value.jump(target);
    else animate(value, target, snappy);
  }, []);

  /** Natural top + current offset of every row (offsetTop ignores transforms). */
  const snapshot = useCallback(() => {
    const { order: ids, rowOf: row, offsetOf: offset } = latest.current;
    const tops = new Map<ScreenId, number>();
    for (const id of ids) {
      const element = row(id);
      if (element) tops.set(id, element.offsetTop + (offset(id)?.get() ?? 0));
    }
    return tops;
  }, []);

  const finish = useCallback(
    (commit: boolean) => {
      const s = session.current;
      detach.current?.();
      detach.current = null;
      session.current = null;
      if (!s?.started) return;
      // The click that follows pointerup must not select the screen; clear the flag if no click comes.
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      const { offsetOf: offset, onDrop: drop, onCancel: cancel } = latest.current;
      if (commit && s.over !== s.from) {
        settle.current = snapshot();
        if (drop(s.id, s.over, "pointer")) {
          setDraggingId(null);
          return;
        }
        settle.current = null;
      }
      for (const id of s.ids) slide(offset(id), 0);
      if (!commit) cancel(s.id, s.from);
      setDraggingId(null);
    },
    [slide, snapshot],
  );

  // After a reorder commits, each row starts where it was drawn and slides into its new slot (FLIP). The
  // rows a drag already moved out of the way are there already; the dropped row settles from the pointer.
  useLayoutEffect(() => {
    const tops = settle.current;
    if (!tops) return;
    settle.current = null;
    for (const id of order) {
      const value = offsetOf(id);
      const row = rowOf(id);
      const top = tops.get(id);
      if (!value) continue;
      if (!row || top === undefined) {
        value.jump(0);
        continue;
      }
      const delta = top - row.offsetTop;
      value.jump(delta);
      if (delta !== 0) slide(value, 0);
    }
  }, [order, offsetOf, rowOf, slide]);

  const flip = useCallback(
    (run: () => boolean) => {
      // Not while a drag is moving rows (a press that has not moved yet is not a drag).
      if (session.current?.started || keyboard.current) return false;
      settle.current = snapshot();
      const changed = run();
      if (!changed) settle.current = null;
      return changed;
    },
    [snapshot],
  );

  useEffect(() => () => detach.current?.(), []);

  const onPointerDown = useCallback(
    (id: ScreenId, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || event.pointerType === "touch" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const list = listRef.current;
      const ids = [...latest.current.order];
      const from = ids.indexOf(id);
      if (!list || session.current || keyboard.current || ids.length < 2 || from < 0) return;

      const s: Session = {
        id,
        pointerId: event.pointerId,
        element: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        startRel: event.clientY - list.getBoundingClientRect().top,
        from,
        over: from,
        ids,
        boxes: [],
        span: 0,
        started: false,
      };
      session.current = s;

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== s.pointerId) return;
        const current = listRef.current;
        if (!current) return;
        if (!s.started) {
          if (!exceedsThreshold(e.clientX - s.startX, e.clientY - s.startY)) return;
          s.started = true;
          s.boxes = s.ids.map((rowId) => {
            const row = latest.current.rowOf(rowId);
            return row ? { top: row.offsetTop, height: row.offsetHeight } : { top: 0, height: 0 };
          });
          s.span = dragSpan(s.boxes, s.from);
          try {
            s.element.setPointerCapture(s.pointerId);
          } catch {}
          setDraggingId(s.id);
        }
        e.preventDefault();
        const box = s.boxes[s.from];
        if (!box) return;
        const offset = clampOffset(s.boxes, s.from, e.clientY - current.getBoundingClientRect().top - s.startRel);
        latest.current.offsetOf(s.id)?.jump(offset);
        const over = overIndex(s.boxes, s.from, box.top + box.height / 2 + offset);
        if (over === s.over) return;
        s.over = over;
        s.ids.forEach((rowId, index) => {
          if (index !== s.from) slide(latest.current.offsetOf(rowId), shiftFor(index, s.from, over, s.span));
        });
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerId === s.pointerId) finish(true);
      };
      const onAbort = (e: PointerEvent) => {
        if (e.pointerId === s.pointerId) finish(false);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape" || !s.started) return;
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      };
      const onLost = () => {
        if (session.current === s && s.started) finish(false);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onAbort);
      window.addEventListener("keydown", onKeyDown, true);
      s.element.addEventListener("lostpointercapture", onLost);
      detach.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onAbort);
        window.removeEventListener("keydown", onKeyDown, true);
        s.element.removeEventListener("lostpointercapture", onLost);
        try {
          if (s.element.hasPointerCapture(s.pointerId)) s.element.releasePointerCapture(s.pointerId);
        } catch {}
      };
    },
    [listRef, finish, slide],
  );

  const consumeClick = useCallback(() => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  }, []);

  /* ---- Keyboard grab ---- */
  const keyboardHeld = useCallback((): ScreenGrab | null => {
    const k = keyboard.current;
    return k ? { id: k.id, at: k.over } : null;
  }, []);

  const keyboardGrab = useCallback((id: ScreenId) => {
    const ids = [...latest.current.order];
    const from = ids.indexOf(id);
    if (session.current || keyboard.current || ids.length < 2 || from < 0) return false;
    const boxes = ids.map((rowId) => {
      const row = latest.current.rowOf(rowId);
      return row ? { top: row.offsetTop, height: row.offsetHeight } : { top: 0, height: 0 };
    });
    keyboard.current = { id, from, over: from, ids, boxes, span: dragSpan(boxes, from) };
    setDraggingId(id);
    return true;
  }, []);

  const keyboardMove = useCallback(
    (to: number) => {
      const k = keyboard.current;
      if (!k || to < 0 || to >= k.ids.length || to === k.over) return false;
      k.over = to;
      const { offsetOf: offset } = latest.current;
      k.ids.forEach((rowId, index) => {
        slide(offset(rowId), index === k.from ? slotOffset(k.boxes, k.from, to) : shiftFor(index, k.from, to, k.span));
      });
      return true;
    },
    [slide],
  );

  const keyboardDrop = useCallback(() => {
    const k = keyboard.current;
    if (!k) return null;
    keyboard.current = null;
    if (k.over !== k.from) {
      settle.current = snapshot();
      if (latest.current.onDrop(k.id, k.over, "keyboard")) {
        setDraggingId(null);
        return { from: k.from, to: k.over };
      }
      settle.current = null;
    }
    for (const id of k.ids) slide(latest.current.offsetOf(id), 0);
    setDraggingId(null);
    return { from: k.from, to: k.from };
  }, [slide, snapshot]);

  const keyboardCancel = useCallback(() => {
    const k = keyboard.current;
    if (!k) return null;
    keyboard.current = null;
    for (const id of k.ids) slide(latest.current.offsetOf(id), 0);
    setDraggingId(null);
    return k.from;
  }, [slide]);

  return { draggingId, onPointerDown, consumeClick, flip, keyboardHeld, keyboardGrab, keyboardMove, keyboardDrop, keyboardCancel };
}
