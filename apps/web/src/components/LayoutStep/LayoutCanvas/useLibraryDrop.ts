"use client";

import { isLibraryBlockType, type GridRect, type LibraryBlockType } from "@dialmade/layout";
import { useDragDropMonitor, useDragOperation, useDroppable } from "@dnd-kit/react";
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { GridMetrics } from "@/lib/geometry";
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

/**
 * The grid as the drop target of the block library (`@dnd-kit/react`, type «layout-block»). While a
 * pointer drag hovers it, `ghost` follows the pointer cell by cell (default size centred on the pointer);
 * on drop the block is inserted there. Keyboard drags (Space/Enter on a tile, arrows to the canvas) have
 * no meaningful pointer, so they insert at the next free slot.
 */
export function useLibraryDrop({ enabled, label, gridRef, metrics, onDrop }: LibraryDropOptions) {
  const data = useMemo(() => ({ label }), [label]);
  const { ref, isDropTarget } = useDroppable({ id: CANVAS_DROP_ID, accept: LIBRARY_DRAG_TYPE, data, disabled: !enabled });
  const { source } = useDragOperation();
  const compatible = enabled && source != null && String(source.type ?? "") === LIBRARY_DRAG_TYPE;
  const [ghost, setGhost] = useState<DropGhost | null>(null);

  const latest = useRef({ metrics, onDrop, enabled });
  useLayoutEffect(() => {
    latest.current = { metrics, onDrop, enabled };
  });

  const ghostAt = (client: { x: number; y: number }, type: LibraryBlockType): DropGhost | null => {
    const box = gridRef.current?.getBoundingClientRect();
    if (!box) return null;
    return { type, rect: dropRect(relativePoint(client, box), defaultSizeOf(type), latest.current.metrics) };
  };

  useDragDropMonitor({
    onDragMove(event) {
      const { source: dragged, target, activatorEvent, position } = event.operation;
      const type = blockTypeOf(dragged?.data);
      const over = latest.current.enabled && target?.id === CANVAS_DROP_ID && type !== null && !(activatorEvent instanceof KeyboardEvent);
      const next = over && type ? ghostAt(position.current, type) : null;
      setGhost((current) => {
        if (!next || !current) return next === current ? current : next;
        return current.type === next.type && sameRect(current.rect, next.rect) ? current : next;
      });
    },
    onDragEnd(event) {
      setGhost(null);
      const { source: dropped, target, activatorEvent, position } = event.operation;
      if (event.canceled || !latest.current.enabled || target?.id !== CANVAS_DROP_ID) return;
      if (String(dropped?.type ?? "") !== LIBRARY_DRAG_TYPE) return;
      const type = blockTypeOf(dropped?.data);
      if (!type) return;
      const keyboard = activatorEvent instanceof KeyboardEvent;
      latest.current.onDrop(type, keyboard ? null : (ghostAt(position.current, type)?.rect ?? null));
    },
  });

  return {
    ref,
    state: !compatible ? ("idle" as const) : isDropTarget ? ("over" as const) : ("compatible" as const),
    /** Type of the library block being dragged, while a compatible drag is on. */
    draggedType: compatible ? blockTypeOf(source?.data) : null,
    ghost: compatible && isDropTarget ? ghost : null,
  };
}
