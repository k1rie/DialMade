import { COMPANY_NAMES, contentProfileOf, localize, personNames, rngFor, t, testimonialList } from "../../content";
import type { ContentContext } from "../../types";
import type { TestimonialEntry } from "./types";

/** Product-neutral quotes that pad the profile's own (3–4) up to the 6 the canvas allows. */
const NEUTRAL_QUOTES = [
  t(
    "Es de esas herramientas que, una vez que pruebas, no entiendes cómo trabajabas sin ellas.",
    "One of those tools you can't imagine working without once you've tried it.",
  ),
  t("La atención es rápida y cercana. Se nota que escuchan.", "Support is quick and friendly. You can tell they listen."),
  t("Sencillo, bonito y hace exactamente lo que promete.", "Simple, beautiful and does exactly what it promises."),
] as const;

/** `count` testimonials (max 6): the profile's quotes first, then neutral ones with their own names. */
export function testimonialEntries(ctx: ContentContext, count: number): TestimonialEntry[] {
  const own = testimonialList(ctx, count).map(({ quote, name, role, company }) => ({ quote, name, role, company: company ?? "" }));
  const missing = Math.min(NEUTRAL_QUOTES.length, Math.max(0, count - own.length));
  if (missing === 0) return own;
  const profile = contentProfileOf(ctx.productType);
  const r = rngFor(ctx.seed, "testimonials-extra");
  const taken = new Set(own.map((item) => item.name));
  const names = personNames(r, ctx.locale, missing + own.length).filter((name) => !taken.has(name));
  const roles = r.shuffle(profile.roles);
  const companies = r.sample(
    COMPANY_NAMES.filter((name) => !own.some((item) => item.company === name)),
    missing,
  );
  return [
    ...own,
    ...NEUTRAL_QUOTES.slice(0, missing).map((quote, i) => ({
      quote: localize(quote, ctx),
      name: names[i] ?? names[0] ?? "",
      role: roles.length > 0 ? localize(roles[i % roles.length]!, ctx) : "",
      company: profile.b2b ? (companies[i] ?? "") : "",
    })),
  ];
}
