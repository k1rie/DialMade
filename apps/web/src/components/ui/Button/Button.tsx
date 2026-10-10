"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { Spinner } from "./Spinner";
import { buttonBase, buttonSizes, buttonVariants, type ButtonSize, type ButtonVariant } from "./variants";

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks while keeping the width. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={snappy}
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...props}
    >
      {loading ? <Spinner /> : leadingIcon}
      {children !== undefined && <span className="relative">{children}</span>}
      {!loading && trailingIcon}
    </motion.button>
  );
}
