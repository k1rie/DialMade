"use client";

import { useDragDropManager, useDragDropMonitor } from "@dnd-kit/react";
import { useEffect, useRef } from "react";

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };

const KEYS: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const FREE_STEP = 24;

type Manager = NonNullable<ReturnType<typeof useDragDropManager>>;

/** Center of the nearest compatible droppable in `direction` from `from`. */
function nextTarget(manager: Manager, from: Point, direction: Direction): Point | null {
  const source = manager.dragOperation.source;
  if (!source) return null;
  let best: Point | null = null;
  let bestScore = Infinity;
  for (const droppable of manager.registry.droppables) {
    const element = droppable.element;
    if (droppable.disabled || !element || !droppable.accepts(source)) continue;
    const rect = element.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = center.x - from.x;
    const dy = center.y - from.y;
    const [main, cross] =
      direction === "left" ? [-dx, dy] : direction === "right" ? [dx, dy] : direction === "up" ? [-dy, dx] : [dy, dx];
    if (main <= 4) continue;
    const score = main + 2 * Math.abs(cross);
    if (score < bestScore) {
      bestScore = score;
      best = center;
    }
  }
  return best;
}

/**
 * During a keyboard drag, arrow keys jump between compatible drop targets (nearest in that
 * direction). Without a target in that direction the item moves freely by 24 px (×5 with Shift).
 * Space/Enter drop and Esc cancels (KeyboardSensor).
 */
export function useKeyboardTargets() {
  const manager = useDragDropManager();
  const active = useRef(false);

  useDragDropMonitor({
    onDragStart(event) {
      active.current = event.operation.activatorEvent instanceof KeyboardEvent;
    },
    onDragEnd() {
      active.current = false;
    },
  });

  useEffect(() => {
    if (!manager) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEYS[event.key];
      if (!active.current || !direction || manager.dragOperation.status.idle) return;
      event.preventDefault();
      event.stopPropagation();
      const from = manager.dragOperation.position.current;
      const to = nextTarget(manager, from, direction);
      if (to) {
        manager.actions.move({ to, event });
        return;
      }
      const step = FREE_STEP * (event.shiftKey ? 5 : 1);
      const by = { x: direction === "left" ? -step : direction === "right" ? step : 0, y: direction === "up" ? -step : direction === "down" ? step : 0 };
      manager.actions.move({ by, event });
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [manager]);
}
