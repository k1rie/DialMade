import { Card, Icon } from "@dialmade/ui";
import { LandingSection } from "../LandingSection";
import { SectionHeading } from "../SectionHeading";
import type { SectionComponentProps } from "../../types";
import { FeatureVisual } from "./FeatureVisual";
import type { FeaturesProps } from "./types";
import "./Features.css";

export function Features({
  eyebrow,
  title,
  subtitle,
  items,
  count,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<FeaturesProps>) {
  const titleId = `${elementId}-title`;
  const visible = items.slice(0, Math.max(1, count));
  const bento = variant === "bento";

  return (
    <LandingSection
      className="dl-landing-features"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <SectionHeading id={titleId} eyebrow={eyebrow} title={title} subtitle={subtitle} align={align} />
      <ul className="dl-landing-features__list" role="list" data-count={visible.length}>
        {visible.map((item, i) => (
          <Card as="li" key={`${i}-${item.title}`} className="dl-landing-feature" data-lead={bento && i === 0 ? "" : undefined}>
            {bento && i === 0 ? <FeatureVisual ctx={ctx} /> : null}
            <span className="dl-landing-feature__icon">
              <Icon name={item.icon} />
            </span>
            <span className="dl-landing-feature__body">
              <h3 className="dl-landing-feature__title" data-dl-prop={`items/${i}/title`}>
                {item.title}
              </h3>
              <p className="dl-landing-feature__text" data-dl-prop={`items/${i}/description`}>
                {item.description}
              </p>
            </span>
          </Card>
        ))}
      </ul>
    </LandingSection>
  );
}
