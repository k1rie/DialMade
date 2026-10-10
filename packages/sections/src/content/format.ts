import type { Locale } from "@dialmade/catalog";
import type { ValueFormat } from "./types";

const LOCALE_TAGS: Record<Locale, string> = { es: "es-ES", en: "en-US" };
const CURRENCIES: Record<Locale, string> = { es: "EUR", en: "USD" };

export const localeTag = (locale: Locale): string => LOCALE_TAGS[locale];
export const currencyOf = (locale: Locale): string => CURRENCIES[locale];

const formatters = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: Locale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_TAGS[locale], options);
    formatters.set(key, formatter);
  }
  return formatter;
}

export function formatDuration(seconds: number, locale: Locale): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (locale === "es") {
    if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
    if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
    return `${s} s`;
  }
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export function formatMoney(value: number, locale: Locale): string {
  const currency = currencyOf(locale);
  if (Math.abs(value) >= 10_000) {
    return numberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  const digits = Number.isInteger(value) ? 0 : 2;
  return numberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** Human value for the UI, in the conventions of the locale (es-ES / en-US, EUR / USD). */
export function formatValue(value: number, format: ValueFormat, locale: Locale): string {
  switch (format) {
    case "number":
      return numberFormat(locale, { maximumFractionDigits: 0 }).format(value);
    case "decimal":
      return numberFormat(locale, { maximumFractionDigits: 1 }).format(value);
    case "compact":
      return numberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    case "currency":
      return formatMoney(value, locale);
    case "percent":
      return numberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(value / 100);
    case "duration":
      return formatDuration(value, locale);
    case "ms":
      return `${numberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ms`;
  }
}

/** Signed percentage change: `+12,4 %` / `+12.4%`. */
export function formatDelta(delta: number, locale: Locale): string {
  return numberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(delta / 100);
}

/** «hace 5 min» / «5 min ago», from minutes. */
export function relativeTime(minutes: number, locale: Locale): string {
  const m = Math.max(0, Math.round(minutes));
  if (locale === "es") {
    if (m < 1) return "ahora";
    if (m < 60) return `hace ${m} min`;
    if (m < 24 * 60) return `hace ${Math.floor(m / 60)} h`;
    const days = Math.floor(m / (24 * 60));
    return days === 1 ? "ayer" : `hace ${days} días`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h ago`;
  const days = Math.floor(m / (24 * 60));
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const MONTHS: Record<Locale, readonly string[]> = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const WEEKDAYS: Record<Locale, readonly string[]> = {
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

/** Fixed «today» of the generated data, so the copy never depends on the clock. */
export const CONTENT_TODAY = { year: 2026, month: 8, day: 30 } as const;

export const monthLabel = (monthIndex: number, locale: Locale): string => {
  const label = MONTHS[locale][((monthIndex % 12) + 12) % 12] as string;
  return locale === "es" ? label.charAt(0).toUpperCase() + label.slice(1) : label;
};

export const weekdayLabel = (index: number, locale: Locale): string => WEEKDAYS[locale][((index % 7) + 7) % 7] as string;

/** `daysAgo` days before CONTENT_TODAY: «12 sept» / «Sep 12». */
export function shortDate(daysAgo: number, locale: Locale): string {
  const date = new Date(Date.UTC(CONTENT_TODAY.year, CONTENT_TODAY.month, CONTENT_TODAY.day - daysAgo));
  const month = MONTHS[locale][date.getUTCMonth()] as string;
  return locale === "es" ? `${date.getUTCDate()} ${month}` : `${month} ${date.getUTCDate()}`;
}

/** Minutes after midnight → «09:30» / «9:30 AM». */
export function clockTime(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = String(minutes % 60).padStart(2, "0");
  if (locale === "es") return `${String(h).padStart(2, "0")}:${m}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}
