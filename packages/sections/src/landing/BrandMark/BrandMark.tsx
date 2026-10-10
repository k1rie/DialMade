import { monogramOf } from "../../content/people";
import { cx } from "../../lib/cx";
import "./BrandMark.css";

export interface BrandMarkProps {
  name: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  /** Without the wordmark the mark carries the brand name as its accessible name. */
  showName?: boolean;
  /** `data-dl-prop` of the wordmark, for inline editing. */
  nameProp?: string;
  className?: string;
}

/** The brand's logo (runtime URL) or a monogram, followed by its name. */
export function BrandMark({ name, logoUrl, size = "md", showName = true, nameProp, className }: BrandMarkProps) {
  return (
    <span className={cx("dl-landing-brand", className)} data-size={size}>
      {logoUrl ? (
        <img className="dl-landing-brand__logo" src={logoUrl} alt={showName ? "" : name} />
      ) : (
        <span className="dl-landing-brand__mark" aria-hidden={showName ? true : undefined} role={showName ? undefined : "img"} aria-label={showName ? undefined : name}>
          {monogramOf(name)}
        </span>
      )}
      {showName ? (
        <span className="dl-landing-brand__name" data-dl-prop={nameProp}>
          {name}
        </span>
      ) : null}
    </span>
  );
}
