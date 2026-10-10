import { ctaCopy, heroCopy, localize, sectionHeading } from "../../content/generators";
import { contentProfileOf } from "../../content/profiles";
import { rngFor } from "../../content/rng";
import type { ContentContext } from "../../types";
import { uiStrings } from "./strings";

export interface UiTextCopy {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
}

/**
 * Copy of a free text block: a heading of the profile (features, testimonials or one of its CTA titles),
 * a subtitle as body and the secondary CTA as action. Deterministic by seed: text blocks with different
 * seeds (`deriveSeed(seed, blockId)`) get different headings.
 */
export function uiTextCopy(ctx: ContentContext): UiTextCopy {
  const profile = contentProfileOf(ctx.productType);
  const r = rngFor(ctx.seed, `${ctx.productType.id}:ui-text`);
  const hero = heroCopy(ctx);
  const features = sectionHeading(ctx, "features");
  const testimonials = sectionHeading(ctx, "testimonials");
  const cta = ctaCopy(ctx);
  // Title and body are picked apart, so two text blocks of a screen rarely repeat both.
  const title = r.pick([features.title, cta.title, testimonials.title, ...profile.cta.titles.map((text) => localize(text, ctx))]);
  const body = r.pick([features.subtitle, cta.subtitle, hero.subtitle, ...profile.hero.subtitles.map((text) => localize(text, ctx))]);
  return {
    eyebrow: localize(r.pick(profile.hero.eyebrows), ctx),
    title,
    body,
    action: hero.secondaryCta,
  };
}

export interface UiMediaCopy {
  alt: string;
  caption: string;
}

/** Accessible name of the CSS-only artwork («Vista del producto de Acme»); no caption by default. */
export function uiMediaCopy(ctx: ContentContext): UiMediaCopy {
  return { alt: uiStrings(ctx.locale).mediaAlt(ctx.brand.name), caption: "" };
}
