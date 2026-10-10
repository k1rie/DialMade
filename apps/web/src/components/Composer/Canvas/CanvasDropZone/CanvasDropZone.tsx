"use client";

import { useDragDropMonitor, useDragOperation, useDroppable } from "@dnd-kit/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DND_LANDED_EVENT, labelOf, type DroppedItem } from "@/lib/dnd";
import { tween } from "@/lib/motion";
import { CANVAS_ACCEPT, CANVAS_DROP_ID } from "../../constants";

export type CanvasDropZoneProps = {
  /** Announced as the drop target («Página»). */
  label: string;
  hint: string;
  onDrop: (item: DroppedItem) => void;
  className?: string;
  /** Pass a stable element: drag state changes re-render the zone, never the page inside. */
  children: ReactNode;
};

/**
 * The whole canvas as a drop target for style, typography and theme cards. Unlike DropSlot it never
 * scales its content: the highlight is an overlay, so the page preview is not repainted while dragging.
 */
export function CanvasDropZone({ label, hint, onDrop, className, children }: CanvasDropZoneProps) {
  const data = useMemo(() => ({ label }), [label]);
  const { ref, isDropTarget } = useDroppable({ id: CANVAS_DROP_ID, accept: [...CANVAS_ACCEPT], data });
  const { source } = useDragOperation();
  const compatible = !!source && source.type != null && CANVAS_ACCEPT.includes(String(source.type));

  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  useDragDropMonitor({
    onDragEnd(event) {
      const { source: dropped, target } = event.operation;
      if (event.canceled || !dropped || target?.id !== CANVAS_DROP_ID) return;
      onDropRef.current({ id: String(dropped.id), type: String(dropped.type ?? ""), label: labelOf(dropped), data: (dropped.data ?? {}) as DroppedItem["data"] });
    },
  });

  // Brief white flash when the card lands (DESIGN-BRIEF §5), like DropSlot.
  const [landings, setLandings] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const onLanded = useCallback(() => setLandings((n) => n + 1), []);
  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current?.removeEventListener(DND_LANDED_EVENT, onLanded);
      elementRef.current = element;
      element?.addEventListener(DND_LANDED_EVENT, onLanded);
      ref(element);
    },
    [ref, onLanded],
  );

  return (
    <div ref={setRef} data-state={compatible ? (isDropTarget ? "over" : "compatible") : "idle"} className={cn("relative isolate", className)}>
      {children}
      <AnimatePresence>
        {compatible && (
          <motion.div
            key="drop-overlay"
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-30 grid items-start justify-items-center rounded-[inherit] border-2 border-dashed pt-5 transition-[border-color,background-color] duration-150",
              isDropTarget ? "border-accent bg-accent/[0.08] shadow-glow-purple" : "border-accent/40 bg-transparent",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tween(0.15)}
          >
            <motion.span
              className="glass rounded-control border border-app-strong px-3 py-1.5 text-small font-medium text-fg shadow-lift"
              animate={{ scale: isDropTarget ? 1.04 : 1, opacity: isDropTarget ? 1 : 0.85 }}
              transition={tween(0.18)}
            >
              {hint}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {landings > 0 && (
          <motion.span
            key={`land-${landings}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 rounded-[inherit] bg-white"
            initial={{ opacity: 0.18 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
