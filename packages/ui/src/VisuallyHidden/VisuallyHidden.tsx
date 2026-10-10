import type { HTMLAttributes } from "react";
import { cx } from "../lib/cx";
import "./VisuallyHidden.css";

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  as?: "span" | "div";
}

export function VisuallyHidden({ as: Tag = "span", className, ...props }: VisuallyHiddenProps) {
  return <Tag className={cx("dl-visually-hidden", className)} {...props} />;
}
