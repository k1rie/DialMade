import { z } from "zod";
import { sectionHeading, testimonialList } from "../../content";
import { defineSection } from "../../defineSection";
import { countedList } from "../../lib/visible";
import { sectionEyebrow } from "../lib/copy";
import { sectionStyleShape, styleKnobs, textKnob, toggleKnob, variantKnob } from "../lib/knobs";
import { testimonialEntries } from "./moreQuotes";
import { Testimonials } from "./Testimonials";
import type { TestimonialsProps } from "./types";

export const testimonialsSection = defineSection<TestimonialsProps>({
  type: "landing.testimonials",
  kind: "landing",
  label: { es: "Testimonios", en: "Testimonials" },
  description: {
    es: "Opiniones de clientes ficticios, en tarjetas o con una cita destacada.",
    en: "Quotes from fictional customers, as cards or with one featured quote.",
  },
  variants: [
    { id: "grid", label: { es: "Tarjetas", en: "Cards" } },
    { id: "spotlight", label: { es: "Cita destacada", en: "Spotlight" } },
  ],
  schema: z.strictObject({
    eyebrow: z.string(),
    title: z.string().min(1),
    subtitle: z.string(),
    items: z
      .array(z.strictObject({ quote: z.string().min(1), name: z.string().min(1), role: z.string(), company: z.string() }))
      .min(1)
      .max(6),
    /** How many of `items` are shown (1–6). */
    count: z.number().int().min(1).max(6),
    showRating: z.boolean(),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<TestimonialsProps>(),
    ...styleKnobs<TestimonialsProps>({ es: "Tamaño de las citas", en: "Quote size" }),
    toggleKnob<TestimonialsProps>("showRating", "Mostrar valoración", "Show rating"),
    textKnob<TestimonialsProps>("eyebrow", "Antetítulo", "Eyebrow"),
    textKnob<TestimonialsProps>("title", "Título", "Title"),
    textKnob<TestimonialsProps>("subtitle", "Subtítulo", "Subtitle"),
  ],
  defaultProps: (ctx) => {
    const heading = sectionHeading(ctx, "testimonials");
    const items = testimonialList(ctx, 3).map(({ quote, name, role, company }) => ({ quote, name, role, company: company ?? "" }));
    return {
      eyebrow: sectionEyebrow(ctx, "testimonials"),
      title: heading.title,
      subtitle: heading.subtitle,
      items,
      count: items.length,
      showRating: true,
      align: "center",
      emphasis: "default",
      background: "subtle",
      spacing: "normal",
    };
  },
  layout: {
    owns: ["count"],
    fit: ({ estimate }) => (estimate?.kind === "count" ? { props: { count: estimate.value } } : {}),
    // Six quotes, so `count` alone decides how many show.
    defaults: (ctx) => ({ items: testimonialEntries(ctx, 6) }),
  },
  visible: countedList("items"),
  Component: Testimonials,
});
