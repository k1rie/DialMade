"use client";

import { useId, useState, type PointerEvent } from "react";
import { cx } from "../lib/cx";
import { formatCompact, formatNumber } from "../lib/format";
import { useUiLocale, useUiStrings } from "../UiProvider";
import { ChartDataTable } from "./ChartDataTable";
import { ChartLegend } from "./ChartLegend";
import { areaPath, barPath, monotonePath, type Point } from "../lib/svgPaths";
import { linearScale, niceDomain } from "./scale";
import type { ChartColor, ChartSeries, ChartType } from "./types";
import { useElementWidth } from "./useElementWidth";
import "./Chart.css";

export interface ChartProps {
  type: ChartType;
  /** Nombre accesible (`<title>` del SVG y caption de la tabla de datos). */
  title: string;
  /** Resumen para lectores de pantalla (`<desc>`). Por defecto se genera uno. */
  description?: string;
  categories: readonly string[];
  series: readonly ChartSeries[];
  height?: number;
  /** Encabezado de la columna de categorías en la tabla de datos («Mes»). */
  categoryLabel?: string;
  showTitle?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  /** Formato de los valores (ejes, tooltip y tabla). Por defecto, compacto según el idioma. */
  formatValue?: (value: number) => string;
  className?: string;
}

const FALLBACK_WIDTH = 480;
const MARGIN = { top: 12, right: 12, bottom: 28 };
const BAR_RADIUS = 4;

const colorOf = (series: ChartSeries, index: number): ChartColor => series.color ?? (((index % 5) + 1) as ChartColor);

