import { chartData } from "../../content/generators";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings, chartPeriodOf } from "../content";
import { ChartCard } from "./ChartCard";
import { chartCardSchema, type ChartCardProps } from "./schema";

export const chartCardSection = defineSection<ChartCardProps>({
  type: "app.chartCard",
  kind: "app",
  label: t("Gráfica", "Chart"),
  description: t("La evolución de la métrica principal con dos series.", "The main metric over time, with two series."),
  variants: [
    { id: "area", label: t("Área", "Area") },
    { id: "bar", label: t("Barras", "Bars") },
    { id: "line", label: t("Líneas", "Lines") },
  ],
  schema: chartCardSchema,
  knobs: [
    { key: "variant", label: t("Tipo de gráfica", "Chart type"), control: "select", scope: "section" },
    { key: "showSummary", label: t("Total del periodo", "Period total"), control: "toggle", scope: "section" },
    { key: "showLegend", label: t("Leyenda", "Legend"), control: "toggle", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const strings = appStrings(ctx.locale);
    const data = chartData(ctx);
    const period = chartPeriodOf(ctx);
    return {
      title: data.title,
      rangeLabel: strings.rangeCount(data.categories.length, period),
      categoryLabel: strings.categoryLabel[period],
      categories: data.categories,
      series: data.series.map(({ name, values }) => ({ name, values })),
      format: data.format,
      totalLabel: strings.chartTotal,
      showSummary: true,
      showLegend: true,
    };
  },
  layout: {
    owns: [],
    // The chip: area when the block is wide (ratio ≥ 1.6), bars otherwise.
    fit: ({ estimate }) =>
      estimate?.kind === "variant" && (estimate.value === "area" || estimate.value === "bar") ? { variant: estimate.value } : {},
  },
  Component: ChartCard,
});
