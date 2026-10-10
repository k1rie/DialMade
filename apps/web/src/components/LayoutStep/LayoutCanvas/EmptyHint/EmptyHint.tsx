"use client";

import { motion } from "motion/react";
import { useDictionary } from "@/i18n";
import { layout } from "@/i18n/layout";
import { tween } from "@/lib/motion";
import { BlocksIcon, DrawIcon } from "../../icons";

/**
 * Centered card on an empty screen with the ways to start: click or drag a library block, or draw a free
 * box (R). No pointer events, so drawing and dropping work right through it.
 */
export function EmptyHint() {
  const t = useDictionary(layout);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-[min(18%,10rem)]">
      <motion.div
        className="glass flex max-w-sm flex-col gap-3 rounded-card border border-app p-4 shadow-surface"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tween(0.24)}
      >
        <h3 className="text-small font-semibold text-fg">{t.canvas.empty.title}</h3>
        <p className="flex items-start gap-2 text-caption text-muted [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0">
          <BlocksIcon />
          {t.canvas.empty.hint}
        </p>
        <p className="flex items-start gap-2 text-caption text-muted [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0">
          <DrawIcon />
          {t.canvas.empty.draw}
        </p>
      </motion.div>
    </div>
  );
}
