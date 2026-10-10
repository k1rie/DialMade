"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { FEATURED_SAMPLE } from "@/components/SampleLogos";
import { smooth } from "@/lib/motion";
import { CompareIcon } from "../icons";

export type HeroSampleState = "idle" | "hover" | "busy" | "drag";

/** Brisa's palette, light to dark: what the drop turns into. */
const STRIPES = ["#FCE7DF", "#FFAE97", "#FF5A36", "#3B4F7A", "#1B2A4A"] as const;
const LABELED = 2;

const poses: Record<HeroSampleState, { y: number; scale: number; split: number; glow: number }> = {
  idle: { y: 0, scale: 1, split: 0.56, glow: 0 },
  hover: { y: -6, scale: 1, split: 0.46, glow: 0.55 },
  busy: { y: -6, scale: 1, split: 0.42, glow: 0.8 },
  drag: { y: -10, scale: 1.03, split: 0.36, glow: 1 },
};

/**
 * Decorative before/after card (logo | palette) in the middle of the drop zone. It is still at rest
 * and only floats on hover, file drag or while reading; nothing loops.
 */
export function HeroSample({ state }: { state: HeroSampleState }) {
  const pose = poses[state];
  return (
    <motion.div aria-hidden className="relative" initial={false} animate={{ y: pose.y, scale: pose.scale }} transition={smooth}>
      <motion.div
        className="pointer-events-none absolute -inset-10 -z-10 blur-2xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.62 0.24 300 / 0.4), transparent)" }}
        initial={false}
        animate={{ opacity: pose.glow }}
        transition={smooth}
      />
      <div className="relative h-[150px] w-[240px] overflow-hidden rounded-card border border-white/12 bg-[oklch(0.965_0.004_285)] shadow-lift sm:h-[168px] sm:w-[272px]">
        <motion.div
          className="absolute inset-0 grid place-items-center"
          initial={false}
          animate={{ x: `${(pose.split / 2 - 0.5) * 100}%`, scale: state === "drag" ? 1.06 : 1 }}
          transition={smooth}
        >
          <Image src={FEATURED_SAMPLE.src} alt="" width={64} height={64} unoptimized draggable={false} className="size-16" />
        </motion.div>
        <motion.div className="absolute inset-0 flex flex-col" initial={false} animate={{ x: `${pose.split * 100}%` }} transition={smooth}>
          {STRIPES.map((color, index) => (
            <span key={color} className="relative flex flex-1 items-center pl-6" style={{ backgroundColor: color }}>
              {index === LABELED && <span className="font-mono text-[10px] leading-none tracking-wide text-white/85">{color}</span>}
            </span>
          ))}
          <span className="absolute inset-y-0 left-0 w-px bg-white shadow-[0_0_12px_oklch(1_0_0/0.6)]" />
          <span className="absolute top-1/2 left-0 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[9px] bg-white text-[oklch(0.25_0.02_285)] shadow-[0_2px_10px_oklch(0_0_0/0.35)]">
            <CompareIcon className="size-3.5" />
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
