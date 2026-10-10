"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import type { Point } from "@/lib/geometry";
import { feedback } from "@/lib/motion";
import { Z_OVERLAY } from "../constants";

export type DrawToolProps = {
  /** Live snapped box while dragging with Dibujar, in screen px relative to the grid. */
  box: { left: number; top: number; width: number; height: number } | null;
  /** First corner of the two-click alternative, in screen px relative to the grid. */
  anchor: Point | null;
  /** Shown next to the anchor («Haz clic en la esquina opuesta…»). */
  anchorHint: string;
};

/**
 * Visuals of the Draw tool (R): the snapped box being drawn and, for the two-click alternative
 * (WCAG 2.5.7), the marker of the first corner with a short hint. The pointer logic lives in the
 * canvas; this layer has no pointer events and is aria-hidden (the canvas announces each step).
 */
export const DrawTool = memo(function DrawTool({ box, anchor, anchorHint }: DrawToolProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: Z_OVERLAY + 1 }}>
      {box && (
        <div
          className="absolute rounded-chip border border-dashed border-accent bg-accent/[0.08]"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      )}
      <AnimatePresence>
        {anchor && (
          <motion.div
            key="anchor"
            className="absolute"
            style={{ left: anchor.x, top: anchor.y }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={feedback}
          >
            <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-app shadow-glow-purple" />
            <span className="glass absolute top-3 left-3 rounded-control border border-app-strong px-2 py-1 text-caption whitespace-nowrap text-fg shadow-lift">
              {anchorHint}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
