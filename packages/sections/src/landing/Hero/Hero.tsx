"use client";

import { Icon, buttonStyleProps } from "@dialmade/ui";
import { LandingSection } from "../LandingSection";
import type { SectionComponentProps } from "../../types";
import { HeroCollage } from "./HeroCollage";
import { ProductMockup } from "./ProductMockup";
import type { HeroProps } from "./types";
import "./Hero.css";

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  note,
  visual,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<HeroProps>) {
  const titleId = `${elementId}-title`;
  const size = emphasis === "subtle" ? "md" : "lg";
  const split = variant === "split";

  return (
    <LandingSection
      className="dl-landing-hero"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <div className="dl-landing-hero__layout" data-visual={visual}>
        <div className="dl-landing-hero__copy">
          {eyebrow ? (
            <p className="dl-landing-hero__eyebrow">
              <span className="dl-landing-hero__eyebrow-dot" aria-hidden="true" />
              <span data-dl-prop="eyebrow">{eyebrow}</span>
            </p>
          ) : null}
          <h1 id={titleId} className="dl-landing-hero__title" data-dl-prop="title">
            {title}
          </h1>
          {subtitle ? (
            <p className="dl-landing-hero__subtitle" data-dl-prop="subtitle">
              {subtitle}
            </p>
          ) : null}
          <div className="dl-landing-hero__actions">
            <a href="#" {...buttonStyleProps({ variant: "cta", size })}>
              <span data-dl-prop="primaryCta">{primaryCta}</span>
              <Icon name="arrow-right" className="dl-button__icon" />
            </a>
            {secondaryCta ? (
              <a href="#" {...buttonStyleProps({ variant: "outline", size })}>
                <span data-dl-prop="secondaryCta">{secondaryCta}</span>
              </a>
            ) : null}
          </div>
          {note ? (
            <p className="dl-landing-hero__note">
              <Icon name="check-circle" />
              <span data-dl-prop="note">{note}</span>
            </p>
          ) : null}
        </div>
        {visual !== "none" ? (
          <div className="dl-landing-hero__visual">
            {split ? <HeroCollage ctx={ctx} kind={visual} /> : <ProductMockup ctx={ctx} kind={visual} />}
          </div>
        ) : null}
      </div>
    </LandingSection>
  );
}
