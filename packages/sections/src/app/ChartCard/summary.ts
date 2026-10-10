import type { Locale } from "@dialmade/catalog";
import { formatMoney, formatValue } from "../../content/format";
import type { ValueFormat } from "../../content/types";

const ADDITIVE = new Set<ValueFormat>(["number", "compact", "currency", "decimal"]);

/** Headline of the chart: the period total (or the last value when the unit does not add up) and its change. */
export function chartSummary(values: readonly number[], format: ValueFormat, locale: Locale): { value: string; delta: number } {
  const last = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? last;
  const headline = ADDITIVE.has(format) ? values.reduce((sum, value) => sum + value, 0) : last;
  const delta = previous === 0 ? 0 : Math.round(((last - previous) / Math.abs(previous)) * 1000) / 10;
  return { value: formatValue(headline, format === "number" ? "compact" : format, locale), delta };
}

/** Short tick labels: compact numbers, money with its currency. */
export function axisFormatter(format: ValueFormat, locale: Locale): (value: number) => string {
  if (format === "currency") return (value) => formatMoney(Math.round(value), locale);
  if (format === "percent" || format === "duration" || format === "ms") return (value) => formatValue(value, format, locale);
  return (value) => formatValue(value, "compact", locale);
}
