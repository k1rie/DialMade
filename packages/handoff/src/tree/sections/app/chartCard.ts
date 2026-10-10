// app.chartCard: the dashboard's main chart in a card: widget header with the range button, the period total
// with its change, and the chart (area, bars or lines) with its legend.
import type { ValueFormat } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { button, card, column, records, row, str, strings, text } from "../../nodes";
import { chart, type ChartType } from "./chart";
import { axisFormatter, chartSummary, deltaBadge, elementWidth, widgetHeader } from "./shared";

const CHART_TYPES: readonly ChartType[] = ["area", "bar", "line"];

export const chartCardBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const type = CHART_TYPES.find((item) => item === variant) ?? "area";
  const format = (str(props.format) || "number") as ValueFormat;
  const series = records(props.series).map((item) => ({
    name: str(item.name),
    values: Array.isArray(item.values) ? item.values.filter((v): v is number => typeof v === "number") : [],
  }));
  const categories = strings(props.categories, (item) => item.label);
  const summary = chartSummary(series[0]?.values ?? [], format, ctx.locale);
  const padding = build.light.components.card.padding.px;
  const width = elementWidth(build, id, "app.chartCard") - 2 * padding;
  return card(
    "Chart card",
    [
      widgetHeader(props.title, null, [button(props.rangeLabel, { variant: "outline", size: "sm", icon: "chevron-down" })]),
      props.showSummary === true
        ? column({ name: "Summary", width: "fill", gap: { px: 2 } }, [
            text(props.totalLabel, "caption", { color: "muted-foreground", tag: "span" }),
            row({ name: "Total", align: "center", gap: 3, wrap: true }, [
              text(summary.value, "h2", { color: "card-foreground", tag: "span" }),
              deltaBadge(summary.delta, ctx.locale),
            ]),
          ])
        : null,
      chart({
        type,
        title: str(props.title),
        categories,
        series,
        height: type === "bar" ? 248 : 236,
        width,
        formatValue: axisFormatter(format, ctx.locale),
        showLegend: props.showLegend === true && series.length > 1,
      }),
    ],
    { gap: 4, tag: "section" },
  );
};
