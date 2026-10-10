import { kpiList } from "../../content/generators";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings } from "../content";
import { KpiRow } from "./KpiRow";
import { kpiRowSchema, type KpiRowProps } from "./schema";

export const kpiRowSection = defineSection<KpiRowProps>({
  type: "app.kpiRow",
  kind: "app",
  label: t("Indicadores", "KPIs"),
  description: t("Las métricas clave del producto con su variación.", "The product's key metrics and how they changed."),
  variants: [
    { id: "cards", label: t("Tarjetas", "Cards") },
    { id: "strip", label: t("Franja", "Strip") },
  ],
  schema: kpiRowSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "count", label: t("Cuántos", "How many"), control: "slider", min: 2, max: 4, step: 1, scope: "section" },
    { key: "showTrend", label: t("Tendencia", "Trend line"), control: "toggle", scope: "section" },
    { key: "comparison", label: t("Comparación", "Comparison"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const items = kpiList(ctx, 4).map(({ id, label, display, delta, invert, icon, trend }) => ({
      id,
      label,
      value: display,
      delta,
      invert,
      ...(icon && { icon }),
      trend,
    }));
    return { items, count: items.length, comparison: appStrings(ctx.locale).comparison, showTrend: true };
  },
  Component: KpiRow,
});
