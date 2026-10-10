"use client";

import type { OutputKind } from "@dialmade/catalog";
import type { ContentContext } from "@dialmade/sections";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { canvasLayoutId } from "@/lib/layout-ids";
import { smooth, tween } from "@/lib/motion";
import { MiniPreview } from "../../MiniPreview";

export type CanvasFrameProps = {
  kind: OutputKind;
  ctx: ContentContext;
  className?: string;
};

/**
 * Silhouette of the Composer's canvas (a window frame) showing the chosen mini. Shares
 * `canvasLayoutId` with the Composer's canvas, so on «Crear» it grows into it.
 */
export function CanvasFrame({ kind, ctx, className }: CanvasFrameProps) {
  return (
    <motion.div
      layoutId={canvasLayoutId}
      // Only re-measure when the content changes: the DropSlot scales while a card is over it.
      layoutDependency={kind}
      transition={smooth}
      className={cn("relative overflow-hidden rounded-card border border-app-strong bg-app-elevated shadow-lift", className)}
    >
      <div aria-hidden className="flex h-5 items-center gap-1 border-b border-app px-2 sm:h-6 sm:px-2.5">
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/15" />
        <span className="size-1.5 rounded-full bg-white/10" />
        <span className="mx-auto h-2 w-2/5 rounded-full bg-white/[0.06] sm:h-2.5" />
      </div>
      <div className="relative aspect-[8/5]">
        <AnimatePresence initial={false}>
          <motion.div
            key={kind}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ...smooth, opacity: tween(0.22) }}
          >
            <MiniPreview kind={kind} ctx={ctx} fonts />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
