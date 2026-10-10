// Timing and geometry of the «Generar» signature moment (critique #8), pure so it is tested without a DOM:
// the page fades in under the boxes, then in reading order each box fades and its section opens with
// `clip-path: inset()` from the box rect to the section's own rect. Stagger 30–40 ms, ≤900 ms in total
// whatever the number of blocks (many blocks reveal in waves); reduced motion → one 150 ms fade.

export const REVEAL_TIMING = {
  /** The whole moment, from the press to the last section fully open. */
  totalMs: 900,
  /** The page (background, app frame) fades in under the boxes before the first block. */
  leadMs: 60,
  /** Fade-in of the page layer. */
  baseMs: 160,
  staggerMs: 35,
  minStaggerMs: 30,
  /** Clip of one section, from its box to its own rect. Shortened (down to the minimum) to fit long layouts. */
  itemMs: 380,
  minItemMs: 260,
  /** Fade-out of a box. */
  boxMs: 180,
  /** Fade-in of a section (the clip carries the rest). */
  sectionMs: 120,
  /** Everything at once with reduced motion. */
  reducedMs: 150,
} as const;

/** One block: when its box starts to fade and its section to open, from the start of the moment. */
export type RevealStep = { id: string; delayMs: number };

export type RevealPlan = {
  steps: RevealStep[];
  /** Duration of each section's clip. */
  itemMs: number;
  /** Delay between two consecutive waves (0 with reduced motion). */
  staggerMs: number;
  /** Fade-in of the page layer. */
  baseMs: number;
  /** End of the last animation (≤ `REVEAL_TIMING.totalMs`). */
  totalMs: number;
  reduced: boolean;
};

/**
 * The plan for `ids` in reading order. Each block gets one step; consecutive blocks share a wave when there are
 * more blocks than waves fit (the stagger never goes under 30 ms), so delays never decrease along the reading
 * order and the last section is open by 900 ms.
 */
export function planReveal(ids: readonly string[], options: { reduced?: boolean } = {}): RevealPlan {
  const T = REVEAL_TIMING;
  if (options.reduced) {
    return { steps: ids.map((id) => ({ id, delayMs: 0 })), itemMs: T.reducedMs, staggerMs: 0, baseMs: T.reducedMs, totalMs: T.reducedMs, reduced: true };
  }
  const n = ids.length;
  const budget = T.totalMs - T.leadMs;
  let itemMs: number = T.itemMs;
  let staggerMs: number = T.staggerMs;
  const fits = () => (n - 1) * staggerMs + itemMs <= budget;
  if (!fits()) itemMs = Math.max(T.minItemMs, budget - (n - 1) * staggerMs);
  if (!fits()) staggerMs = T.minStaggerMs;
  const waves = n <= 1 ? 1 : Math.min(n, Math.floor((budget - itemMs) / staggerMs) + 1);
  const steps = ids.map((id, index) => ({ id, delayMs: T.leadMs + Math.floor((index * waves) / Math.max(1, n)) * staggerMs }));
  const last = steps.length > 0 ? steps[steps.length - 1]!.delayMs + itemMs : 0;
  return { steps, itemMs, staggerMs, baseMs: T.baseMs, totalMs: Math.max(T.baseMs, last), reduced: false };
}

/** A box in px. */
export type Rect = { left: number; top: number; width: number; height: number };

/** `rect` relative to `origin`'s top-left corner (both in client px, e.g. from getBoundingClientRect). */
export const rectIn = (rect: Rect, origin: Pick<Rect, "left" | "top">): Rect => ({
  left: rect.left - origin.left,
  top: rect.top - origin.top,
  width: rect.width,
  height: rect.height,
});

/** The section fully open. */
export const FULL_INSET = "inset(0px 0px 0px 0px)";

const px = (value: number) => `${Math.round(value * 100) / 100}px`;

/**
 * `clip-path: inset()` that shows only the part of `section` under `box`, in the section's own px: both rects
 * are on screen, inside a layer scaled by `scale` (screen px per page px). Sides where the box reaches past the
 * section stay open (no negative insets); a box that misses the section on an axis collapses it to a line at
 * the box's edge, so the clip still opens from there.
 */
export function insetFrom(box: Rect, section: Rect, scale: number): string {
  const k = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const width = section.width / k;
  const height = section.height / k;
  const axis = (start: number, end: number, size: number): [number, number] => {
    const a = Math.min(size, Math.max(0, start / k));
    const b = Math.min(size - a, Math.max(0, end / k));
    return [a, b];
  };
  const [top, bottom] = axis(box.top - section.top, section.top + section.height - (box.top + box.height), height);
  const [left, right] = axis(box.left - section.left, section.left + section.width - (box.left + box.width), width);
  return `inset(${px(top)} ${px(right)} ${px(bottom)} ${px(left)})`;
}
