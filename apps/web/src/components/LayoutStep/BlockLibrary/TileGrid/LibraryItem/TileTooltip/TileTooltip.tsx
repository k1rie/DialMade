"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type TileTooltipProps = Omit<ComponentPropsWithoutRef<"div">, "content"> & {
  /** Visual only: the same text already reaches assistive tech through the tile's name and description. */
  content: ReactNode;
  /** ms before showing on hover (keyboard focus shows it at once). */
  delay?: number;
};

/** Distance to the tile and minimum distance to the viewport edges, in px. */
const GAP = 8;
const EDGE = 8;
/** Grace period to move the pointer from the tile onto the tooltip (WCAG 1.4.13: hoverable). */
const HIDE_DELAY_MS = 150;

/**
 * Cell of a library tile with its tooltip. Same look and timing as `@/components/ui/Tooltip`, but the
 * tooltip wraps to several lines and is kept inside the viewport (the library sits at the left edge,
 * where a centered tooltip would be cut off): above the tile, below it when there is no room.
 * Dismissible with Esc, hoverable, hidden on pointer down, scroll and when a keyboard grab starts.
 */
export function TileTooltip({
  content,
  delay = 350,
  className,
  children,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  onKeyDownCapture,
  ...props
}: TileTooltipProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const isClient = useIsClient();

  const show = useCallback((wait: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), wait);
  }, []);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, []);
  const keepOpen = useCallback(() => clearTimeout(timer.current), []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  // Before paint: above the tile (below when it does not fit), clamped to the viewport horizontally.
  useLayoutEffect(() => {
    const element = tip.current;
    const cell = anchor.current;
    if (!open || !element || !cell) return;
    const rect = cell.getBoundingClientRect();
    const { width, height } = element.getBoundingClientRect();
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(EDGE, Math.min(centered, window.innerWidth - EDGE - width));
    const above = rect.top - GAP - height;
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(above >= EDGE ? above : rect.bottom + GAP)}px`;
  }, [open]);

  return (
    <div
      ref={anchor}
      className={className}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType === "mouse") show(delay);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hideSoon();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        hide();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (event.target.matches(":focus-visible")) show(0);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        hide();
      }}
      onKeyDownCapture={(event: KeyboardEvent<HTMLDivElement>) => {
        // Space picks the tile up (keyboard drag): the tooltip would cover the way to the canvas.
        if (event.key === " ") hide();
        onKeyDownCapture?.(event);
      }}
      {...props}
    >
      {children}
      {isClient &&
        createPortal(
          <AnimatePresence>
            {open && content && (
              <motion.span
                key="tooltip"
                ref={tip}
                aria-hidden
                onPointerEnter={keepOpen}
                onPointerLeave={hideSoon}
                className={cn(
                  "fixed top-0 left-0 z-[1000] block w-max max-w-60 rounded-chip border border-app-strong bg-app-elevated px-2 py-1",
                  "text-caption text-pretty text-fg shadow-surface",
                )}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={tween(0.16)}
              >
                {content}
              </motion.span>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
