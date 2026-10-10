import { z } from "zod";
import { heroCopy } from "../../content";
import { defineSection } from "../../defineSection";
import { defaultHeroVisual, heroNote } from "../lib/copy";
import { sectionStyleShape, selectKnob, styleKnobs, textKnob, variantKnob } from "../lib/knobs";
import { Hero } from "./Hero";
import type { HeroProps } from "./types";

export const heroSection = defineSection<HeroProps>({
  type: "landing.hero",
  kind: "landing",
  label: { es: "Portada", en: "Hero" },
  description: {
    es: "Titular, subtítulo, llamadas a la acción y una vista del producto hecha con tus componentes.",
    en: "Headline, subtitle, calls to action and a product view built with your components.",
  },
  variants: [
    { id: "centered", label: { es: "Centrada con producto", en: "Centered with product" } },
    { id: "split", label: { es: "Texto y visual", en: "Split text and visual" } },
  ],
  schema: z.strictObject({
    eyebrow: z.string(),
    title: z.string().min(1),
    subtitle: z.string(),
    primaryCta: z.string().min(1),
    secondaryCta: z.string(),
    note: z.string(),
    visual: z.enum(["dashboard", "gallery", "none"]),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<HeroProps>(),
    ...styleKnobs<HeroProps>({ es: "Tamaño del titular", en: "Headline size" }),
    selectKnob<HeroProps>("visual", "Visual", "Visual", [
      { value: "dashboard", label: { es: "Panel del producto", en: "Product dashboard" } },
      { value: "gallery", label: { es: "Galería", en: "Gallery" } },
      { value: "none", label: { es: "Sin visual", en: "No visual" } },
    ]),
    textKnob<HeroProps>("eyebrow", "Antetítulo", "Eyebrow"),
    textKnob<HeroProps>("title", "Titular", "Headline"),
    textKnob<HeroProps>("subtitle", "Subtítulo", "Subtitle"),
    textKnob<HeroProps>("primaryCta", "Botón principal", "Primary button"),
    textKnob<HeroProps>("secondaryCta", "Botón secundario", "Secondary button"),
    textKnob<HeroProps>("note", "Nota", "Note"),
  ],
  defaultProps: (ctx) => {
    const copy = heroCopy(ctx);
    return {
      eyebrow: copy.eyebrow,
      title: copy.title,
      subtitle: copy.subtitle,
      primaryCta: copy.primaryCta,
      secondaryCta: copy.secondaryCta,
      note: heroNote(ctx),
      visual: defaultHeroVisual(ctx),
      align: "center",
      emphasis: "default",
      background: "brand-gradient",
      spacing: "normal",
    };
  },
  Component: Hero,
});
