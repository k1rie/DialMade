"use client";

import { useMotionValue, type MotionValue } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, type RefObject } from "react";

const GAP = 8;
const EDGE = 8;

export type ToolbarPositionOptions = {
  /** Positioning context of the toolbar (does not scroll). */
  stageRef: RefObject<HTMLElement | null>;
  /** Scroll container of the page preview. */
  scrollerRef: RefObject<HTMLElement | null>;
  toolbarRef: RefObject<HTMLElement | null>;
  /** Crisp outline drawn over the selected element (the page is scaled, its own outline gets thin). */
  outlineRef: RefObject<HTMLElement | null>;
  /** `data-dl-id` of the selected element. */
  id: string;
};

/**
 * Keeps the floating toolbar above the selected element (or just inside its top edge when there is no
 * room), clamped to the stage. Updates through motion values on scroll and resize: no re-renders.
 */
export function useToolbarPosition({ stageRef, scrollerRef, toolbarRef, outlineRef, id }: ToolbarPositionOptions): { x: MotionValue<number>; y: MotionValue<number> } {
  const x = useMotionValue(EDGE);
  const y = useMotionValue(EDGE);

  const update = useCallback(() => {
    const stage = stageRef.current;
    const toolbar = toolbarRef.current;
    const outline = outlineRef.current;
    const target = scrollerRef.current?.querySelector(`[data-dl-id="${CSS.escape(id)}"]`);
    if (!stage || !toolbar) return;
    if (!target) {
      toolbar.style.visibility = "hidden";
      if (outline) outline.style.visibility = "hidden";
      return;
    }
    const s = stage.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    if (outline) {
      const top = Math.max(r.top, s.top) - s.top;
      const bottom = Math.min(r.bottom, s.bottom) - s.top;
      outline.style.visibility = bottom > top ? "visible" : "hidden";
      outline.style.transform = `translate(${r.left - s.left}px, ${top}px)`;
      outline.style.width = `${r.width}px`;
      outline.style.height = `${Math.max(0, bottom - top)}px`;
    }
    const width = toolbar.offsetWidth;
    const height = toolbar.offsetHeight;
    const outside = r.bottom < s.top + GAP || r.top > s.bottom - GAP;
    toolbar.style.visibility = outside ? "hidden" : "visible";
    let top = r.top - s.top - height - GAP;
    if (top < EDGE) top = Math.max(EDGE, r.top - s.top + GAP);
    top = Math.min(top, s.height - height - EDGE);
    const left = Math.min(Math.max(EDGE, r.left - s.left), Math.max(EDGE, s.width - width - EDGE));
    x.set(Math.round(left));
    y.set(Math.round(top));
  }, [stageRef, scrollerRef, toolbarRef, outlineRef, id, x, y]);

  // After every render (doc edits re-flow the page, the toolbar's own width changes).
  useLayoutEffect(update);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const stage = stageRef.current;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    scroller?.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (stage) observer?.observe(stage);
    const page = scroller?.querySelector(".dl-page");
    if (page) observer?.observe(page);
    return () => {
      cancelAnimationFrame(frame);
      scroller?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [scrollerRef, stageRef, update]);

  return { x, y };
}
