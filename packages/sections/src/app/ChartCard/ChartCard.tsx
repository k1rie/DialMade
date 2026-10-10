"use client";

import { Button, Card, Chart, type ChartType } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { DeltaBadge } from "../DeltaBadge";
import { WidgetHeader } from "../WidgetHeader";
import type { ChartCardProps } from "./schema";
import { axisFormatter, chartSummary } from "./summary";
import "./ChartCard.css";

const CHART_TYPES: readonly ChartType[] = ["area", "bar", "line"];

/** The main chart of the dashboard, with the period total and its change on top. */
export function ChartCard({
  title,
  rangeLabel,
  categoryLabel,
  categories,
  series,
  format,
  totalLabel,
  showSummary,
  showLegend,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<ChartCardProps>) {
  const type = CHART_TYPES.find((item) => item === variant) ?? "area";
  const titleId = `${elementId}-title`;
  const summary = chartSummary(series[0]?.values ?? [], format, ctx.locale);
  return (
    <Card as="section" className="dl-app-chart" aria-labelledby={titleId}>
      <WidgetHeader
        id={titleId}
        title={title}
        actions={
          <Button variant="outline" size="sm" iconEnd="chevron-down">
            {rangeLabel}
          </Button>
        }
      />
      {showSummary ? (
        <div className="dl-app-chart__summary">
          <span className="dl-app-chart__total-label">{totalLabel}</span>
          <span className="dl-app-chart__total">
            <span className="dl-app-chart__total-value">{summary.value}</span>
            <DeltaBadge delta={summary.delta} locale={ctx.locale} />
          </span>
        </div>
      ) : null}
      <Chart
        className="dl-app-chart__chart"
        type={type}
        title={title}
        categories={categories}
        series={series}
        categoryLabel={categoryLabel}
        showLegend={showLegend && series.length > 1}
        height={type === "bar" ? 248 : 236}
        formatValue={axisFormatter(format, ctx.locale)}
      />
    </Card>
  );
}
