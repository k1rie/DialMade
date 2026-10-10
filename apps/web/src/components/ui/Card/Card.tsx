import { createElement, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "li" | "section";
  ref?: Ref<HTMLElement>;
  /** Hover state (border + surface) for clickable cards. */
  interactive?: boolean;
  /** Selected: purple glow (DESIGN-BRIEF: selected element, valid drop target, main CTA). */
  selected?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = { none: "", sm: "p-3", md: "p-4", lg: "p-6" } as const;

export function Card({ as = "div", interactive = false, selected = false, padding = "md", className, ...props }: CardProps) {
  return createElement(as, {
    "data-selected": selected || undefined,
    className: cn(
      "relative rounded-card border bg-surface shadow-surface transition-[background-color,border-color] duration-150",
      selected ? "glow-purple border-transparent" : "border-app",
      interactive && !selected && "hover:border-app-strong hover:bg-surface-hover",
      paddings[padding],
      className,
    ),
    ...props,
  });
}
