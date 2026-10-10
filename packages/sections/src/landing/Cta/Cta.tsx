"use client";

import type { FormEvent } from "react";
import { Button, Input, buttonStyleProps } from "@dialmade/ui";
import { LandingSection } from "../LandingSection";
import { landingStrings } from "../lib/strings";
import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import type { CtaProps } from "./types";
import "./Cta.css";

const preventSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

export function Cta({
  title,
  subtitle,
  button,
  secondaryButton,
  note,
  showForm,
  align,
  emphasis,
  background,
  spacing,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<CtaProps>) {
  const strings = landingStrings(ctx.locale);
  const titleId = `${elementId}-title`;
  // With the email form, a linked block submits to its screen like `ui.form` (export: `action`; preview: the
  // button's `data-dl-screen-link`).
  const href = ctx.blockLink?.(elementId) ?? null;
  const target = ctx.linkTarget?.(elementId) ?? null;

  return (
    <LandingSection
      className="dl-landing-cta"
      variant={variant}
      align={align}
      emphasis={emphasis}
      background={background}
      spacing={spacing}
      labelledBy={titleId}
    >
      <div className="dl-landing-cta__panel">
        <div className="dl-landing-cta__copy">
          <h2 id={titleId} className="dl-landing-cta__title" data-dl-prop="title">
            {title}
          </h2>
          {subtitle ? (
            <p className="dl-landing-cta__subtitle" data-dl-prop="subtitle">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="dl-landing-cta__actions">
          {showForm ? (
            <form className="dl-landing-cta__form" action={href ?? "#"} {...(href ? { method: "get" } : {})} onSubmit={preventSubmit}>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                label={strings.email}
                hideLabel
                placeholder={strings.emailPlaceholder}
                fieldClassName="dl-landing-cta__field"
              />
              <Button type="submit" variant="cta" data-dl-screen-link={target ?? undefined}>
                <span data-dl-prop="button">{button}</span>
              </Button>
            </form>
          ) : (
            <div className="dl-landing-cta__buttons">
              <a {...linkProps(ctx, elementId)} {...buttonStyleProps({ variant: "cta", size: "lg" })}>
                <span data-dl-prop="button">{button}</span>
              </a>
              {secondaryButton ? (
                <a href="#" {...buttonStyleProps({ variant: "outline", size: "lg" })}>
                  <span data-dl-prop="secondaryButton">{secondaryButton}</span>
                </a>
              ) : null}
            </div>
          )}
          {note ? (
            <p className="dl-landing-cta__note" data-dl-prop="note">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </LandingSection>
  );
}
