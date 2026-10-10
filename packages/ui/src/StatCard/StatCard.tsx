"use client";

import type { ReactNode } from "react";
import { Card, type CardProps } from "../Card";
import { Icon } from "../Icon";
import { renderIcon, type IconSlot } from "../Icon/renderIcon";
import { cx } from "../lib/cx";
import { formatDeltaPercent } from "../lib/format";
import { useUiLocale, useUiStrings } from "../UiProvider";
import { VisuallyHidden } from "../VisuallyHidden";
import { Sparkline } from "./Sparkline";
import "./StatCard.css";

export interface StatCardProps extends Omit<CardProps, "children"> {
  label: ReactNode;
  value: ReactNode;
  /** Variación en porcentaje (12.5 = +12,5 %). */
  delta?: number;
  /** Contexto del delta («vs. el mes pasado»). */
  deltaLabel?: ReactNode;
  /** Cuando subir es malo (churn, errores, coste): invierte los colores del delta. */
  invertDelta?: boolean;
  icon?: IconSlot;
  /** Serie para la mini tendencia. */
  trend?: readonly number[];
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  invertDelta = false,
  icon,
  trend,
  className,
  ...props
}: StatCardProps) {
  const locale = useUiLocale();
  const strings = useUiStrings();
  const direction = delta == null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") !== invertDelta;
  const sentiment = good === null ? "neutral" : good ? "positive" : "negative";
  const trendText = direction === "up" ? strings.trendUp : direction === "down" ? strings.trendDown : strings.trendFlat;
  return (
    <Card className={cx("dl-stat", className)} {...props}>
      <div className="dl-stat__header">
        <p className="dl-stat__label">{label}</p>
        {icon != null && <span className="dl-stat__icon">{renderIcon(icon)}</span>}
      </div>
      <p className="dl-stat__value">{value}</p>
      {(delta != null || deltaLabel != null) && (
        <div className="dl-stat__footer">
          {delta != null && (
            <span className="dl-stat__delta" data-trend={direction} data-sentiment={sentiment}>
              {direction !== "flat" && <Icon name={direction === "up" ? "arrow-up-right" : "arrow-down-right"} />}
              <VisuallyHidden>{trendText} </VisuallyHidden>
              {formatDeltaPercent(delta, locale)}
            </span>
          )}
          {deltaLabel != null && <span className="dl-stat__delta-label">{deltaLabel}</span>}
        </div>
      )}
      {trend && trend.length > 1 && <Sparkline values={trend} sentiment={sentiment} />}
    </Card>
  );
}
