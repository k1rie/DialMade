import type { Transition } from "motion/react";

/** Apple-like ease-out (DESIGN-BRIEF §4). Feedback ≤200 ms, state changes ≤400 ms, signature moments ≤900 ms. */
export const ease = [0.22, 1, 0.36, 1] as const;

export const snappy = { type: "spring", stiffness: 520, damping: 34 } as const satisfies Transition;
export const smooth = { type: "spring", stiffness: 260, damping: 30 } as const satisfies Transition;

/**
 * What reduced motion collapses everything to: a 150 ms fade. `MotionConfig reducedMotion="user"`
 * only drops transforms and layout, so opacity and filter take this transition by hand.
 */
export const reducedFade: Transition = { duration: 0.15, ease: "linear" };
