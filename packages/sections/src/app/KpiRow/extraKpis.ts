import { formatValue } from "../../content/format";
import { kpiList, localize } from "../../content/generators";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import type { ProfileKpi, ValueFormat } from "../../content/types";
import type { ContentContext } from "../../types";
import type { KpiItem } from "./schema";

/** Product-neutral KPIs that pad the profile's four up to the six the canvas allows (skipping ids it has). */
const NEUTRAL_KPIS: readonly ProfileKpi[] = [
  { id: "active-users", label: t("Usuarios activos", "Active users"), format: "number", min: 1200, max: 9800, deltaMax: 12, icon: "users" },
  { id: "conversion", label: t("Conversión", "Conversion"), format: "percent", min: 1.5, max: 6.5, deltaMax: 9, icon: "bar-chart" },
  { id: "satisfaction", label: t("Satisfacción", "Satisfaction"), format: "decimal", min: 4.1, max: 4.9, deltaMax: 3, unit: t(" /5", " /5"), icon: "sparkle" },
  { id: "pending", label: t("Pendientes", "Pending"), format: "number", min: 6, max: 48, deltaMax: 20, invert: true, icon: "inbox" },
];

const digitsOf = (format: ValueFormat) => (format === "percent" || format === "decimal" ? 1 : 0);
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function itemOf(kpi: ProfileKpi, ctx: ContentContext): KpiItem {
  const r = rngFor(ctx.seed, `kpis-extra:${kpi.id}`);
  const digits = digitsOf(kpi.format);
  const value = round(r.float(kpi.min, kpi.max), digits);
  const sign = (r.chance(0.75) ? 1 : -1) * (kpi.invert ? -1 : 1);
  const delta = round(sign * r.float(Math.min(1, kpi.deltaMax), kpi.deltaMax), 1);
  const start = value / (1 + delta / 100);
  const trend = Array.from({ length: 10 }, (_, i) =>
    i === 9 ? value : round(Math.max(0, (start + ((value - start) * i) / 9) * (1 + r.float(-0.04, 0.04))), digits),
  );
  return {
    id: kpi.id,
    label: localize(kpi.label, ctx),
    value: `${formatValue(value, kpi.format, ctx.locale)}${kpi.unit ? localize(kpi.unit, ctx) : ""}`,
    delta,
    invert: Boolean(kpi.invert),
    ...(kpi.icon && { icon: kpi.icon }),
    trend,
  };
}

/** `count` KPIs (max 6): the profile's own first, then neutral ones. */
export function kpiItems(ctx: ContentContext, count: number): KpiItem[] {
  const own: KpiItem[] = kpiList(ctx, count).map(({ id, label, display, delta, invert, icon, trend }) => ({
    id,
    label,
    value: display,
    delta,
    invert,
    ...(icon && { icon }),
    trend,
  }));
  const taken = new Set(own.map((item) => item.id));
  const extra = NEUTRAL_KPIS.filter((kpi) => !taken.has(kpi.id)).slice(0, Math.max(0, count - own.length));
  return [...own, ...extra.map((kpi) => itemOf(kpi, ctx))];
}
