"use client";

import { useId, type HTMLAttributes, type ReactNode } from "react";
import { formatNumber } from "../lib/format";
import { cx } from "../lib/cx";
import { useUiLocale } from "../UiProvider";
import "./Progress.css";

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Sin `value`, la barra es indeterminada. */
  value?: number;
  max?: number;
  /** Etiqueta visible. Si no hay, pasa `aria-label`. */
  label?: ReactNode;
  showValue?: boolean;
  /** Texto que se anuncia y se muestra en lugar del porcentaje («3 de 5 pasos»). */
  valueText?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "success" | "warning" | "destructive" | "cta";
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  valueText,
  size = "md",
  variant = "primary",
  className,
  ...props
}: ProgressProps) {
  const locale = useUiLocale();
  const labelId = useId();
  const indeterminate = value === undefined;
  const ratio = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));
  const percent = formatNumber(ratio, locale, { style: "percent", maximumFractionDigits: 0 });
  const display = valueText ?? percent;
  return (
    <div
      className={cx("dl-progress", className)}
      data-size={size}
      data-variant={variant}
      data-indeterminate={indeterminate ? "" : undefined}
    >
      {(label != null || (showValue && !indeterminate)) && (
        <div className="dl-progress__header">
          {label != null && (
            <span id={labelId} className="dl-progress__label">
              {label}
            </span>
          )}
          {showValue && !indeterminate && (
            <span className="dl-progress__value" aria-hidden="true">
              {display}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-labelledby={label != null ? labelId : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={indeterminate ? undefined : display}
        className="dl-progress__track"
        {...props}
      >
        <div className="dl-progress__indicator" style={indeterminate ? undefined : { width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
