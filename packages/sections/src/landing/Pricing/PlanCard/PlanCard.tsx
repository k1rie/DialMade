import { Badge, Card, Icon, buttonStyleProps } from "@dialmade/ui";
import type { Emphasis } from "../../lib/knobs";
import type { PriceDisplay } from "../price";
import type { PlanEntry } from "../types";
import "./PlanCard.css";

// Row layout reacts to the width of its list, the `dl-landing-plans` query container (Pricing.css).

export interface PlanCardProps {
  plan: PlanEntry;
  index: number;
  price: PriceDisplay;
  highlightLabel: string;
  emphasis: Emphasis;
  /** `card`: vertical column; `row`: details on the left, price and button on the right. */
  layout: "card" | "row";
  /** Href (and screen link) of the plan's button; `#` by default. */
  link?: { href: string; "data-dl-screen-link"?: string };
}

export function PlanCard({ plan, index, price, highlightLabel, emphasis, layout, link = { href: "#" } }: PlanCardProps) {
  const prop = (key: string) => `plans/${index}/${key}`;
  const highlighted = plan.highlighted;
  const head = (
    <div className="dl-landing-plan__head">
      <h3 className="dl-landing-plan__name" data-dl-prop={prop("name")}>
        {plan.name}
      </h3>
      {highlighted && highlightLabel ? (
        <Badge variant={emphasis === "subtle" ? "outline" : "default"} size="sm">
          {highlightLabel}
        </Badge>
      ) : null}
    </div>
  );
  const description = plan.description ? (
    <p className="dl-landing-plan__description" data-dl-prop={prop("description")}>
      {plan.description}
    </p>
  ) : null;
  const amount = (
    <div className="dl-landing-plan__price">
      <p className="dl-landing-plan__amount">
        {price.prefix ? <span className="dl-landing-plan__prefix">{price.prefix}</span> : null}
        <span className="dl-landing-plan__value">{price.amount}</span>
        {price.period ? <span className="dl-landing-plan__period">{price.period}</span> : null}
      </p>
      <p className="dl-landing-plan__caption">{price.caption}</p>
    </div>
  );
  const cta = (
    <a {...link} {...buttonStyleProps({ variant: highlighted ? "cta" : "outline", fullWidth: layout === "card", className: "dl-landing-plan__cta" })}>
      <span data-dl-prop={prop("cta")}>{plan.cta}</span>
    </a>
  );
  const features =
    plan.features.length > 0 ? (
      <ul className="dl-landing-plan__features" role="list">
        {plan.features.map((feature, i) => (
          <li key={`${i}-${feature}`}>
            <Icon name="check" className="dl-landing-plan__check" />
            <span data-dl-prop={prop(`features/${i}`)}>{feature}</span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <Card
      as="li"
      className="dl-landing-plan"
      data-layout={layout}
      data-emphasis={emphasis}
      data-highlighted={highlighted ? "" : undefined}
    >
      {layout === "card" ? (
        <>
          {head}
          {description}
          {amount}
          {cta}
          {features}
        </>
      ) : (
        <>
          <div className="dl-landing-plan__main">
            {head}
            {description}
            {features}
          </div>
          <div className="dl-landing-plan__side">
            {amount}
            {cta}
          </div>
        </>
      )}
    </Card>
  );
}
