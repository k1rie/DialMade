import type { ChartColor } from "../types";
import "./ChartLegend.css";

export interface ChartLegendProps {
  items: readonly { name: string; color: ChartColor }[];
}

/** Leyenda visual; para lectores de pantalla los nombres ya están en la tabla de datos. */
export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <ul className="dl-chart-legend" aria-hidden="true">
      {items.map((item) => (
        <li key={item.name} className="dl-chart-legend__item">
          <span className="dl-chart-legend__swatch" data-series={item.color} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
