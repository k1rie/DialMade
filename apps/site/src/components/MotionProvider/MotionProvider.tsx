"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { smooth } from "@/lib/motion";

/** Same motion contract as apps/web: reduced motion honors the OS setting, `smooth` by default. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={smooth}>
      {children}
    </MotionConfig>
  );
}
