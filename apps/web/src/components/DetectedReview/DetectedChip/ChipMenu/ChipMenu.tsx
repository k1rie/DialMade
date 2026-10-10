"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/cn";
import { popVariants } from "@/lib/motion";
import { CheckIcon } from "../../icons";

export type ChipMenuItem = {
  id: string;
  label: string;
  checked?: boolean;
  /** Leading swatch or icon. */
  leading?: ReactNode;
  separatorBefore?: boolean;
};

export type ChipMenuProps = {
  open: boolean;
  label: string;
  anchorRef: RefObject<HTMLElement | null>;
  items: readonly ChipMenuItem[];
  onSelect: (id: string) => void;
  /** `restoreFocus`: Esc or a choice (focus back to the trigger); outside clicks and scrolls leave it. */
  onClose: (restoreFocus: boolean) => void;
};

const MARGIN = 12;
const ITEM = "[role='menuitem'], [role='menuitemradio']";

/** «Usar como…»: a small fixed menu under the chip (arrows, Home/End; Esc and Tab close it back on the chip; scrolling closes it). */
export function ChipMenu({ open, label, anchorRef, items, onSelect, onClose }: ChipMenuProps) {
  const isClient = useIsClient();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const panel = ref.current;
    const anchor = anchorRef.current;
    if (!open || !panel || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    let y = rect.bottom + 6;
    if (y + panel.offsetHeight > vh - MARGIN && rect.top - panel.offsetHeight - 6 >= MARGIN) y = rect.top - panel.offsetHeight - 6;
    panel.style.left = `${Math.min(Math.max(rect.left, MARGIN), Math.max(MARGIN, vw - panel.offsetWidth - MARGIN))}px`;
    panel.style.top = `${Math.max(MARGIN, y)}px`;
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>(ITEM)?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onCloseRef.current(false);
    };
    const scrolled = (event: Event) => {
      if (ref.current?.contains(event.target as Node)) return;
      onCloseRef.current(false);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", scrolled, { capture: true, passive: true });
    window.addEventListener("resize", scrolled);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", scrolled, { capture: true });
      window.removeEventListener("resize", scrolled);
    };
  }, [open, anchorRef]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key === "Tab") {
      // The menu is portaled to the end of <body>: let Tab fall back to the chip, not to the page top.
      event.preventDefault();
      onClose(true);
      return;
    }
    const list = [...(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])];
    const index = list.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index < 0 ? list.length - 1 : index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(list.length - 1);
  };

  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="chip-menu"
          ref={ref}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          variants={popVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onKeyDown={onKeyDown}
          className="glass fixed top-0 left-0 z-[900] w-56 rounded-card border border-app-strong p-1.5 text-left text-fg shadow-lift outline-none"
        >
          {items.map((item) => (
            <div key={item.id}>
              {item.separatorBefore && <div role="separator" className="mx-1 my-1 h-px bg-white/[0.08]" />}
              <button
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.checked}
                tabIndex={-1}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-small text-fg transition-colors duration-150",
                  "hover:bg-white/[0.06] focus-visible:bg-white/[0.08]",
                )}
              >
                <span aria-hidden className={cn("flex size-4 items-center justify-center text-accent", !item.checked && "opacity-0")}>
                  <CheckIcon className="size-3.5" />
                </span>
                {item.leading}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
