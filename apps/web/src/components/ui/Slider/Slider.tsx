"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  /** Fires once at the end of a pointer drag or after each keyboard step. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** PageUp/PageDown step. Default: 10 × step. */
  largeStep?: number;
  /** Accessible name (required; use `labelledBy` to point at a visible label instead). */
  label: string;
  labelledBy?: string;
  /** Formats aria-valuetext and the optional value readout. */
  formatValue?: (value: number) => string;
  showValue?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function snap(value: number, min: number, max: number, step: number) {
  const snapped = Math.round((value - min) / step) * step + min;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  largeStep,
  label,
  labelledBy,
  formatValue = String,
  showValue = false,
  disabled = false,
  className,
  id,
}: SliderProps) {
  const autoId = useId();
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const range = max - min || 1;
  const progress = useMotionValue((clamp(value, min, max) - min) / range);
  const thumbX = useTransform(progress, (p) => `${p * 100}%`);

  useEffect(() => {
    const next = (clamp(value, min, max) - min) / range;
    if (draggingRef.current || reduce) {
      progress.jump(next);
      return;
    }
    const controls = animate(progress, next, snappy);
    return () => controls.stop();
  }, [value, min, max, range, progress, reduce]);

  const valueFromPointer = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return value;
      return snap(min + ((clientX - rect.left) / rect.width) * range, min, max, step);
    },
    [min, max, range, step, value],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    draggingRef.current = true;
    setDragging(true);
    thumbRef.current?.focus({ preventScroll: true });
    const next = valueFromPointer(event.clientX);
    progress.jump((next - min) / range);
    if (next !== value) onValueChange(next);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const next = valueFromPointer(event.clientX);
    progress.jump((next - min) / range);
    if (next !== value) onValueChange(next);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onValueCommit?.(valueFromPointer(event.clientX));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = largeStep ?? step * 10;
    const deltas: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    };
    let next: number | undefined;
    if (event.key in deltas) next = snap(value + (deltas[event.key] ?? 0) * (event.shiftKey ? 10 : 1), min, max, step);
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    if (next === undefined) return;
    event.preventDefault();
    if (next !== value) onValueChange(next);
    onValueCommit?.(next);
  };

  const text = formatValue(value);

  return (
    <div className={cn("flex items-center gap-3", disabled && "opacity-45", className)}>
      <div
        ref={trackRef}
        className={cn("relative flex h-6 flex-1 touch-none items-center", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div className="absolute inset-0 origin-left rounded-full bg-accent" style={{ scaleX: progress }} />
        </div>
        <motion.div className="pointer-events-none absolute inset-y-0 left-0 w-full" style={{ x: thumbX }}>
          <motion.div
            ref={thumbRef}
            id={id ?? autoId}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={text}
            aria-orientation="horizontal"
            aria-disabled={disabled || undefined}
            onKeyDown={onKeyDown}
            className={cn(
              "pointer-events-auto absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-white",
              "shadow-[0_1px_3px_oklch(0_0_0/0.5),0_0_0_1px_oklch(0_0_0/0.2)]",
              dragging && "glow-purple",
            )}
            animate={{ scale: dragging ? 1.15 : 1 }}
            transition={snappy}
          />
        </motion.div>
      </div>
      {showValue && (
        <output htmlFor={id ?? autoId} className="min-w-10 text-right font-mono text-mono text-muted tabular-nums">
          {text}
        </output>
      )}
    </div>
  );
}
