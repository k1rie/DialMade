/** Intl tag per UI language: Spanish follows es-MX, English en-US. */
const MONEY_LOCALE: Record<string, string> = { es: "es-MX", en: "en-US" };

const formatters = new Map<string, Intl.NumberFormat>();

function usd(locale: string, digits: number): Intl.NumberFormat {
  const tag = MONEY_LOCALE[locale] ?? "en-US";
  const key = `${tag}|${digits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** AI costs in USD with the narrow «$» («$0.002», «$0.03»): three decimals below a cent, «< $0.001» below that. */
export function formatUsd(value: number, locale: string): string {
  if (value > 0 && value < 0.001) return `< ${usd(locale, 3).format(0.001)}`;
  return usd(locale, value > 0 && value < 0.01 ? 3 : 2).format(value);
}
