import type { ReactNode } from "react";
import { VisuallyHidden } from "../../VisuallyHidden";
import type { ChartSeries } from "../types";

export interface ChartDataTableProps {
  caption: ReactNode;
  categoryLabel?: string;
  categories: readonly string[];
  series: readonly ChartSeries[];
  format: (value: number) => string;
}

/** Los mismos datos de la gráfica como tabla, solo para lectores de pantalla. */
export function ChartDataTable({ caption, categoryLabel, categories, series, format }: ChartDataTableProps) {
  return (
    <VisuallyHidden as="div">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryLabel}</th>
            {series.map((item) => (
              <th key={item.name} scope="col">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category}>
              <th scope="row">{category}</th>
              {series.map((item) => {
                const value = item.values[index];
                return <td key={item.name}>{value == null ? "—" : format(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </VisuallyHidden>
  );
}
