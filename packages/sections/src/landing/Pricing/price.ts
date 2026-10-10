import type { Locale } from "@dialmade/catalog";
import { formatMoney } from "../../content";
import { landingStrings } from "../lib/strings";
import type { Billing } from "./types";

export interface PriceDisplay {
  /** «desde» / «from» for one-off prices. */
  prefix: string;
  amount: string;
  /** «/mes» / «/mo». */
  period: string;
  /** «facturado anualmente». */
  caption: string;
}

export interface PriceOptions {
  recurring: boolean;
  billing: Billing;
  yearlyDiscount: number;
  locale: Locale;
}

/** Monthly equivalent of a yearly plan, rounded to whole units. */
export const yearlyMonthly = (price: number, discount: number): number =>
  Math.max(0, Math.round(price * (1 - Math.min(90, Math.max(0, discount)) / 100)));

export function priceDisplay(price: number, { recurring, billing, yearlyDiscount, locale }: PriceOptions): PriceDisplay {
  const strings = landingStrings(locale);
  if (price <= 0) return { prefix: "", amount: strings.free, period: "", caption: "" };
  if (!recurring) return { prefix: strings.from, amount: formatMoney(price, locale), period: "", caption: "" };
  const yearly = billing === "yearly";
  return {
    prefix: "",
    amount: formatMoney(yearly ? yearlyMonthly(price, yearlyDiscount) : price, locale),
    period: strings.perMonth,
    caption: yearly ? strings.billedYearly : strings.billedMonthly,
  };
}
