"use client";

// Keyboard focus across the swaps of «Diseño con IA» on the canvas: «Volver al diseño base» removes the island's chip
// and shows the base cell's «Usar IA otra vez» badge (and the other way round), «Reintentar» replaces the badge with
// the island. The button that was pressed is gone, so focus moves to its replacement once it paints (and never drops
// to <body>). Controls opt in with `data-ai-focus="<blockId>"`; the block's own frame is the fallback.

/** Frames to wait for the replacement (the island mounts once its CSS covers it). */
const MAX_FRAMES = 30;

const selector = (blockId: string) => `[data-ai-focus="${CSS.escape(blockId)}"]`;
const frameSelector = (blockId: string) => `[data-dl-id="${CSS.escape(blockId)}"][tabindex]`;

/**
 * After the next paints, focuses the control of `blockId` marked with `data-ai-focus` (other than `from`, the button
 * that was pressed), else the block's frame. Only while focus is still on `from` or lost (on <body>): if the user
 * moved on, nothing happens.
 */
export function focusAiControlAfterSwap(blockId: string, from: Element | null = typeof document === "undefined" ? null : document.activeElement): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  let frames = 0;
  const step = () => {
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (!lost && active !== from) return;
    const target = [...document.querySelectorAll<HTMLElement>(selector(blockId))].find((element) => element !== from);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
    frames += 1;
    if (frames < MAX_FRAMES) window.requestAnimationFrame(step);
    else if (lost) document.querySelector<HTMLElement>(frameSelector(blockId))?.focus({ preventScroll: true });
  };
  window.requestAnimationFrame(step);
}
