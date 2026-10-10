import { Card } from "@dialmade/ui";
import { LandingSection } from "../LandingSection";
import { SectionHeading } from "../SectionHeading";
import { landingStrings } from "../lib/strings";
import type { SectionComponentProps } from "../../types";
import { Quote } from "./Quote";
import type { TestimonialsProps } from "./types";
import "./Testimonials.css";

const QUOTES = { es: ["«", "»"], en: ["“", "”"] } as const;

export function Testimonials({
  eyebrow,
  title,
  subtitle,
  items,
  showRating,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<TestimonialsProps>) {
  const titleId = `${elementId}-title`;
  const strings = landingStrings(ctx.locale);
  const marks = QUOTES[ctx.locale];
  const rating = showRating ? strings.rating(5) : undefined;
  const [lead, ...rest] = items;
  const spotlight = variant === "spotlight" && lead;
  const cards = spotlight ? rest : items;
  const offset = spotlight ? 1 : 0;

  return (
    <LandingSection
      className="dl-landing-quotes"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <SectionHeading id={titleId} eyebrow={eyebrow} title={title} subtitle={subtitle} align={align} />
      {spotlight ? (
        <div className="dl-landing-quotes__spotlight">
          <svg className="dl-landing-quotes__mark" viewBox="0 0 48 36" aria-hidden="true" focusable="false">
            <path d="M0 36V22C0 9.8 6.2 2.4 18.6 0l2 5.4C13.4 7.6 10 11.6 9.6 18H19v18Zm27 0V22C27 9.8 33.2 2.4 45.6 0l2 5.4c-7.2 2.2-10.6 6.2-11 12.6H46v18Z" />
          </svg>
          <Quote item={lead} index={0} marks={marks} rating={rating} avatarSize="lg" />
        </div>
      ) : null}
      {cards.length > 0 ? (
        <ul className="dl-landing-quotes__list" role="list" data-count={cards.length}>
          {cards.map((item, i) => (
            <Card as="li" key={`${i}-${item.name}`} className="dl-landing-quote">
              <Quote item={item} index={i + offset} marks={marks} rating={rating} avatarSize="md" />
            </Card>
          ))}
        </ul>
      ) : null}
    </LandingSection>
  );
}
