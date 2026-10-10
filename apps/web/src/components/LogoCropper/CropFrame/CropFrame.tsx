"use client";

import { motion, type MotionValue } from "motion/react";
import type { KeyboardEvent, RefObject } from "react";
import { cn } from "@/lib/cn";
import { CROP_DIM } from "../constants";
import { HANDLES, type Handle } from "../geometry";

type Box = { left: MotionValue<number>; top: MotionValue<number>; width: MotionValue<number>; height: MotionValue<number> };

export type CropFrameProps = {
  box: Box;
  frameRef: RefObject<HTMLDivElement | null>;
  dragging: boolean;
  label: string;
  roleDescription: string;
  describedBy: string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

const POSITION: Record<Handle, string> = {
  nw: "left-0 top-0 cursor-nwse-resize",
  n: "left-1/2 top-0 cursor-ns-resize",
  ne: "left-full top-0 cursor-nesw-resize",
  e: "left-full top-1/2 cursor-ew-resize",
  se: "left-full top-full cursor-nwse-resize",
  s: "left-1/2 top-full cursor-ns-resize",
  sw: "left-0 top-full cursor-nesw-resize",
  w: "left-0 top-1/2 cursor-ew-resize",
};

const KNOB: Record<Handle, string> = {
  nw: "size-2.5",
  ne: "size-2.5",
  se: "size-2.5",
  sw: "size-2.5",
  n: "h-1.5 w-4",
  s: "h-1.5 w-4",
  e: "h-4 w-1.5",
  w: "h-4 w-1.5",
};

// Edges first so the corners win where they overlap on small crops.
const ORDER = [...HANDLES].sort((a, b) => a.length - b.length);

/** Crop rectangle over the stage: dims the outside, 8 resize handles, thirds grid while dragging. */
export function CropFrame({ box, frameRef, dragging, label, roleDescription, describedBy, onKeyDown }: CropFrameProps) {
  return (
    <>
      <motion.div aria-hidden className="pointer-events-none absolute" style={{ ...box, boxShadow: `0 0 0 9999px ${CROP_DIM}` }} />
      <motion.div
        ref={frameRef}
        role="application"
        aria-roledescription={roleDescription}
        aria-label={label}
        aria-describedby={describedBy}
        tabIndex={0}
        data-crop-body=""
        onKeyDown={onKeyDown}
        className={cn("absolute rounded-[2px] outline-offset-4", dragging ? "cursor-grabbing" : "cursor-move")}
        style={box}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 border border-white/90 shadow-[0_0_0_1px_oklch(0_0_0/0.3)]" />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={false}
          animate={{ opacity: dragging ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <span className="absolute inset-y-0 left-1/3 w-px bg-white/45" />
          <span className="absolute inset-y-0 left-2/3 w-px bg-white/45" />
          <span className="absolute inset-x-0 top-1/3 h-px bg-white/45" />
          <span className="absolute inset-x-0 top-2/3 h-px bg-white/45" />
        </motion.span>
        {ORDER.map((handle) => (
          <span
            key={handle}
            aria-hidden
            data-handle={handle}
            className={cn("group/handle absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center", POSITION[handle])}
          >
            <span
              className={cn(
                "pointer-events-none block rounded-[3px] bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.35),0_1px_3px_oklch(0_0_0/0.4)]",
                "transition-transform duration-150 ease-out group-hover/handle:scale-125",
                KNOB[handle],
              )}
            />
          </span>
        ))}
      </motion.div>
    </>
  );
}
