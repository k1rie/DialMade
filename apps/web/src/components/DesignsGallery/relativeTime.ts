import type { Locale } from "@/i18n/config";

const STEPS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Number.POSITIVE_INFINITY],
];

/** «hace 5 minutos» / «5 minutes ago» for an ISO date. */
export function relativeTime(iso: string, locale: Locale, now: number = Date.now()): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let value = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) return format.format(Math.round(value), unit);
    value /= size;
  }
  return format.format(Math.round(value), "year");
}
