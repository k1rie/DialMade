"use client";

import { motion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Icon-only segment: the label becomes the accessible name and the tooltip. */
  iconOnly?: boolean;
};

export type SegmentedProps<T extends string> = {
  /** Accessible name of the group. */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Unique per instance: the active pill animates between segments with it. */
  layoutId: string;
  size?: "sm" | "md";
  className?: string;
};

/** Radio group styled as a segmented control (roving tabindex, arrow keys). */
export function Segmented<T extends string>({ label, value, options, onChange, layoutId, size = "md", className }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const delta = keys[event.key];
    const current = options.findIndex((option) => option.value === value);
    let next: number | undefined;
    if (delta !== undefined) next = (current + delta + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-control border border-app bg-white/[0.03] p-0.5", className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const button = (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.iconOnly ? option.label : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium transition-colors duration-150",
              " [&_svg]:size-3.5",
              size === "sm" ? "h-6 text-caption" : "h-7 text-small",
              option.iconOnly ? (size === "sm" ? "w-7" : "w-8") : "px-2.5",
              checked ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {checked && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-[8px] border border-app-strong bg-surface-hover shadow-surface"
                transition={snappy}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {option.icon}
              {!option.iconOnly && option.label}
            </span>
          </button>
        );
        return option.iconOnly ? (
          <Tooltip key={option.value} content={option.label} side="bottom">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </div>
  );
}
