import { cx } from "../../lib/cx";
import type { Align, Emphasis } from "../lib/knobs";
import "./SectionHeading.css";

export interface SectionHeadingProps {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: Align;
  emphasis?: Emphasis;
  level?: "h1" | "h2";
  className?: string;
}

/** Eyebrow, title and subtitle of a section. Empty texts are not rendered. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
  emphasis = "default",
  level: Title = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cx("dl-landing-heading", className)} data-align={align} data-emphasis={emphasis}>
      {eyebrow ? (
        <p className="dl-landing-heading__eyebrow" data-dl-prop="eyebrow">
          {eyebrow}
        </p>
      ) : null}
      <Title id={id} className="dl-landing-heading__title" data-dl-prop="title">
        {title}
      </Title>
      {subtitle ? (
        <p className="dl-landing-heading__subtitle" data-dl-prop="subtitle">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
