export type ChartType = "bar" | "line" | "area";
export type ChartColor = 1 | 2 | 3 | 4 | 5;

export interface ChartSeries {
  name: string;
  values: readonly number[];
  /** Color del tema (`--chart-1`…`--chart-5`). Por defecto, por orden. */
  color?: ChartColor;
}
