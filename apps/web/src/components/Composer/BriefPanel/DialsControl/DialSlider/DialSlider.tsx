"use client";

import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { DIAL_DETENTS, DIAL_MAX, DIAL_MIN } from "../../../constants";

export type DialSliderProps = {
  label: string;
  /** Names of the three zones: ≤3, 4–7, ≥8. */
  zones: readonly string[];
  value: number;
  onChange: (value: number) => void;
  /** Pointer drag start: the store opens an undo batch. */
  onBegin: () => void;
  /** Pointer drag end or keyboard step: the batch closes. */
  onCommit: () => void;
  valueText: (value: number, zone: string) => string;
  /** Extra line under the slider (e.g. «Solo en Dashboard» + reset). */
  footer?: ReactNode;
};

const zoneIndex = (value: number) => (value <= DIAL_DETENTS[0]! ? 0 : value <= DIAL_DETENTS[1]! ? 1 : 2);
const percent = (value: number) => ((value - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * 100;

/** 1–10 dial: Slider with detent ticks at 3 and 7, the zone name and an animated value. */
export function DialSlider({ label, zones, value, onChange, onBegin, onCommit, valueText, footer }: DialSliderProps) {
  const labelId = useId();
  const zone = zones[zoneIndex(value)] ?? "";
  const dragging = useRef(false);

  const end = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit();
  }, [onCommit]);

  // A drag that ends outside the track (or is interrupted) still closes the undo batch.
  useEffect(() => {
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [end]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-small font-medium text-fg">
          {label}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-caption text-muted">{zone}</span>
          <NumberFlow value={value} aria-hidden className="min-w-[2ch] text-end font-mono text-mono text-fg tabular-nums" />
        </span>
      </div>
      <div
        className="relative pb-2"
        onPointerDownCapture={(event) => {
          if (event.button !== 0 || dragging.current) return;
          dragging.current = true;
          onBegin();
        }}
      >
        <Slider
          value={value}
          min={DIAL_MIN}
          max={DIAL_MAX}
          step={1}
          largeStep={3}
          label={label}
          labelledBy={labelId}
          formatValue={(v) => valueText(v, zones[zoneIndex(v)] ?? "")}
          onValueChange={onChange}
          onValueCommit={() => {
            if (!dragging.current) onCommit();
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2">
          {DIAL_DETENTS.map((detent) => {
            const reached = value >= detent;
            return (
              <motion.span
                key={detent}
                className={cn("absolute top-0 h-1.5 w-px -translate-x-1/2 rounded-full", reached ? "bg-accent" : "bg-white/20")}
                style={{ left: `${percent(detent)}%` }}
                initial={false}
                animate={{ scaleY: value === detent ? 1.6 : 1, opacity: reached ? 1 : 0.8 }}
                transition={snappy}
              />
            );
          })}
        </div>
      </div>
      {footer}
    </div>
  );
}
