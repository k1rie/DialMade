// The kit's `Chart` (area, bar, line) drawn with shapes: y ticks and dashed grid lines, series as thin columns
// (a 2 px line over a fading area) or rounded bars, points, x labels and the legend. Layers share one overlay
// cell (grid, series, points), the way the SVG paints them in order.
import { niceDomain } from "@dialmade/ui";
import type { BuildContext } from "../../context";
import { column, row, shape, text } from "../../nodes";
import type { ColorVar, DesignNode, FrameNode } from "../../types";
import { overlay, plotColumn } from "./shared";

export type ChartType = "area" | "bar" | "line";

export interface ChartInput {
  build: BuildContext;
  type: ChartType;
  title: string;
  categories: readonly string[];
  series: readonly { name: string; values: readonly number[] }[];
  /** Height of the SVG (236 for area/line, 248 for bars in the chart card). */
  height: number;
  /** Estimated width of the chart in px (bar widths, tick thinning). */
  width: number;
  formatValue: (value: number) => string;
  showLegend: boolean;
}

const MARGIN = { top: 12, right: 12, bottom: 28 };
/** Tick label line box (11 px text). */
const TICK_LINE = 16;
/** Columns an area or line is drawn with across the plot. */
const SAMPLES = 48;

const seriesColor = (index: number): ColorVar => `chart-${(index % 5) + 1}`;

/** Monotone cubic interpolation (Fritsch–Carlson), the curve the kit draws through the points. */
function monotone(values: readonly number[]): (t: number) => number {
  const n = values.length;
  if (n < 2) return () => values[0] ?? 0;
  const d = values.slice(1).map((v, i) => v - values[i]!);
  const m = values.map((_, i) => (i === 0 ? d[0]! : i === n - 1 ? d[n - 2]! : d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i]!;
      m[i + 1] = k * b * d[i]!;
    }
  }
  return (t: number) => {
    const at = Math.max(0, Math.min(n - 1, t * (n - 1)));
    const i = Math.min(n - 2, Math.floor(at));
    const u = at - i;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
    const h10 = u ** 3 - 2 * u ** 2 + u;
    const h01 = -2 * u ** 3 + 3 * u ** 2;
    const h11 = u ** 3 - u ** 2;
    return h00 * values[i]! + h10 * m[i]! + h01 * values[i + 1]! + h11 * m[i + 1]!;
  };
}

/** `ChartLegend`: a swatch and the name of each series. */
export function chartLegend(names: readonly string[]): FrameNode {
  return row(
    { name: "Legend", tag: "ul", width: "fill", align: "center", gap: 4, wrap: true },
    names.map((name, i) =>
      row({ name: "Legend item", tag: "li", align: "center", gap: 2 }, [
        shape({ name: "Swatch", width: 10, height: 10, radius: "sm", fill: { color: seriesColor(i) }, role: "decor" }),
        text(name, "caption", { color: "muted-foreground", tag: "span" }),
      ]),
    ),
  );
}

