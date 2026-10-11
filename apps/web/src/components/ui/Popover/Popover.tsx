"use client";

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
import { createPopoverFocus, type FocusAtClose } from "./popoverFocus";
import { tabExit } from "./tabExit";

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
 * clipped canvas. Focus moves in on every opening (the first one too, once the panel is measured and shown)
 * and back to the trigger on Esc or when the popover closes with focus inside (an item that closes it);
 * outside clicks (also inside an iframe), focus elsewhere and Tab out of either end close it (Tab continues from the
 * trigger, Shift+Tab lands on it).
 */
export function Popover({ open, onOpenChange, trigger, label, align = "start", side = "bottom", className, children }: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [focus] = useState(createPopoverFocus);
  const wasOpenRef = useRef(false);

  const triggerControl = useCallback(() => triggerRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? null, []);

  // Opening and closing, declared before the placement so that focus is pending when the panel shows. The close
  // runs in the layout phase of the commit that closes it (the exiting panel is still there): a cleanup would run
  // in the mutation phase, where React's own focus restore undoes it. Effects that move focus later in that commit
  // (a dialog that opens, a field that takes focus) still win. Unmounting runs nothing: the next view owns focus.
  useLayoutEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      focus.opened();
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    const panel = panelRef.current;
    const active = document.activeElement;
    const at: FocusAtClose = !active || active === document.body ? "lost" : panel?.contains(active) ? "inside" : "elsewhere";
    focus.closed(at, triggerControl());
  }, [open, focus, triggerControl]);

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

  // Focus moves in once the panel is shown. On the first opening it is hidden until `place` measures it (the
  // position arrives in a second, synchronous render), so this waits for the position instead of the opening.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    focus.moveIn(panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel, position !== null);
  }, [open, position, focus]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const onPopover = !!(panelRef.current?.contains(target) || triggerRef.current?.contains(target));
      focus.pressed(onPopover);
      if (onPopover) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onOpenChange(false);
        triggerControl()?.focus({ preventScroll: true });
        return;
      }
      // The panel lives at the end of <body>: Tab out of either end would leave the page's order (or jump
      // to its top) with the popover still open. It reads as if it sat right after its trigger instead.
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getClientRects().length > 0);
      const exit = tabExit(focusable, active, panel, event.shiftKey);
      const control = triggerControl();
      if (!exit || !control) return;
      onOpenChange(false);
      // Shift+Tab lands on the trigger. Tab focuses the trigger and lets the browser move on from it.
      if (exit === "before") event.preventDefault();
      control.focus({ preventScroll: true });
    };
    // Focus that goes anywhere else (a screen reader, a toast hotkey) closes it too.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    // A press inside an iframe (the AI blocks of the canvas) never reaches this document: the window blurs and the
    // iframe takes focus instead. It closes like any press outside (focus stays where the press put it).
    let blurTimer: number | undefined;
    const onWindowBlur = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLIFrameElement) || panelRef.current?.contains(active)) return;
        focus.pressed(false);
        onOpenChange(false);
      }, 0);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.clearTimeout(blurTimer);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [open, onOpenChange, focus, triggerControl]);

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
