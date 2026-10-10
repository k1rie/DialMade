import type { SectionStyle } from "../lib/knobs";

export type Billing = "monthly" | "yearly";

export interface PlanEntry {
  id: string;
  name: string;
  /** Monthly price (or starting price when not recurring), in the locale's currency. 0 is free. */
  price: number;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

export interface PricingProps extends SectionStyle {
  eyebrow: string;
  title: string;
  subtitle: string;
  note: string;
  plans: PlanEntry[];
  /** Monthly subscription. Without it prices read «desde 1.200 €» and there is no toggle. */
  recurring: boolean;
  /** Billing period shown first. */
  billing: Billing;
  showToggle: boolean;
  /** Discount of yearly billing, in %. */
  yearlyDiscount: number;
  /** Badge of the highlighted plan; empty hides it. */
  highlightLabel: string;
}
