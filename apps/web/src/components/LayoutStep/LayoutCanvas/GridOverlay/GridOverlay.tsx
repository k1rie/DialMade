"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { feedback } from "@/lib/motion";
import { GUIDE_ROWS } from "../constants";

export type GridOverlayProps = {
  columns: number;
  colPx: number;
  rowPx: number;
  /** Stronger stripes and the 64 px guides while a block is moved, resized, drawn or dropped. */
  active: boolean;
};

/**
 * The content grid: one faint stripe per column (12 / 8 / 4), stronger during a gesture, plus a
 * horizontal guide every 64 design px while a gesture runs. Decorative: no pointer events, aria-hidden.
 */
export const GridOverlay = memo(function GridOverlay({ columns, colPx, rowPx, active }: GridOverlayProps) {
  const guide = GUIDE_ROWS * rowPx;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div className="absolute inset-0" initial={false} animate={{ opacity: active ? 1 : 0.55 }} transition={feedback}>
        {Array.from({ length: columns }, (_, index) => (
          <span
            key={index}
            className="absolute inset-y-0 bg-white/[0.022]"
            style={{ left: index * colPx + 2, width: Math.max(0, colPx - 4) }}
          />
        ))}
      </motion.div>
      {guide > 0 && (
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${guide - 1}px, oklch(1 0 0 / 0.07) ${guide - 1}px, oklch(1 0 0 / 0.07) ${guide}px)`,
          }}
          initial={false}
          animate={{ opacity: active ? 1 : 0 }}
          transition={feedback}
        />
      )}
    </div>
  );
});
