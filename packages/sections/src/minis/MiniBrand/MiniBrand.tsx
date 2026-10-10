import { BrandMark } from "../../brand/BrandMark";
import { cx } from "../../lib/cx";
import { miniLabel } from "../labels";
import type { MiniProps } from "../types";
import "./MiniBrand.css";

const SURFACES = ["light", "dark", "brand"] as const;
const SWATCHES = ["primary", "cta", "tint", "ink", "surface"] as const;

/** Style guide thumbnail: the logo on light, dark and brand color, five swatches, «Aa» and two buttons. */
export function MiniBrand({ ctx, className }: MiniProps) {
  const { name, logoUrl } = ctx.brand;
  return (
    <div className={cx("dl-mini-brand", className)} role="img" lang={ctx.locale} aria-label={miniLabel("brand", ctx.locale, name)}>
      <div className="dl-mini-brand__marks">
        {SURFACES.map((surface) => (
          <span key={surface} className="dl-mini-brand__tile" data-surface={surface}>
            <BrandMark name={name} logoUrl={logoUrl} surface={surface} layout={surface === "light" ? "lockup" : "symbol"} decorative />
          </span>
        ))}
      </div>
      <div className="dl-mini-brand__swatches">
        {SWATCHES.map((swatch) => (
          <span key={swatch} className="dl-mini-brand__swatch" data-swatch={swatch} />
        ))}
      </div>
      <div className="dl-mini-brand__type">
        <span className="dl-mini-brand__aa">Aa</span>
        <span className="dl-mini-brand__lines">
          <span />
          <span />
        </span>
        <span className="dl-mini-brand__buttons">
          <span className="dl-mini-brand__button" data-variant="primary" />
          <span className="dl-mini-brand__button" data-variant="outline" />
        </span>
      </div>
    </div>
  );
}
