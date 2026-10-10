"use client";

/*
 * Copy of Composer/Popover made in Fase A (Composer is outside the Fase A zone). Fase B moves one copy to
 * `src/components/ui/Popover` and deletes the other (see docs/design/modo-layout-fase-b.md).
 */
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { tween } from "@/lib/motion";

export type PopoverTriggerProps = {
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-controls": string | undefined;
  onClick: () => void;
};

export type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Renders the trigger; spread the props on its button. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Accessible name of the dialog. */
  label: string;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top";
  className?: string;
  children: ReactNode;
};

type Position = { left: number; top: number; side: "bottom" | "top" };

const GAP = 8;
const MARGIN = 12;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Non-modal popover (role="dialog") rendered in a portal with fixed positioning, so it escapes the
 * clipped canvas. Focus moves in on open and back to the trigger on Esc; outside clicks close it.
 */
export function Popover({ open, onOpenChange, trigger, label, align = "start", side = "bottom", className, children }: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const place = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const { offsetWidth: width, offsetHeight: height } = panel;
    const spaceBelow = window.innerHeight - anchor.bottom - GAP - MARGIN;
    const placeSide = side === "bottom" ? (spaceBelow >= height || anchor.top < height ? "bottom" : "top") : anchor.top - GAP - MARGIN >= height ? "top" : "bottom";
    const rawLeft = align === "start" ? anchor.left : align === "end" ? anchor.right - width : anchor.left + anchor.width / 2 - width / 2;
    const left = Math.min(Math.max(MARGIN, rawLeft), window.innerWidth - width - MARGIN);
    const rawTop = placeSide === "bottom" ? anchor.bottom + GAP : anchor.top - GAP - height;
    const top = Math.min(Math.max(MARGIN, rawTop), window.innerHeight - height - MARGIN);
    setPosition((previous) =>
      previous && previous.left === left && previous.top === top && previous.side === placeSide ? previous : { left, top, side: placeSide },
    );
  }, [align, side]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const panel = panelRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (panel) observer?.observe(panel);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, { capture: true });
    };
  }, [open, place]);

  // The trigger can move with the content it belongs to (e.g. the selection toolbar): follow it.
  useLayoutEffect(() => {
    if (open) place();
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onOpenChange(false);
      triggerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onOpenChange]);

  const panelId = `popover-${id}`;

  return (
    <>
      <span ref={triggerRef} className="inline-flex shrink-0">
        {trigger({
          "aria-expanded": open,
          "aria-haspopup": "dialog",
          "aria-controls": open ? panelId : undefined,
          onClick: () => onOpenChange(!open),
        })}
      </span>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="popover"
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={label}
                tabIndex={-1}
                className={cn(
                  "fixed z-[900] w-72 max-w-[calc(100vw-24px)] rounded-card border border-app-strong bg-app-elevated p-3 text-fg shadow-lift outline-none",
                  className,
                )}
                style={{ left: position?.left ?? -9999, top: position?.top ?? -9999, visibility: position ? "visible" : "hidden" }}
                initial={{ opacity: 0, scale: 0.97, y: (position?.side ?? side) === "bottom" ? -4 : 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={tween(0.16)}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
