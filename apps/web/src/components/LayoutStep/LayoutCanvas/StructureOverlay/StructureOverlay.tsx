"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import type { GridMetrics } from "@/lib/geometry";
import { tween } from "@/lib/motion";
import { Z_OVERLAY } from "../constants";
import type { RegionOutline } from "./regions";

export type ReadingNumber = { id: string; left: number; top: number; n: number };

export type StructureOverlayProps = {
  /** Regions to outline (desktop only: their rects are desktop grid units). */
  outlines: readonly RegionOutline[];
  metrics: GridMetrics;
  /** Reading-order badges, already placed in screen px. */
  numbers: readonly ReadingNumber[];
};

/** Nested outlines step in a little so parents and children read apart. */
const DEPTH_INSET = 3;

/**
 * «Ver estructura»: the outline of every region the engine inferred (Columna / Fila / Rejilla) and the
 * reading order on each block (how they stack on mobile and in the DOM). Decorative: aria-hidden, no
 * pointer events (the layers list carries the same order for assistive tech).
 */
export const StructureOverlay = memo(function StructureOverlay({ outlines, metrics, numbers }: StructureOverlayProps) {
  const t = useDictionary(layout);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: Z_OVERLAY + 2 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tween(0.18)}
    >
      {outlines.map((outline) => {
        const inset = Math.min(outline.depth * DEPTH_INSET, 12);
        return (
          <div
            key={`${outline.id}:${outline.depth}`}
            className="absolute rounded-chip border border-dashed border-accent/60"
            style={{
              left: outline.rect.col * metrics.colPx + inset,
              top: outline.rect.row * metrics.rowPx + inset,
              width: Math.max(0, outline.rect.w * metrics.colPx - 2 * inset),
              height: Math.max(0, outline.rect.h * metrics.rowPx - 2 * inset),
            }}
          >
            <span className="absolute -top-2.5 left-2 rounded-chip border border-accent/40 bg-app-elevated px-1.5 text-caption leading-4 text-accent">
              {t.canvas.regionKinds[outline.kind]}
            </span>
          </div>
        );
      })}
      {numbers.map((badge) => (
        <span
          key={badge.id}
          className="absolute flex size-5 items-center justify-center rounded-full bg-accent-cta font-mono text-[11px] leading-none font-medium text-white shadow-surface"
          style={{ left: badge.left + 4, top: badge.top + 4 }}
        >
          {badge.n}
        </span>
      ))}
    </motion.div>
  );
});
