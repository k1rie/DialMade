"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";

export type FloatingPlacement = "right" | "bottom" | "top";

export type FloatingPanelProps = {
  open: boolean;
  /** `restoreFocus`: Esc or an item action (focus goes back to the trigger); outside clicks keep focus where it lands. */
  onClose: (restoreFocus: boolean) => void;
  /** Element the panel is anchored to (also ignored by the outside-click check). */
  anchorRef: RefObject<HTMLElement | null>;
  /** `right` sits next to `boundaryRef` (e.g. the whole left panel, like Recraft's picker) and falls back below. */
  placement?: FloatingPlacement;
  boundaryRef?: RefObject<HTMLElement | null>;
  role: "dialog" | "menu";
  label: string;
  id?: string;
  /** Tab cycles inside (dialogs). Menus close on Tab instead. */
  trapFocus?: boolean;
  className?: string;
  children: ReactNode;
};

const MARGIN = 12;
const FOCUSABLE =
  "input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const MENU_ITEMS = "[role='menuitem']:not([aria-disabled='true'])";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function place(panel: HTMLElement, anchor: DOMRect, placement: FloatingPlacement, boundary: DOMRect | undefined) {
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  if (placement === "right") {
    const edge = (boundary ?? anchor).right + MARGIN;
    if (edge + w <= vw - MARGIN) return { x: edge, y: clamp(anchor.top - 12, MARGIN, vh - h - MARGIN) };
  }
  let x = anchor.left;
  let y = anchor.bottom + 8;
  if (placement === "top") {
    x = anchor.right - w;
    y = anchor.top - h - 8;
    if (y < MARGIN) y = anchor.bottom + 8;
  } else if (y + h > vh - MARGIN && anchor.top - h - 8 >= MARGIN) {
    y = anchor.top - h - 8;
  }
  return { x: clamp(x, MARGIN, vw - w - MARGIN), y: clamp(y, MARGIN, vh - h - MARGIN) };
}

/**
 * Non-modal floating surface of the Palette Lab (color picker, swatch menu, export menu): portaled,
 * fixed next to its anchor and re-placed on scroll, resize and size changes. Focus moves in on open;
 * Esc and outside clicks close it; menus get arrow-key navigation between `[role=menuitem]`.
 */
export function FloatingPanel({
  open,
  onClose,
  anchorRef,
  placement = "bottom",
  boundaryRef,
  role,
  label,
  id,
  trapFocus = false,
  className,
  children,
}: FloatingPanelProps) {
  const isClient = useIsClient();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Positioned imperatively before paint: no state, no extra render, never a frame at the wrong spot.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    let frame = 0;
    const apply = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const { x, y } = place(panel, anchor.getBoundingClientRect(), placement, boundaryRef?.current?.getBoundingClientRect());
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };
    apply();
    const observer = new ResizeObserver(schedule);
    observer.observe(panel);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, { capture: true });
    };
  }, [open, placement, anchorRef, boundaryRef]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(role === "menu" ? MENU_ITEMS : FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onCloseRef.current(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, role, anchorRef]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key === "Tab") {
      if (role === "menu") {
        onClose(false);
        return;
      }
      if (!trapFocus) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (role !== "menu") return;
    const items = [...panel.querySelectorAll<HTMLElement>(MENU_ITEMS)];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index < 0 ? items.length - 1 : index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
  };

  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="floating"
          ref={panelRef}
          id={id}
          role={role}
          aria-label={label}
          tabIndex={-1}
          variants={popVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onKeyDown={onKeyDown}
          className={cn("glass fixed top-0 left-0 z-[900] rounded-panel border border-app-strong text-left text-fg shadow-lift outline-none", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
