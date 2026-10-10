"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { buttonBase, buttonVariants, iconButtonSizes, Spinner, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type IconButtonProps = Omit<HTMLMotionProps<"button">, "children" | "aria-label"> & {
  /** Accessible name (also the tooltip text). */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** `false` hides the tooltip; a node replaces the label in it. Default: shows `label`. */
  tooltip?: boolean | ReactNode;
  tooltipSide?: "top" | "bottom";
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  loading = false,
  tooltip = true,
  tooltipSide = "top",
  disabled,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const button = (
    <motion.button
      type={type}
      aria-label={label}
      disabled={disabled}
      aria-busy={loading || undefined}
      whileTap={disabled || loading ? undefined : { scale: 0.92 }}
      transition={snappy}
      className={cn(buttonBase, "gap-0 px-0", iconButtonSizes[size], buttonVariants[variant], className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
    </motion.button>
  );
  if (tooltip === false) return button;
  return (
    <Tooltip content={tooltip === true ? label : tooltip} side={tooltipSide}>
      {button}
    </Tooltip>
  );
}
