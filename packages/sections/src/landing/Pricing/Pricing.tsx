"use client";

import { useState } from "react";
import { LandingSection } from "../LandingSection";
import { SectionHeading } from "../SectionHeading";
import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import { BillingToggle } from "./BillingToggle";
import { PlanCard } from "./PlanCard";
import { priceDisplay } from "./price";
import type { Billing, PricingProps } from "./types";
import "./Pricing.css";

export function Pricing({
  eyebrow,
  title,
  subtitle,
  note,
  plans,
  count,
  recurring,
  billing,
  showToggle,
  yearlyDiscount,
  highlightLabel,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<PricingProps>) {
  const titleId = `${elementId}-title`;
  const split = variant === "split";
  // The stored `billing` is the initial choice; a visitor can switch it until the prop changes.
  const [choice, setChoice] = useState<{ from: Billing; value: Billing }>({ from: billing, value: billing });
  const current = choice.from === billing ? choice.value : billing;
  if (choice.from !== billing) setChoice({ from: billing, value: billing });

  const toggle =
    recurring && showToggle ? (
      <BillingToggle value={current} onChange={(value) => setChoice({ from: billing, value })} discount={yearlyDiscount} locale={ctx.locale} />
    ) : null;
  const noteText = note ? (
    <p className="dl-landing-pricing__note" data-dl-prop="note">
      {note}
    </p>
  ) : null;
  const priceOptions = { recurring, billing: current, yearlyDiscount, locale: ctx.locale };
  const visible = plans.slice(0, Math.max(1, count));
  const link = linkProps(ctx, elementId);

  return (
    <LandingSection
      className="dl-landing-pricing"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <div className="dl-landing-pricing__layout">
        <div className="dl-landing-pricing__intro" data-align={align}>
          <SectionHeading id={titleId} eyebrow={eyebrow} title={title} subtitle={subtitle} align={align} />
          {toggle}
          {split ? noteText : null}
        </div>
        <ul className="dl-landing-pricing__plans" role="list" data-count={visible.length}>
          {visible.map((plan, i) => (
            <PlanCard
              key={plan.id || i}
              plan={plan}
              index={i}
              price={priceDisplay(plan.price, priceOptions)}
              highlightLabel={highlightLabel}
              emphasis={emphasis}
              layout={split ? "row" : "card"}
              link={link}
            />
          ))}
        </ul>
        {split ? null : noteText}
      </div>
    </LandingSection>
  );
}
