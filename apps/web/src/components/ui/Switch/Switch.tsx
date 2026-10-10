"use client";

import { motion } from "motion/react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type SwitchProps = Omit<ComponentPropsWithRef<"button">, "onChange" | "children" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Visible label (clicking it toggles). Without it, pass `aria-label`. */
  label?: ReactNode;
  size?: "sm" | "md";
};

const dims = {
  sm: { track: "h-4 w-7", thumb: "size-3 rounded-[6px]", travel: 12 },
  md: { track: "h-5 w-9", thumb: "size-4 rounded-[8px]", travel: 16 },
} as const;

export function Switch({ checked, onCheckedChange, label, size = "md", disabled, className, onClick, type = "button", ...props }: SwitchProps) {
  const d = dims[size];
  const control = (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-control border p-[1px] transition-[background-color,border-color] duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        checked ? "glow-purple border-transparent bg-accent-cta" : "border-app-strong bg-white/[0.08] hover:bg-white/[0.12]",
        d.track,
        className,
      )}
      {...props}
    >
      <motion.span
        aria-hidden
        className={cn("block bg-white shadow-[0_1px_2px_oklch(0_0_0/0.4)]", d.thumb)}
        initial={false}
        animate={{ x: checked ? d.travel : 0 }}
        transition={snappy}
      />
    </button>
  );
  if (label === undefined) return control;
  return (
    <label className={cn("inline-flex items-center gap-2.5 text-small text-fg", disabled ? "opacity-45" : "cursor-pointer")}>
      {control}
      <span>{label}</span>
    </label>
  );
}
