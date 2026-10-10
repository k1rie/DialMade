import type { CSSProperties } from "react";
import { monogramOf } from "../../content";
import { cx } from "../../lib/cx";
import "./BrandMark.css";

export type BrandMarkSurface = "auto" | "light" | "dark" | "brand";
export type BrandMarkLayout = "lockup" | "stacked" | "symbol" | "wordmark";

export interface BrandMarkProps {
  name: string;
  /** Runtime logo. Without it the mark is a monogram plus the wordmark in the heading font. */
  logoUrl?: string;
  /** Background the mark sits on; its colors adapt so it always reads. */
  surface?: BrandMarkSurface;
  layout?: BrandMarkLayout;
  /** Hidden from assistive technology (the name is already announced nearby). */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** The brand's logo: the uploaded image, or a monogram lockup. It scales with `font-size`. */
export function BrandMark({ name, logoUrl, surface = "auto", layout = "lockup", decorative = false, className, style }: BrandMarkProps) {
  if (logoUrl) {
    return (
      <span className={cx("dl-brand-mark", className)} data-kind="image" data-surface={surface} style={style}>
        <img className="dl-brand-mark__image" src={logoUrl} alt={decorative ? "" : name} />
      </span>
    );
  }
  const showSymbol = layout !== "wordmark";
  const showWord = layout !== "symbol";
  const labelled = !decorative && !showWord;
  return (
    <span
      className={cx("dl-brand-mark", className)}
      data-kind="monogram"
      data-surface={surface}
      data-layout={layout}
      style={style}
      aria-hidden={decorative || undefined}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? name : undefined}
    >
      {showSymbol && (
        <span className="dl-brand-mark__symbol" aria-hidden="true">
          {monogramOf(name)}
        </span>
      )}
      {showWord && <span className="dl-brand-mark__word">{name}</span>}
    </span>
  );
}
