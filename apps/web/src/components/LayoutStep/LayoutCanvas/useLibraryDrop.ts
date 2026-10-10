"use client";

import { isLibraryBlockType, type GridRect, type LibraryBlockType } from "@dialmade/layout";
import { useDragDropMonitor, useDragOperation, useDroppable } from "@dnd-kit/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { GridMetrics, Point } from "@/lib/geometry";
import { CANVAS_DROP_ID, LIBRARY_DRAG_TYPE } from "./constants";
import { defaultSizeOf, dropRect, relativePoint, sameRect } from "./gestures";

/** A library block hovering the grid: its type and where it would land. */
export type DropGhost = { type: LibraryBlockType; rect: GridRect };

export type LibraryDropOptions = {
  /** Desktop with an active screen: derived views are read-only. */
  enabled: boolean;
  /** Announced as the drop target («Lienzo de Inicio»). */
  label: string;
  /** The grid element (pointer → cell). */
  gridRef: RefObject<HTMLElement | null>;
  metrics: GridMetrics;
  /** `rect` is null for keyboard drags: the block goes to the next free slot. */
  onDrop: (type: LibraryBlockType, rect: GridRect | null) => void;
};

const blockTypeOf = (data: unknown): LibraryBlockType | null => {
  const value = (data as { blockType?: unknown } | null | undefined)?.blockType;
  return isLibraryBlockType(value) ? value : null;
};

const sameGhost = (current: DropGhost | null, next: DropGhost | null): DropGhost | null => {
  if (!next || !current) return next === current ? current : next;
  return current.type === next.type && sameRect(current.rect, next.rect) ? current : next;
};

/**
 * The canvas as the drop target of the block library (`@dnd-kit/react`, type «layout-block»). The
 * droppable is the scroller (`ref`), which is clipped to what the user sees: a drop over the top bar
 * while the grid is scrolled under it never lands in hidden rows. While a pointer drag hovers it, `ghost`
 * follows the pointer cell by cell (default size centred on the pointer, kept inside the grid's columns),
 * also while the canvas scrolls under a still pointer (auto-scroll, wheel); on drop the block is inserted
 * there. Keyboard drags (Space/Enter on a tile, arrows to the canvas, Space/Enter again) have no meaningful
 * pointer, so they insert at the next free slot. A keyboard drop on no target is the library's (useLibraryInsert).
 */
export function useLibraryDrop({ enabled, label, gridRef, metrics, onDrop }: LibraryDropOptions) {
  const data = useMemo(() => ({ label }), [label]);
  const { ref: droppableRef, isDropTarget } = useDroppable({ id: CANVAS_DROP_ID, accept: LIBRARY_DRAG_TYPE, data, disabled: !enabled });
  const { source } = useDragOperation();
  const compatible = enabled && source != null && String(source.type ?? "") === LIBRARY_DRAG_TYPE;
  const [ghost, setGhost] = useState<DropGhost | null>(null);

  const latest = useRef({ metrics, onDrop, enabled });
  useLayoutEffect(() => {
    latest.current = { metrics, onDrop, enabled };
  });

  // The droppable element (the scroller), kept for the scroll listener.
  const [element, setElement] = useState<HTMLElement | null>(null);
  const ref = useCallback(
    (node: HTMLElement | null) => {
      droppableRef(node);
      setElement(node);
    },
    [droppableRef],
  );

  const ghostAt = useCallback(
    (client: Point, type: LibraryBlockType): DropGhost | null => {
      const box = gridRef.current?.getBoundingClientRect();
      if (!box) return null;
      return { type, rect: dropRect(relativePoint(client, box), defaultSizeOf(type), latest.current.metrics) };
    },
    [gridRef],
  );

  /** Last pointer position over the canvas and the type dragged: scrolling re-reads the cell under it. */
  const pointer = useRef<{ client: Point; type: LibraryBlockType } | null>(null);

  useDragDropMonitor({
    onDragMove(event) {
      const { source: dragged, target, activatorEvent, position } = event.operation;
      const type = blockTypeOf(dragged?.data);
      const over = latest.current.enabled && target?.id === CANVAS_DROP_ID && type !== null && !(activatorEvent instanceof KeyboardEvent);
      pointer.current = over && type ? { client: { x: position.current.x, y: position.current.y }, type } : null;
      const next = over && type ? ghostAt(position.current, type) : null;
      setGhost((current) => sameGhost(current, next));
    },
    onDragEnd(event) {
      setGhost(null);
      pointer.current = null;
      const { source: dropped, target, activatorEvent, position } = event.operation;
      if (event.canceled || !latest.current.enabled || target?.id !== CANVAS_DROP_ID) return;
      if (String(dropped?.type ?? "") !== LIBRARY_DRAG_TYPE) return;
      const type = blockTypeOf(dropped?.data);
      if (!type) return;
      const keyboard = activatorEvent instanceof KeyboardEvent;
      latest.current.onDrop(type, keyboard ? null : (ghostAt(position.current, type)?.rect ?? null));
    },
  });

  // dnd-kit emits no drag move when the canvas scrolls under a still pointer: follow the scroll here.
  const hovering = compatible && isDropTarget;
  useEffect(() => {
    if (!hovering || !element) return;
    const onScroll = () => {
      const last = pointer.current;
      if (!last) return;
      const next = ghostAt(last.client, last.type);
      setGhost((current) => sameGhost(current, next));
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [hovering, element, ghostAt]);

  return {
    /** Attach to the scroller. */
    ref,
    state: !compatible ? ("idle" as const) : isDropTarget ? ("over" as const) : ("compatible" as const),
    /** Type of the library block being dragged, while a compatible drag is on. */
    draggedType: compatible ? blockTypeOf(source?.data) : null,
    ghost: hovering ? ghost : null,
  };
}