export function Chart({
  type,
  title,
  description,
  categories,
  series,
  height = 240,
  categoryLabel,
  showTitle = false,
  showLegend = series.length > 1,
  showGrid = true,
  formatValue,
  className,
}: ChartProps) {
  const locale = useUiLocale();
  const strings = useUiStrings();
  const baseId = useId();
  const svgSafeId = baseId.replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;
  const [canvasRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const [active, setActive] = useState<number | null>(null);

  const axisFormat = formatValue ?? ((value: number) => formatCompact(value, locale));
  const fullFormat = formatValue ?? ((value: number) => formatNumber(value, locale));
  const domain = niceDomain(series.flatMap((item) => item.values));
  const tickLabels = domain.ticks.map(axisFormat);
  const left = Math.max(...tickLabels.map((label) => label.length), 1) * 6.5 + 14;
  const plot = {
    x: left,
    y: MARGIN.top,
    w: Math.max(40, width - left - MARGIN.right),
    h: Math.max(40, height - MARGIN.top - MARGIN.bottom),
  };
  const y = linearScale([domain.min, domain.max], [plot.y + plot.h, plot.y]);
  const base = y(Math.max(domain.min, Math.min(0, domain.max)));
  const count = categories.length;
  const band = plot.w / Math.max(1, count);
  const x = (index: number) =>
    type === "bar" || count <= 1 ? plot.x + band * (index + 0.5) : plot.x + (plot.w * index) / (count - 1);

  const labelWidth = Math.max(...categories.map((category) => category.length), 1) * 6.5 + 14;
  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plot.w / labelWidth))));
  const colors = series.map(colorOf);

  const summary =
    description ??
    `${series.map((item) => item.name).join(", ")} · ${categories[0] ?? ""}${count > 1 ? `–${categories[count - 1]}` : ""}`;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (count === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / (rect.width || 1)) * width;
    const raw = type === "bar" || count <= 1 ? (localX - plot.x) / band - 0.5 : ((localX - plot.x) / plot.w) * (count - 1);
    setActive(Math.min(count - 1, Math.max(0, Math.round(raw))));
  };

  const groupWidth = Math.min(band * 0.72, series.length * 40 + (series.length - 1) * 4);
  const gap = series.length > 1 ? Math.min(4, groupWidth * 0.08) : 0;
  const barWidth = Math.max(1, (groupWidth - gap * (series.length - 1)) / Math.max(1, series.length));

  const edgeAligned = type !== "bar" && count > 1;
  const tooltipAlign = count > 1 && active === 0 ? "start" : count > 1 && active === count - 1 ? "end" : "center";
  const tickAnchor = (index: number) =>
    edgeAligned && index === 0 ? "start" : edgeAligned && index === count - 1 ? "end" : "middle";

  return (
    <div className={cx("dl-chart", className)} data-type={type} data-active={active !== null ? "" : undefined}>
      {showTitle && (
        <p className="dl-chart__title" aria-hidden="true">
          {title}
        </p>
      )}
      <div className="dl-chart__canvas" ref={canvasRef}>
        <svg
          className="dl-chart__svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          onPointerLeave={() => setActive(null)}
        >
          <title id={titleId}>{title}</title>
          <desc id={descId}>{summary}</desc>

          {type === "area" && (
            <defs>
              {series.map((item, index) => (
                <linearGradient key={item.name} id={`${svgSafeId}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" className="dl-chart__stop" data-series={colors[index]} stopOpacity={0.32} />
                  <stop offset="100%" className="dl-chart__stop" data-series={colors[index]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
          )}

          {showGrid &&
            domain.ticks.map((tick) => (
              <line
                key={`grid-${tick}`}
                className={tick === 0 ? "dl-chart__baseline" : "dl-chart__grid"}
                x1={plot.x}
                x2={plot.x + plot.w}
                y1={y(tick)}
                y2={y(tick)}
              />
            ))}

          {domain.ticks.map((tick, index) => (
            <text key={`y-${tick}`} className="dl-chart__tick" x={plot.x - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
              {tickLabels[index]}
            </text>
          ))}

          {categories.map((category, index) =>
            index % labelEvery === 0 ? (
              <text
                key={`x-${category}-${index}`}
                className="dl-chart__tick"
                x={x(index)}
                y={plot.y + plot.h + 18}
                textAnchor={tickAnchor(index)}
              >
                {category}
              </text>
            ) : null,
          )}

          {type === "bar" && active !== null && (
            <rect className="dl-chart__band" x={plot.x + band * active} y={plot.y} width={band} height={plot.h} rx={4} />
          )}

          {type !== "bar" && active !== null && (
            <line className="dl-chart__guide" x1={x(active)} x2={x(active)} y1={plot.y} y2={plot.y + plot.h} />
          )}

          {series.map((item, seriesIndex) => {
            const color = colors[seriesIndex];
            if (type === "bar") {
              return (
                <g key={item.name} className="dl-chart__series" data-series={color}>
                  {categories.map((category, index) => {
                    const value = item.values[index];
                    if (value == null) return null;
                    const barX = x(index) - groupWidth / 2 + seriesIndex * (barWidth + gap);
                    return (
                      <path
                        key={category + index}
                        className="dl-chart__bar"
                        data-negative={value < 0 ? "" : undefined}
                        data-active={active === index ? "" : undefined}
                        d={barPath(barX, barWidth, base, y(value), BAR_RADIUS)}
                      />
                    );
                  })}
                </g>
              );
            }
            const points: Point[] = item.values.slice(0, count).map((value, index) => [x(index), y(value)]);
            const line = monotonePath(points);
            const showPoints = count <= 16;
            return (
              <g key={item.name} className="dl-chart__series" data-series={color}>
                {type === "area" && (
                  <path className="dl-chart__area" d={areaPath(line, points, base)} fill={`url(#${svgSafeId}-fill-${seriesIndex})`} />
                )}
                <path className="dl-chart__line" d={line} pathLength={1} />
                {points.map(([px, py], index) =>
                  showPoints || active === index ? (
                    <circle
                      key={index}
                      className="dl-chart__point"
                      data-active={active === index ? "" : undefined}
                      cx={px}
                      cy={py}
                      r={active === index ? 4.5 : 3}
                    />
                  ) : null,
                )}
              </g>
            );
          })}
        </svg>

        {active !== null && categories[active] !== undefined && (
          <div
            className="dl-chart__tooltip"
            data-align={tooltipAlign}
            style={{ left: `${(x(active) / width) * 100}%` }}
            aria-hidden="true"
          >
            <span className="dl-chart__tooltip-title">{categories[active]}</span>
            {series.map((item, index) => (
              <span key={item.name} className="dl-chart__tooltip-row">
                <span className="dl-chart__tooltip-swatch dl-chart__series" data-series={colors[index]} />
                <span className="dl-chart__tooltip-name">{item.name}</span>
                <span className="dl-chart__tooltip-value">
                  {item.values[active] == null ? "—" : fullFormat(item.values[active] as number)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {showLegend && <ChartLegend items={series.map((item, index) => ({ name: item.name, color: colors[index] as ChartColor }))} />}

      <ChartDataTable
        caption={`${title} — ${strings.chartData}`}
        categoryLabel={categoryLabel}
        categories={categories}
        series={series}
        format={fullFormat}
      />
    </div>
  );
}
