"use client";

import { useDragDropMonitor, useDragOperation, useDroppable } from "@dnd-kit/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DND_LANDED_EVENT, labelOf, type DndPayload, type DroppedItem } from "@/lib/dnd";
import { snappy } from "@/lib/motion";

export type DropSlotState = "idle" | "compatible" | "over" | "incompatible";

export type DropSlotProps<T extends DndPayload = DndPayload> = {
  id: string;
  /** DraggableItem `type`(s) this slot accepts. */
  accept: string | readonly string[];
  /** Human name for announcements (e.g. "Primario"). */
  label: string;
  /** Called on a successful drop (at drag end; the landing flash plays when the item arrives). */
  onDrop?: (item: DroppedItem<T>) => void;
  disabled?: boolean;
  as?: "div" | "li" | "section";
  className?: string;
  /** Children or a render function receiving the live state. */
  children?: ReactNode | ((state: DropSlotState) => ReactNode);
  "aria-label"?: string;
};

const MotionTags = { div: motion.div, li: motion.li, section: motion.section } as const;

export function DropSlot<T extends DndPayload = DndPayload>({
  id,
  accept,
  label,
  onDrop,
  disabled = false,
  as = "div",
  className,
  children,
  "aria-label": ariaLabel,
}: DropSlotProps<T>) {
  const acceptKey = typeof accept === "string" ? accept : accept.join("|");
  const types = useMemo(() => acceptKey.split("|"), [acceptKey]);
  const data = useMemo(() => ({ label }), [label]);
  const { ref: droppableRef, isDropTarget } = useDroppable({ id, accept: types, data, disabled });
  const { source } = useDragOperation();
  const compatible = !!source && !disabled && source.type != null && types.includes(String(source.type));
  const state: DropSlotState = !source ? "idle" : !compatible ? "incompatible" : isDropTarget ? "over" : "compatible";

  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  });

  useDragDropMonitor({
    onDragEnd(event) {
      const { source: dropped, target } = event.operation;
      if (event.canceled || !dropped || target?.id !== id) return;
      onDropRef.current?.({
        id: String(dropped.id),
        type: String(dropped.type ?? ""),
        label: labelOf(dropped),
        data: dropped.data as T,
      });
    },
  });

  const [landings, setLandings] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const onLanded = useCallback(() => setLandings((n) => n + 1), []);
  const setRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current?.removeEventListener(DND_LANDED_EVENT, onLanded);
      elementRef.current = element;
      element?.addEventListener(DND_LANDED_EVENT, onLanded);
      droppableRef(element);
    },
    [droppableRef, onLanded],
  );

  const Tag = MotionTags[as];

  return (
    <Tag
      ref={setRef}
      data-state={state}
      aria-label={ariaLabel}
      className={cn("relative isolate", className)}
      initial={false}
      animate={{ opacity: state === "incompatible" ? 0.4 : 1, scale: state === "over" ? 1.02 : 1 }}
      transition={snappy}
    >
      <motion.span
        aria-hidden
        className="glow-purple pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-accent-soft"
        initial={false}
        animate={{ opacity: state === "over" ? 1 : state === "compatible" ? 0.4 : 0 }}
        transition={{ duration: 0.18 }}
      />
      <AnimatePresence>
        {state === "over" && (
          <motion.span
            key="pulse"
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-accent"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.06 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
      {typeof children === "function" ? children(state) : children}
      <AnimatePresence>
        {landings > 0 && (
          <motion.span
            key={`land-${landings}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-white"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </Tag>
  );
}
