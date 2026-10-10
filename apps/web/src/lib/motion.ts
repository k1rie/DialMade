import type { Transition, Variants } from "motion/react";

/** Apple-like ease-out (DESIGN-BRIEF §4). */
export const ease = [0.22, 1, 0.36, 1] as const;
export const easeCss = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Seconds. Feedback ≤200 ms, state changes ≤400 ms, signature moments ≤900 ms (skippable). */
export const durations = {
  feedback: 0.18,
  state: 0.32,
  signature: 0.9,
  reduced: 0.15,
} as const;

export const snappy = { type: "spring", stiffness: 520, damping: 34 } as const satisfies Transition;
export const smooth = { type: "spring", stiffness: 260, damping: 30 } as const satisfies Transition;
export const gentle = { type: "spring", stiffness: 140, damping: 22 } as const satisfies Transition;

export const springs = { snappy, smooth, gentle } as const;
export type SpringName = keyof typeof springs;

/** Tween with the app curve. */
export const tween = (duration: number = durations.state): Transition => ({ duration, ease });

/** What reduced motion collapses everything to. */
export const reducedFade: Transition = { duration: durations.reduced, ease: "linear" };

export const feedback: Transition = { duration: durations.feedback, ease };

/** LogoBurst → Palette Lab: the swatches flying into the grid (shared `swatchLayoutId`), the end of the signature moment. */
export const swatchFlight: Transition = tween(0.26);

/** Enter/exit for whole steps or panels. Transforms are dropped by MotionConfig under reduced motion. */
export const stageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ...smooth, opacity: tween(0.3), filter: tween(0.3) } },
  exit: { opacity: 0, y: -8, filter: "blur(6px)", transition: tween(0.22) },
};

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tween(0.2) },
  exit: { opacity: 0, transition: tween(0.15) },
};

export const popVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { ...snappy, opacity: tween(0.16) } },
  exit: { opacity: 0, scale: 0.98, y: 2, transition: tween(0.12) },
};
