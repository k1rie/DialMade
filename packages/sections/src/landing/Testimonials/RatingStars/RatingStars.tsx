import { cx } from "../../../lib/cx";
import "./RatingStars.css";

export interface RatingStarsProps {
  /** 0–5. */
  value: number;
  label: string;
  className?: string;
}

const STAR = "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z";

export function RatingStars({ value, label, className }: RatingStarsProps) {
  const filled = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span className={cx("dl-landing-stars", className)} role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-filled={i < filled ? "" : undefined}>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}
