import type { Locale } from "@dialmade/catalog";

const INTL_LOCALE: Record<Locale, string> = { es: "es-MX", en: "en-US" };

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}

export function formatCompact(value: number, locale: Locale): string {
  return formatNumber(value, locale, { notation: "compact", maximumFractionDigits: 1 });
}

/** `12.5` → `+12.5%` (es-MX and en-US). */
export function formatDeltaPercent(delta: number, locale: Locale): string {
  return formatNumber(delta / 100, locale, {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  });
}
