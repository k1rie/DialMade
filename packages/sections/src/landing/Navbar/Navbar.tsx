"use client";

import type { MouseEvent } from "react";
import { Icon, VisuallyHidden, buttonStyleProps, type ButtonVariant } from "@dialmade/ui";
import { BrandMark } from "../BrandMark";
import { LandingSection } from "../LandingSection";
import type { Emphasis } from "../lib/knobs";
import { landingStrings } from "../lib/strings";
import type { SectionComponentProps } from "../../types";
import type { NavbarProps } from "./types";
import "./Navbar.css";

const CTA_VARIANT: Record<Emphasis, ButtonVariant> = { subtle: "outline", default: "primary", bold: "cta" };

const closeMenu = (event: MouseEvent<HTMLElement>) => {
  if (event.target instanceof Element && event.target.closest("a")) event.currentTarget.closest("details")?.removeAttribute("open");
};

export function Navbar({
  brandName,
  links,
  secondaryLabel,
  ctaLabel,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
}: SectionComponentProps<NavbarProps>) {
  const strings = landingStrings(ctx.locale);
  const cta = buttonStyleProps({ variant: CTA_VARIANT[emphasis], size: "sm" });
  // The menu repeats the links for small widths; only the bar's copy is an inline-editing target.
  const linkItems = (editable: boolean) =>
    links.map((link, i) => (
      <li key={`${i}-${link.href}`}>
        <a className="dl-landing-navbar__link" href={link.href} data-dl-prop={editable ? `links/${i}/label` : undefined}>
          {link.label}
        </a>
      </li>
    ));

  return (
    <LandingSection
      as="header"
      className="dl-landing-navbar"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      padding="none"
    >
      <nav className="dl-landing-navbar__nav" aria-label={strings.mainNav}>
        <a className="dl-landing-navbar__brand" href="#">
          <BrandMark name={brandName} logoUrl={ctx.brand.logoUrl} nameProp="brandName" />
        </a>
        <ul className="dl-landing-navbar__links" role="list">
          {linkItems(true)}
        </ul>
        <div className="dl-landing-navbar__actions">
          {secondaryLabel ? (
            <a
              href="#"
              {...buttonStyleProps({ variant: "ghost", size: "sm", className: "dl-landing-navbar__secondary" })}
              data-dl-prop="secondaryLabel"
            >
              {secondaryLabel}
            </a>
          ) : null}
          <a href="#" {...cta} data-dl-prop="ctaLabel">
            {ctaLabel}
          </a>
        </div>
        <details className="dl-landing-navbar__menu">
          <summary className="dl-landing-navbar__toggle">
            <svg className="dl-landing-navbar__toggle-open" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M4 8h16M4 16h16" />
            </svg>
            <Icon name="x" className="dl-landing-navbar__toggle-close" />
            <VisuallyHidden>{strings.menu}</VisuallyHidden>
          </summary>
          <div className="dl-landing-navbar__panel" onClick={closeMenu}>
            <ul className="dl-landing-navbar__panel-links" role="list">
              {linkItems(false)}
            </ul>
            <div className="dl-landing-navbar__panel-actions">
              {secondaryLabel ? (
                <a href="#" {...buttonStyleProps({ variant: "outline", size: "md", fullWidth: true })}>
                  {secondaryLabel}
                </a>
              ) : null}
              <a href="#" {...buttonStyleProps({ variant: CTA_VARIANT[emphasis], size: "md", fullWidth: true })}>
                {ctaLabel}
              </a>
            </div>
          </div>
        </details>
      </nav>
    </LandingSection>
  );
}
