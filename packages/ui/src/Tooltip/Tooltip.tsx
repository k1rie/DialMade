"use client";

import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { cx } from "../lib/cx";
import "./Tooltip.css";

export interface TooltipProps {
  content: ReactNode;
  /** El disparador: un elemento enfocable (botón, enlace) que recibe `aria-describedby`. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom" | "left" | "right";
  /** `true`: siempre visible (vista estática). Si no, aparece con hover o foco y Esc lo oculta. */
  open?: boolean;
  className?: string;
}

export function Tooltip({ content, children, side = "top", open = false, className }: TooltipProps) {
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" "),
      })
    : children;
  return (
    <span
      className={cx("dl-tooltip", className)}
      data-side={side}
      data-open={open ? "" : undefined}
      data-dismissed={dismissed && !open ? "" : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") setDismissed(true);
      }}
      onPointerLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
    >
      {trigger}
      <span role="tooltip" id={tooltipId} className="dl-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
