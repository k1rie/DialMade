"use client";

import type { Locale } from "@dialmade/catalog";
import { Badge } from "@dialmade/ui";
import { landingStrings } from "../../lib/strings";
import type { Billing } from "../types";
import "./BillingToggle.css";

export interface BillingToggleProps {
  value: Billing;
  onChange: (value: Billing) => void;
  /** Yearly discount in %; 0 hides the badge. */
  discount: number;
  locale: Locale;
}

/** Monthly / yearly switch: two toggle buttons in a group (works with click, Tab and Enter/Space). */
export function BillingToggle({ value, onChange, discount, locale }: BillingToggleProps) {
  const strings = landingStrings(locale);
  const option = (id: Billing, label: string, badge?: string) => (
    <button
      type="button"
      className="dl-landing-billing__option"
      aria-pressed={value === id}
      onClick={() => onChange(id)}
    >
      {label}
      {badge ? (
        <Badge variant="success" size="sm">
          {badge}
        </Badge>
      ) : null}
    </button>
  );
  return (
    <div className="dl-landing-billing" role="group" aria-label={strings.billing}>
      {option("monthly", strings.monthly)}
      {option("yearly", strings.yearly, discount > 0 ? strings.save(discount) : undefined)}
    </div>
  );
}
