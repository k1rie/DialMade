import type { HTMLAttributes } from "react";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import type { Size } from "../lib/types";
import "./Badge.css";

export type BadgeVariant = "default" | "neutral" | "success" | "warning" | "info" | "destructive" | "outline";

export const BADGE_VARIANTS: readonly BadgeVariant[] = [
  "default",
  "neutral",
  "success",
  "warning",
  "info",
  "destructive",
  "outline",
];

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** `soft`: fondo tintado; `solid`: color lleno con su par de contraste. */
  appearance?: "soft" | "solid";
  size?: Size;
  dot?: boolean;
  icon?: IconSlot;
}

export function Badge({
  variant = "default",
  appearance = "soft",
  size = "md",
  dot,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx("dl-badge", className)}
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      {...props}
    >
      {dot && <span className="dl-badge__dot" aria-hidden="true" />}
      {renderIcon(icon, "dl-badge__icon")}
      {children}
    </span>
  );
}
