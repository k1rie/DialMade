import type { CSSProperties } from "react";
import { CONTENT_TODAY } from "../../content";
import { BrandMark } from "../BrandMark";
import { LandingSection } from "../LandingSection";
import { landingStrings } from "../lib/strings";
import type { SectionComponentProps } from "../../types";
import type { FooterLink, FooterProps } from "./types";
import "./Footer.css";

export function Footer({
  brandName,
  tagline,
  columns,
  rights,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<FooterProps>) {
  const strings = landingStrings(ctx.locale);
  const copyright = strings.rights(CONTENT_TODAY.year, brandName, rights);
  const brand = <BrandMark name={brandName} logoUrl={ctx.brand.logoUrl} size={emphasis === "subtle" ? "sm" : "md"} nameProp="brandName" />;
  const simpleLinks: { link: FooterLink; path: string }[] =
    variant === "simple"
      ? [0, columns.length - 1]
          .filter((col, i, all) => col >= 0 && all.indexOf(col) === i)
          .flatMap((col) => (columns[col]?.links ?? []).map((link, i) => ({ link, path: `columns/${col}/links/${i}/label` })))
      : [];

  return (
    <LandingSection
      as="footer"
      className="dl-landing-footer"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
    >
      {variant === "simple" ? (
        <div className="dl-landing-footer__row">
          {brand}
          {simpleLinks.length > 0 ? (
            <nav aria-label={strings.footerNav}>
              <ul className="dl-landing-footer__inline" role="list">
                {simpleLinks.map(({ link, path }) => (
                  <li key={path}>
                    <a className="dl-landing-footer__link" href={link.href} data-dl-prop={path}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <p className="dl-landing-footer__rights">{copyright}</p>
        </div>
      ) : (
        <>
          <div className="dl-landing-footer__top">
            <div className="dl-landing-footer__brand">
              {brand}
              {tagline ? (
                <p className="dl-landing-footer__tagline" data-dl-prop="tagline">
                  {tagline}
                </p>
              ) : null}
            </div>
            {columns.length > 0 ? (
              <nav className="dl-landing-footer__columns" aria-label={strings.footerNav} data-count={columns.length}>
                {columns.map((column, c) => {
                  const headingId = `${elementId}-col-${c}`;
                  return (
                    <div key={`${c}-${column.title}`} className="dl-landing-footer__column">
                      <p id={headingId} className="dl-landing-footer__heading" data-dl-prop={`columns/${c}/title`}>
                        {column.title}
                      </p>
                      <ul className="dl-landing-footer__links" role="list" aria-labelledby={headingId}>
                        {column.links.map((link, i) => (
                          <li key={`${i}-${link.href}`}>
                            <a className="dl-landing-footer__link" href={link.href} data-dl-prop={`columns/${c}/links/${i}/label`}>
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </nav>
            ) : null}
          </div>
          <div className="dl-landing-footer__bottom">
            <p className="dl-landing-footer__rights">{copyright}</p>
          </div>
        </>
      )}
      {emphasis === "bold" ? (
        <p
          className="dl-landing-footer__wordmark"
          aria-hidden="true"
          style={{ "--_wm-chars": Math.max(4, Array.from(brandName).length) } as CSSProperties}
        >
          {brandName}
        </p>
      ) : null}
    </LandingSection>
  );
}
