"use client";

import { AnimatePresence, motion } from "motion/react";
import { cloneElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type TooltipProps = {
  content: ReactNode;
  /** A single focusable element; it receives `aria-describedby` while the tooltip is open. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  /** ms before showing on hover (focus shows immediately). */
  delay?: number;
  disabled?: boolean;
  className?: string;
};

type Position = { x: number; y: number };

/** Grace period to move the pointer from the anchor onto the tooltip (WCAG 1.4.13: hoverable). */
const HIDE_DELAY_MS = 150;

export function Tooltip({ content, children, side = "top", delay = 350, disabled = false, className }: TooltipProps) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<Position | null>(null);
  const isClient = useIsClient();

  const show = useCallback(
    (wait: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const rect = anchor.current?.getBoundingClientRect();
        if (rect) setPosition({ x: rect.left + rect.width / 2, y: side === "top" ? rect.top - 8 : rect.bottom + 8 });
      }, wait);
    },
    [side],
  );
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPosition(null);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPosition(null), HIDE_DELAY_MS);
  }, []);
  const keepOpen = useCallback(() => clearTimeout(timer.current), []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!position) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, { capture: true });
    };
  }, [position, hide]);

  const open = !disabled && position !== null;
  const describedBy = [children.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <span
      ref={anchor}
      className="inline-flex"
      onPointerEnter={(event) => event.pointerType === "mouse" && show(delay)}
      onPointerLeave={hideSoon}
      onPointerDown={hide}
      onFocus={(event) => event.target.matches(":focus-visible") && show(0)}
      onBlur={hide}
    >
      {cloneElement(children, { "aria-describedby": describedBy })}
      {isClient &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.span
                key="tooltip"
                id={id}
                role="tooltip"
                onPointerEnter={keepOpen}
                onPointerLeave={hideSoon}
                className={cn(
                  "fixed z-[1000] whitespace-nowrap rounded-chip border border-app-strong bg-app-elevated px-2 py-1 text-caption text-fg shadow-surface",
                  className,
                )}
                style={{ left: position.x, top: position.y, translateX: "-50%", translateY: side === "top" ? "-100%" : "0%" }}
                initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
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
    </span>
  );
}