export function chart(input: ChartInput): FrameNode {
  const { type, categories, series, height, formatValue } = input;
  const domain = niceDomain(series.flatMap((item) => item.values));
  const tickLabels = domain.ticks.map(formatValue);
  const left = Math.max(...tickLabels.map((label) => label.length), 1) * 6.5 + 14;
  const plotW = Math.max(40, input.width - left - MARGIN.right);
  const plotH = Math.max(40, height - MARGIN.top - MARGIN.bottom);
  const span = domain.max - domain.min || 1;
  /** Px from the plot's top for a value. */
  const y = (value: number) => ((domain.max - value) / span) * plotH;
  const base = y(Math.max(domain.min, Math.min(0, domain.max)));
  const count = categories.length;

  const gridLayer = column(
    { name: "Grid", width: "fill", height: plotH, justify: "between" },
    [...domain.ticks].reverse().map((tick) =>
      tick === 0
        ? shape({ name: "Baseline", width: "fill", height: 1, fill: { color: "border-strong" }, role: "decor" })
        : shape({ name: "Grid line", width: "fill", height: 1, stroke: { color: "border", sides: ["top"], dashed: true }, role: "decor" }),
    ),
  );

  const layers: FrameNode[] = [gridLayer];
  if (type === "bar") {
    const band = plotW / Math.max(1, count);
    const groupWidth = Math.min(band * 0.72, series.length * 40 + (series.length - 1) * 4);
    const gap = series.length > 1 ? Math.min(4, groupWidth * 0.08) : 0;
    const barWidth = Math.max(1, (groupWidth - gap * (series.length - 1)) / Math.max(1, series.length));
    layers.push(
      row(
        { name: "Bars", width: "fill", height: plotH, align: "end" },
        categories.map((category, index) =>
          row({ name: `Band/${category}`, width: "fill", height: plotH, justify: "center", align: "end", padding: { bottom: { px: Math.max(0, plotH - base) } } }, [
            row(
              { name: "Group", align: "end", gap: { px: Math.round(gap * 10) / 10 } },
              series.map((item, s) => {
                const value = item.values[index] ?? 0;
                return shape({
                  name: `Bar/${item.name}`,
                  role: "bar",
                  width: Math.round(barWidth * 10) / 10,
                  height: Math.max(1, Math.round(Math.abs(base - y(value)) * 10) / 10),
                  radius: "sm",
                  fill: { color: seriesColor(s) },
                });
              }),
            ),
          ]),
        ),
      ),
    );
  } else {
    series.forEach((item, s) => {
      const color = seriesColor(s);
      const values = item.values.slice(0, count);
      const curve = monotone(values);
      const area = type === "area" ? { gradient: { angle: 180, stops: [{ color, opacity: 0.32, at: 0 }, { color, opacity: 0.04, at: 1 }] } } : null;
      layers.push(
        row(
          { name: `Series/${item.name}`, width: "fill", height: plotH, align: "end" },
          Array.from({ length: SAMPLES }, (_, k) => {
            const top = y(curve((k + 0.5) / SAMPLES));
            return plotColumn(`c${k}`, plotH, top - 1, color, area, 2.25);
          }),
        ),
      );
      if (count > 1 && count <= 16) {
        layers.push(
          row(
            { name: `Points/${item.name}`, width: "fill", height: plotH, justify: "between" },
            values.map((value, i) =>
              column({ name: `Point ${i + 1}`, width: 8, height: plotH, padding: { top: { px: Math.max(0, Math.round((y(value) - 4) * 10) / 10) } } }, [
                shape({ name: "Point", shape: "ellipse", width: 8, height: 8, fill: { color: "card" }, stroke: { color, width: 2 }, role: "decor" }),
              ]),
            ),
          ),
        );
      }
    });
  }

  const labelWidth = Math.max(...categories.map((category) => category.length), 1) * 6.5 + 14;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / labelWidth))));
  // `.dl-chart__tick`: 11 px.
  const tickScale = Math.round((11 / (input.build.light.fontSizes.caption.px || 12)) * 10000) / 10000;
  const tick = (label: string, align: "start" | "center" | "end" = "center") =>
    text(label, "caption", { color: "muted-foreground", align, tag: "span", scale: tickScale });
  const xLabels: DesignNode[] =
    type === "bar" || count <= 1
      ? categories.map((category, i) =>
          row({ name: "Tick", width: "fill", justify: "center" }, [i % labelEvery === 0 ? tick(category) : null]),
        )
      : categories.flatMap((category, i) => (i % labelEvery === 0 ? [tick(category, i === 0 ? "start" : i === count - 1 ? "end" : "center")!] : []));

  // Tick labels on the start (centered on their grid lines, so the column is a line taller than the plot),
  // the plot's layers on top of each other beside them.
  const yTicks = column(
    { name: "Y ticks", width: Math.round(left - 8), height: plotH + TICK_LINE, justify: "between", align: "end" },
    [...tickLabels].reverse().map((label) => tick(label, "end")),
  );
  const plot = overlay("Plot", plotH, layers, { label: input.title });
  return column({ name: "Chart", tag: "figure", width: "fill", gap: 3, label: input.title }, [
    column({ name: "Canvas", width: "fill", padding: { top: { px: MARGIN.top - TICK_LINE / 2 }, right: { px: MARGIN.right } } }, [
      row({ name: "Axes", width: "fill", align: "start", gap: { px: 8 } }, [
        yTicks,
        column({ name: "Plot area", width: "fill", padding: { y: { px: TICK_LINE / 2 } } }, [plot]),
      ]),
      row(
        { name: "X ticks", width: "fill", justify: type === "bar" || count <= 1 ? "start" : "between", padding: { left: { px: Math.round(left) }, top: { px: 18 - TICK_LINE + TICK_LINE / 2 } } },
        xLabels,
      ),
    ]),
    input.showLegend ? chartLegend(series.map((item) => item.name)) : null,
  ]);
}
