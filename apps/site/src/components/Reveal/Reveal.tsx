"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ease, reducedFade } from "@/lib/motion";

export type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds, for staggering siblings. 300 ms + up to 100 ms of delay stays within the 400 ms state budget. */
  delay?: number;
  as?: "div" | "li" | "section";
};

/**
 * Fades a block in the first time it enters the viewport (≤400 ms). Reduced motion: MotionConfig drops the
 * rise, and the rest becomes a 150 ms fade with no delay. The animated keys stay the same either way, so the
 * server markup matches the first client render.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const Tag = motion[as];
  const reduce = useReducedMotion();
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduce ? reducedFade : { duration: 0.3, ease, delay }}
    >
      {children}
    </Tag>
  );
}
