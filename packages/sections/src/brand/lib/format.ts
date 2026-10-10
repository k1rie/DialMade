import type { Locale } from "@dialmade/catalog";
import { localeTag } from "../../content";

const formatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale: Locale, maxDigits = 2): string {
  const key = `${locale}|${maxDigits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: maxDigits });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}

/** `16` → `16 px`; a fluid size (`min < max`) → `34–56 px`. */
export function formatPx(px: number, locale: Locale, minPx?: number): string {
  if (minPx !== undefined && minPx < px) return `${formatNumber(minPx, locale, 1)}–${formatNumber(px, locale, 1)} px`;
  return `${formatNumber(px, locale, 1)} px`;
}

/** `4.5` → `4,5:1` (es) or `4.5:1` (en). */
export const formatRatio = (ratio: number, locale: Locale): string => `${formatNumber(ratio, locale, 2)}:1`;

export const formatHex = (hex: string | undefined): string => (hex ? hex.toUpperCase() : "");
