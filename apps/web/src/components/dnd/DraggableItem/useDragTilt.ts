"use client";

import { useDragDropMonitor } from "@dnd-kit/react";
import { useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type MotionValue } from "motion/react";
import { useRef } from "react";

const MAX_TILT = 6;
const FULL_TILT_SPEED = 1400;

/** Rotation (±6°) that follows the horizontal drag velocity of draggable `id`. */
export function useDragTilt(id: string): MotionValue<number> | number {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const tracking = useRef(false);
  const velocity = useVelocity(x);
  const target = useTransform(velocity, [-FULL_TILT_SPEED, 0, FULL_TILT_SPEED], [-MAX_TILT, 0, MAX_TILT], { clamp: true });
  const rotate = useSpring(target, { stiffness: 320, damping: 26 });

  useDragDropMonitor({
    onDragStart(event) {
      if (event.operation.source?.id !== id) return;
      tracking.current = !(event.operation.activatorEvent instanceof KeyboardEvent);
      x.jump(event.operation.position.current.x);
    },
    onDragMove(event) {
      if (!tracking.current || event.operation.source?.id !== id) return;
      if (event.to) x.set(event.to.x);
      else if (event.by) x.set(x.get() + event.by.x);
    },
    onDragEnd(event) {
      if (event.operation.source?.id === id) tracking.current = false;
    },
  });

  return reduce ? 0 : rotate;
}
