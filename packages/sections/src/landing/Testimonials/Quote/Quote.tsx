import { Avatar } from "@dialmade/ui";
import { RatingStars } from "../RatingStars";
import type { TestimonialEntry } from "../types";
import "./Quote.css";

export interface QuoteProps {
  item: TestimonialEntry;
  /** Position in `items`, for `data-dl-prop`. */
  index: number;
  marks: readonly [string, string];
  /** Accessible label of the stars; without it no stars are shown. */
  rating?: string | undefined;
  avatarSize: "md" | "lg";
}

/** One testimonial: stars, the quote and its author. */
export function Quote({ item, index, marks, rating, avatarSize }: QuoteProps) {
  const role = [item.role, item.company].filter(Boolean).join(" · ");
  return (
    <figure className="dl-landing-quote__figure">
      {rating ? <RatingStars value={5} label={rating} /> : null}
      <blockquote className="dl-landing-quote__text">
        <p>
          {marks[0]}
          <span data-dl-prop={`items/${index}/quote`}>{item.quote}</span>
          {marks[1]}
        </p>
      </blockquote>
      <figcaption className="dl-landing-quote__author">
        <Avatar name={item.name} size={avatarSize} />
        <span className="dl-landing-quote__who">
          <span className="dl-landing-quote__name" data-dl-prop={`items/${index}/name`}>
            {item.name}
          </span>
          {role ? <span className="dl-landing-quote__role">{role}</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}
