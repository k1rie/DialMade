"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type ChipProps = Omit<ComponentPropsWithRef<"button">, "onChange"> & {
  /** When defined the chip is a toggle (aria-pressed). */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Leading slot: icon or color dot. */
  leading?: ReactNode;
  size?: "sm" | "md";
};

export function Chip({ selected, onSelectedChange, leading, size = "md", className, children, onClick, type = "button", ...props }: ChipProps) {
  const toggle = selected !== undefined;
  return (
    <button
      type={type}
      aria-pressed={toggle ? selected : undefined}
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (toggle && !event.defaultPrevented) onSelectedChange?.(!selected);
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 rounded-chip border font-medium whitespace-nowrap",
        "transition-[background-color,color,border-color] duration-150 disabled:pointer-events-none disabled:opacity-45",
        size === "sm" ? "h-6 px-2 text-caption" : "h-7 px-2.5 text-small",
        selected
          ? "glow-purple border-transparent bg-accent-soft text-fg"
          : "border-app bg-white/[0.03] text-muted hover:border-app-strong hover:text-fg",
        className,
      )}
      {...props}
    >
      {leading !== undefined && (
        <motion.span className="inline-flex" animate={{ scale: selected ? 1.08 : 1 }} transition={snappy}>
          {leading}
        </motion.span>
      )}
      {children}
    </button>
  );
}
