"use client";

import type { CSSProperties } from "react";
import { StatCard } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { appStrings } from "../content";
import { DeltaBadge } from "../DeltaBadge";
import type { KpiRowProps } from "./schema";
import "./KpiRow.css";

const fitted = (value: string) => (
  <span className="dl-app-kpis__value-text" style={{ "--_kpi-chars": Math.max(1, value.length) } as CSSProperties}>
    {value}
  </span>
);

/** Key metrics: one card per KPI with its delta and trend, or a single strip with dividers. */
export function KpiRow({ items, count, comparison, showTrend, variant, ctx }: SectionComponentProps<KpiRowProps>) {
  const visible = items.slice(0, count);
  return (
    <section className="dl-app-kpis" data-variant={variant} aria-label={appStrings(ctx.locale).keyMetrics}>
      {variant === "strip" ? (
        <div className="dl-app-kpis__strip">
          {visible.map((item) => (
            <div key={item.id} className="dl-app-kpis__cell">
              <p className="dl-app-kpis__label">{item.label}</p>
              <p className="dl-app-kpis__value">{fitted(item.value)}</p>
              <p className="dl-app-kpis__change">
                <DeltaBadge delta={item.delta} invert={item.invert} locale={ctx.locale} size="sm" />
                <span className="dl-app-kpis__comparison">{comparison}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="dl-app-kpis__grid">
          {visible.map((item) => (
            <StatCard
              key={item.id}
              className="dl-app-kpis__card"
              label={item.label}
              value={fitted(item.value)}
              delta={item.delta}
              deltaLabel={comparison}
              invertDelta={item.invert}
              {...(item.icon && { icon: item.icon })}
              {...(showTrend && { trend: item.trend })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
