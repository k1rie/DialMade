// app.kpiRow: the key metrics, one `StatCard` per KPI (label, icon, value, delta and trend) or a single strip
// of cells with dividers. Columns follow the grid's `auto-fit, minmax(13.5rem, 1fr)` at the block's width.
import { formatDelta } from "@dialmade/sections";
import type { SectionBuilder } from "../../context";
import { card, column, grid, icon, num, records, row, str, text } from "../../nodes";
import type { ColorVar, FrameNode } from "../../types";
import { appGap, deltaBadge, elementType, elementWidth, sparkline } from "./shared";

export type Kpi = { id: string; label: string; value: string; delta: number; invert: boolean; icon?: string; trend: number[] };

function kpis(value: unknown): Kpi[] {
  return records(value).map((item, i) => ({
    id: str(item.id) || `kpi-${i}`,
    label: str(item.label),
    value: str(item.value),
    delta: num(item.delta, 0),
    invert: item.invert === true,
    ...(typeof item.icon === "string" && { icon: item.icon }),
    trend: Array.isArray(item.trend) ? item.trend.filter((v): v is number => typeof v === "number") : [],
  }));
}

/** `.dl-stat__delta`: arrow and signed change on a tinted pill. */
function statDelta(kpi: Kpi, locale: "es" | "en"): FrameNode {
  const direction = kpi.delta === 0 ? "flat" : kpi.delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") !== kpi.invert;
  const tone: ColorVar = good === null ? "muted-foreground" : good ? "success" : "destructive";
  return row(
    { name: "Delta", align: "center", gap: { px: 2 }, padding: { top: { px: 2 }, bottom: { px: 2 }, left: { px: 4 }, right: { px: 6 } }, radius: "badge", fill: { color: tone, opacity: 0.12 } },
    [
      direction === "flat" ? null : icon(direction === "up" ? "arrow-up-right" : "arrow-down-right", tone, 12),
      text(formatDelta(kpi.delta, locale), "caption-strong", { color: tone, tag: "span" }),
    ],
  );
}

export function statCard(kpi: Kpi, comparison: string, showTrend: boolean, locale: "es" | "en"): FrameNode {
  const direction = kpi.delta === 0 ? "flat" : kpi.delta > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") !== kpi.invert;
  const sentiment = good === null ? "neutral" : good ? "positive" : "negative";
  return card(
    `Stat card/${kpi.id}`,
    [
      row({ name: "Header", width: "fill", align: "center", justify: "between", gap: 2, minHeight: 32 }, [
        text(kpi.label, "small", { color: "muted-foreground", width: "fill", tag: "p" }),
        kpi.icon
          ? row({ name: "Icon", width: 32, height: 32, align: "center", justify: "center", radius: "md", fill: { color: "primary", opacity: 0.1 } }, [
              icon(kpi.icon, "primary-text", 16),
            ])
          : null,
      ]),
      text(kpi.value, "h2", { color: "card-foreground", tag: "p" }),
      row({ name: "Footer", width: "fill", align: "center", gap: 2, wrap: true }, [
        statDelta(kpi, locale),
        text(comparison, "caption", { color: "muted-foreground", tag: "span" }),
      ]),
      showTrend ? sparkline(kpi.trend, sentiment) : null,
    ],
    { gap: 3, tag: "article" },
  );
}

export const kpiRowBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const items = kpis(props.items).slice(0, Math.max(1, num(props.count, 4)));
  const comparison = str(props.comparison);
  const gap = appGap(build.doc, id);
  const gapPx = build.light.space[gap - 1] ?? 24;
  const width = elementWidth(build, id, elementType(build.doc, id) ?? "app.kpiRow");

  if (variant === "strip") {
    const fit = Math.max(1, Math.floor(width / 192));
    const columns = Math.min(items.length, fit);
    return column({ name: "KPIs", tag: "section", width: "fill", label: "Key metrics" }, [
      grid(
        { name: "Strip", columns, gap: 0, fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card", shadow: "card", clip: true },
        items.map((kpi, i) =>
          column(
            {
              name: `Cell/${kpi.id}`,
              width: "fill",
              gap: 2,
              padding: 5,
              ...(i % columns !== 0 || i >= columns ? { stroke: { color: "border", sides: [...(i % columns !== 0 ? ["left" as const] : []), ...(i >= columns ? ["top" as const] : [])] } } : {}),
            },
            [
              text(kpi.label, "small", { color: "muted-foreground", tag: "p" }),
              text(kpi.value, "h3", { color: "card-foreground", tag: "p" }),
              row({ name: "Change", align: "center", gap: 2, wrap: true }, [
                deltaBadge(kpi.delta, ctx.locale, kpi.invert, "sm"),
                text(comparison, "caption", { color: "muted-foreground", tag: "span" }),
              ]),
            ],
          ),
        ),
      ),
    ]);
  }

  const fit = Math.max(1, Math.floor((width + gapPx) / (216 + gapPx)));
  const columns = Math.min(items.length, fit);
  return column({ name: "KPIs", tag: "section", width: "fill", label: "Key metrics" }, [
    grid(
      { name: "Cards", columns, gap },
      items.map((kpi) => statCard(kpi, comparison, props.showTrend === true, ctx.locale)),
    ),
  ]);
};
