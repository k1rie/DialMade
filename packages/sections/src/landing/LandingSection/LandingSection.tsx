import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import type { SectionStyle } from "../lib/knobs";
import "./LandingSection.css";

export interface LandingSectionProps extends Partial<SectionStyle> {
  /** Block class of the section (`dl-landing-hero`). */
  className: string;
  variant: string;
  as?: "section" | "header" | "footer";
  labelledBy?: string;
  /** `none` drops the vertical padding (navbar). */
  padding?: "section" | "none";
  children: ReactNode;
}

/**
 * Outer box of every landing section: background, vertical rhythm, alignment and the centered
 * container. It is also the query container (`dl-landing`) the sections lay out against.
 */
export function LandingSection({
  className,
  variant,
  as: Tag = "section",
  labelledBy,
  align = "center",
  emphasis = "default",
  background = "plain",
  spacing = "normal",
  padding = "section",
  children,
}: LandingSectionProps) {
  return (
    <Tag
      className={cx("dl-landing", className)}
      data-variant={variant}
      data-align={align}
      data-emphasis={emphasis}
      data-bg={background}
      data-spacing={spacing}
      data-padding={padding === "none" ? "none" : undefined}
      aria-labelledby={labelledBy}
    >
      <div className="dl-landing__inner">
        {children}
      </div>
    </Tag>
  );
}
