"use client";

import { useCallback } from "react";

/**
 * CSS variable (on `<html>`) that the Toaster's bottom offset reads (Providers). Unset, the toasts keep their
 * default offset.
 */
export const TOAST_BOTTOM_VAR = "--app-toast-bottom";

/** Space between the lifted toasts and the top of the bar they clear, in px. */
export const TOAST_CLEARANCE_GAP_PX = 12;

/** Where a bar sits, from `getBoundingClientRect()`. */
export type BarBox = { top: number; bottom: number; height: number };

/**
 * Bottom offset (px) that keeps the bottom toasts above a bar, or `null` when they need no lift: the bar is
 * hidden, off screen or in the upper half of the viewport (the toasts, at the bottom, cannot cover it).
 */
export function toastLift(bar: BarBox, viewportHeight: number): number | null {
  const visible = bar.height > 0 && bar.bottom > 0 && bar.top < viewportHeight;
  if (!visible || bar.top < viewportHeight / 2) return null;
  return Math.ceil(viewportHeight - bar.top + TOAST_CLEARANCE_GAP_PX);
}

/** Lift asked for by each mounted bar: the toasts clear the highest one. */
const lifts = new Map<HTMLElement, number>();

function syncToastOffset() {
  const lift = Math.max(0, ...lifts.values());
  const root = document.documentElement.style;
  if (lift > 0) root.setProperty(TOAST_BOTTOM_VAR, `${lift}px`);
  else root.removeProperty(TOAST_BOTTOM_VAR);
}

/**
 * Callback ref for a bar that floats at the bottom of the viewport (e.g. the Layout canvas bar): while it is
 * mounted, the bottom toasts sit above it instead of covering it. Follows the bar on resize and scroll; when
 * it unmounts the toasts go back to their default offset.
 */
export function useToastClearance(): (element: HTMLElement | null) => (() => void) | undefined {
  return useCallback((element: HTMLElement | null) => {
    if (!element) return undefined;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const lift = toastLift(element.getBoundingClientRect(), window.innerHeight);
        if ((lifts.get(element) ?? null) === lift) return;
        if (lift === null) lifts.delete(element);
        else lifts.set(element, lift);
        syncToastOffset();
      });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      if (lifts.delete(element)) syncToastOffset();
    };
  }, []);
}
