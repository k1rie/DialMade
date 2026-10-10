import type { SectionComponentProps } from "../../types";
import { BrandMark } from "../BrandMark";
import { boardIndex, textOr } from "../lib/board";
import { formatHex } from "../lib/format";
import { brandSystem, type BrandRenderContext, type BrandSystem } from "../lib/system";
import { COVER_COPY } from "./copy";
import type { CoverProps } from "./definition";
import "./Cover.css";

interface Fact {
  label: string;
  value: string;
  swatch?: boolean;
}

function coverFacts(ctx: BrandRenderContext, system: BrandSystem | undefined): Fact[] {
  if (!system) return [];
  const copy = COVER_COPY[ctx.locale];
  const { pairing, recipe, motionTier } = system.inputs;
  const families = pairing.heading.family === pairing.body.family ? pairing.heading.family : `${pairing.heading.family} + ${pairing.body.family}`;
  return [
    { label: copy.type, value: families },
    { label: copy.style, value: recipe.label[ctx.locale] },
    { label: copy.primary, value: formatHex(system.tokens[ctx.mode].colors.primary), swatch: true },
    { label: copy.motion, value: motionTier.label[ctx.locale] },
  ];
}

/** 00 · Cover of the style guide: name, tagline, the logo large, contents and key facts. */
export function Cover({ brandName, tagline, eyebrow, showIndex, showFacts, variant, ctx, elementId }: SectionComponentProps<CoverProps>) {
  const copy = COVER_COPY[ctx.locale];
  const system = brandSystem(ctx);
  const index = showIndex ? boardIndex(ctx) : [];
  const facts = showFacts ? coverFacts(ctx, system) : [];
  const nameId = `${elementId}-name`;
  const logoUrl = ctx.brand.logoUrl;
  const centered = variant === "centered";

  return (
    <section className="dl-brand-cover" data-variant={centered ? "centered" : "split"} aria-labelledby={nameId}>
      <div className="dl-brand-cover__inner">
        <div className="dl-brand-cover__frame">
          <div className="dl-brand-cover__top">
            <span>{textOr(eyebrow, copy.eyebrow)}</span>
            <span>{ctx.productType.label[ctx.locale]}</span>
          </div>

          <div className="dl-brand-cover__main">
            <div className="dl-brand-cover__text">
              {centered && (
                <span className="dl-brand-cover__emblem" data-image={logoUrl ? "" : undefined}>
                  <BrandMark name={brandName} logoUrl={logoUrl} surface={logoUrl ? "light" : "brand"} layout="symbol" decorative />
                </span>
              )}
              <h1 id={nameId} className="dl-brand-cover__name">
                {brandName}
              </h1>
              {tagline && <p className="dl-brand-cover__tagline">{tagline}</p>}
            </div>
            {!centered && (
              <div className="dl-brand-cover__art" data-image={logoUrl ? "" : undefined}>
                <BrandMark
                  className="dl-brand-cover__mark"
                  name={brandName}
                  logoUrl={logoUrl}
                  surface={logoUrl ? "light" : "brand"}
                  layout="symbol"
                  decorative
                />
              </div>
            )}
          </div>

          {(index.length > 0 || facts.length > 0) && (
            <div className="dl-brand-cover__meta">
              {index.length > 0 && (
                <nav className="dl-brand-cover__index" aria-label={copy.index}>
                  <ol>
                    {index.map((entry) => (
                      <li key={entry.type}>
                        {entry.id ? (
                          <a href={`#${entry.id}-title`}>
                            <span className="dl-brand-cover__index-number">{entry.number}</span> {entry.label}
                          </a>
                        ) : (
                          <span>
                            <span className="dl-brand-cover__index-number">{entry.number}</span> {entry.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {facts.length > 0 && (
                <dl className="dl-brand-cover__facts" aria-label={copy.facts}>
                  {facts.map((fact) => (
                    <div key={fact.label} className="dl-brand-cover__fact">
                      <dt>{fact.label}</dt>
                      <dd>
                        {fact.swatch && <span className="dl-brand-cover__swatch" aria-hidden="true" />}
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
