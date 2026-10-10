"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { feedback, tween } from "@/lib/motion";
import { Z_OVERLAY } from "../constants";

export type DropOverlayProps = {
  state: "idle" | "compatible" | "over";
  /** Where the hovering block would land, in screen px relative to the grid. */
  ghost: { left: number; top: number; width: number; height: number; label: string } | null;
  /** «Suelta para colocar el bloque», «Suelta para meterlo en …», «Suelta para usar la navegación …». */
  hint: string;
};

/**
 * Drop feedback for library drags, as an overlay so the blocks are never repainted or scaled: a dashed
 * frame while a compatible drag is on (stronger over the grid), the hint, and the snapped ghost of the
 * block under the pointer. aria-hidden: the DnD announcer speaks for it.
 */
export function DropOverlay({ state, ghost, hint }: DropOverlayProps) {
  return (
    <AnimatePresence>
      {state !== "idle" && (
        <motion.div
          key="drop"
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-dashed transition-[border-color,background-color] duration-150",
            state === "over" ? "border-accent bg-accent/[0.04]" : "border-accent/40",
          )}
          style={{ zIndex: Z_OVERLAY + 3 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={tween(0.15)}
        >
          {ghost && (
            <motion.div
              className="glow-purple absolute top-0 left-0 flex items-start rounded-chip border border-dashed border-accent bg-accent-soft p-2"
              style={{ width: ghost.width, height: ghost.height }}
              initial={false}
              animate={{ x: ghost.left, y: ghost.top }}
              transition={feedback}
            >
              <span className="truncate text-small font-medium text-fg">{ghost.label}</span>
            </motion.div>
          )}
          <span className="glass sticky top-4 mx-auto mt-4 block w-fit rounded-control border border-app-strong px-3 py-1.5 text-small font-medium text-fg shadow-lift">
            {hint}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
