import { Icon } from "@dialmade/ui";
import { featureList, heroCopy, monogramOf } from "../../content";
import { cx } from "../../lib/cx";
import { miniLabel } from "../labels";
import type { MiniProps } from "../types";
import "./MiniLanding.css";

/** Landing page thumbnail (~320×200, scales with its width): nav, big headline, CTA and three cards. */
export function MiniLanding({ ctx, className }: MiniProps) {
  const hero = heroCopy(ctx);
  const features = featureList(ctx, 3);
  const initial = monogramOf(ctx.brand.name);
  return (
    <div className={cx("dl-mini-landing", className)} role="img" lang={ctx.locale} aria-label={miniLabel("landing", ctx.locale, ctx.brand.name)}>
      <div className="dl-mini-landing__page">
        <div className="dl-mini-landing__nav">
          <span className="dl-mini-landing__brand">
            {ctx.brand.logoUrl ? (
              <img className="dl-mini-landing__logo" src={ctx.brand.logoUrl} alt="" />
            ) : (
              <span className="dl-mini-landing__mark">{initial}</span>
            )}
            <span className="dl-mini-landing__name">{ctx.brand.name}</span>
          </span>
          <span className="dl-mini-landing__links">
            <span />
            <span />
            <span />
          </span>
          <span className="dl-mini-landing__nav-cta">{hero.primaryCta}</span>
        </div>
        <div className="dl-mini-landing__hero">
          <span className="dl-mini-landing__eyebrow">
            <span className="dl-mini-landing__dot" />
            {hero.eyebrow}
          </span>
          <span className="dl-mini-landing__title">{hero.title}</span>
          <span className="dl-mini-landing__subtitle">
            <span />
          </span>
          <span className="dl-mini-landing__actions">
            <span className="dl-mini-landing__cta">
              {hero.primaryCta}
              <Icon name="arrow-right" />
            </span>
            <span className="dl-mini-landing__ghost">{hero.secondaryCta}</span>
          </span>
        </div>
        <div className="dl-mini-landing__cards">
          {features.map((feature) => (
            <span key={feature.title} className="dl-mini-landing__card">
              <span className="dl-mini-landing__icon">
                <Icon name={feature.icon} />
              </span>
              <span className="dl-mini-landing__card-title">{feature.title}</span>
              <span className="dl-mini-landing__card-line" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
