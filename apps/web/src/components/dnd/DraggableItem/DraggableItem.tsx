"use client";

import { useDraggable } from "@dnd-kit/react";
import { Feedback } from "@dnd-kit/dom";
import { motion } from "motion/react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { DND_INSTRUCTIONS_ID, type DndPayload } from "@/lib/dnd";
import { snappy } from "@/lib/motion";
import { useDragTilt } from "./useDragTilt";

const LIFT_SHADOW =
  "var(--app-shadow-lift), 0 0 0 1px oklch(0.68 0.2 296 / 0.45), 0 0 32px -6px var(--app-glow-purple)";

export type DraggableFeedback = "clone" | "default";

export type DraggableItemProps<T extends DndPayload = DndPayload> = {
  /** Unique among draggables in the same DndProvider. */
  id: string;
  /** DnD type; DropSlot `accept` matches against it (e.g. "swatch", "palette-style"). */
  type: string;
  /** Human name used in announcements and as default aria-label (e.g. "Violeta #7C5CFF"). */
  label: string;
  /** Extra payload delivered to DropSlot.onDrop as `item.data`. */
  data?: T;
  disabled?: boolean;
  /** Click/tap alternative to dragging (WCAG 2.5.7). Keyboard users drag with Space/Enter + arrows. */
  onActivate?: () => void;
  /** "clone" (default) leaves a 35 % ghost in place while dragging; "default" leaves an empty gap. */
  feedback?: DraggableFeedback;
  as?: "div" | "li";
  /** Outer element: layout, size and radius (`rounded-*` is inherited by the lift layer). */
  className?: string;
  /** Inner element that lifts (scale 1.03, velocity tilt, shadow + purple glow). */
  liftClassName?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  /**
   * Id(s) of the element(s) that say how to use the item from the keyboard, read first in its description.
   * Defaults to the shared drag instructions («Pulsa Espacio o Enter para coger…», `DND_INSTRUCTIONS_ID`).
   * Pass your own when they do not fit what the item does (e.g. a library tile, which a click inserts).
   */
  instructionsId?: string;
  /** More descriptions, read after the instructions. */
  "aria-describedby"?: string;
  title?: string;
  children: ReactNode;
};

export function DraggableItem<T extends DndPayload = DndPayload>({
  id,
  type,
  label,
  data,
  disabled = false,
  onActivate,
  feedback = "clone",
  as: Tag = "div",
  className,
  liftClassName,
  style,
  title,
  children,
  instructionsId = DND_INSTRUCTIONS_ID,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: DraggableItemProps<T>) {
  const { t } = useI18n();
  const payload = useMemo(() => ({ ...data, label }), [data, label]);
  const plugins = useMemo(() => [Feedback.configure({ feedback })], [feedback]);
  const { ref, isDragging, isDropping } = useDraggable({ id, type, data: payload, disabled, plugins });
  const rotate = useDragTilt(id);
  const lifted = isDragging;

  return (
    <Tag
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-roledescription={t.dnd.roleDescription}
      aria-label={ariaLabel ?? label}
      aria-describedby={cn(instructionsId, ariaDescribedBy) || undefined}
      aria-disabled={disabled || undefined}
      title={title}
      data-dragging={isDragging || undefined}
      data-dropping={isDropping || undefined}
      onClick={disabled || !onActivate ? undefined : () => onActivate()}
      style={{ touchAction: "manipulation", ...style }}
      className={cn(
        "relative select-none",
        disabled ? "cursor-not-allowed opacity-50" : lifted ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      <motion.div
        className={cn("relative h-full w-full rounded-[inherit]", liftClassName)}
        style={{ rotate }}
        initial={false}
        animate={{ scale: lifted ? 1.03 : 1 }}
        transition={snappy}
      >
        {children}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ boxShadow: LIFT_SHADOW }}
          initial={false}
          animate={{ opacity: lifted ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        />
      </motion.div>
    </Tag>
  );
}
