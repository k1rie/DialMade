"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";

export type HeroPopoverProps = {
  id: string;
  open: boolean;
  /** `restoreFocus`: move focus back to the trigger (Esc). Outside clicks keep focus where it lands. */
  onClose: (restoreFocus: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  /** Accessible name of the dialog. */
  label: string;
  className?: string;
  children: ReactNode;
};

const FOCUSABLE = "input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Non-modal popover anchored above the secondary links: focus moves in, Esc / outside click / tabbing out close it. */
export function HeroPopover({ id, open, onClose, triggerRef, label, className, children }: HeroPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCloseRef.current(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onCloseRef.current(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, triggerRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          id={id}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          variants={popVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ originY: 1 }}
          onBlur={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!next || event.currentTarget.contains(next) || triggerRef.current?.contains(next)) return;
            onClose(false);
          }}
          className={cn(
            "glass absolute bottom-full left-1/2 z-30 mb-3 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-panel border border-app-strong p-4 text-left shadow-lift outline-none",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
