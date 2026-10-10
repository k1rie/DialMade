import { z } from "zod";
import { contentProfileIdOf, ctaCopy, heroCopy } from "../../content";
import { defineSection } from "../../defineSection";
import { ctaNote } from "../lib/copy";
import { sectionStyleShape, styleKnobs, textKnob, toggleKnob, variantKnob } from "../lib/knobs";
import { Cta } from "./Cta";
import type { CtaProps } from "./types";

export const ctaSection = defineSection<CtaProps>({
  type: "landing.cta",
  kind: "landing",
  label: { es: "Llamada a la acción", en: "Call to action" },
  description: {
    es: "El último empujón: un panel con el botón principal o un campo de correo.",
    en: "The final push: a panel with the main button or an email field.",
  },
  variants: [
    { id: "banner", label: { es: "Panel centrado", en: "Centered banner" } },
    { id: "split", label: { es: "Texto y acción", en: "Split" } },
  ],
  schema: z.strictObject({
    title: z.string().min(1),
    subtitle: z.string(),
    button: z.string().min(1),
    secondaryButton: z.string(),
    note: z.string(),
    showForm: z.boolean(),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<CtaProps>(),
    ...styleKnobs<CtaProps>({ es: "Intensidad del panel", en: "Panel intensity" }),
    toggleKnob<CtaProps>("showForm", "Campo de correo", "Email field"),
    textKnob<CtaProps>("title", "Título", "Title"),
    textKnob<CtaProps>("subtitle", "Subtítulo", "Subtitle"),
    textKnob<CtaProps>("button", "Botón", "Button"),
    textKnob<CtaProps>("secondaryButton", "Botón secundario", "Secondary button"),
    textKnob<CtaProps>("note", "Nota", "Note"),
  ],
  defaultProps: (ctx) => {
    const copy = ctaCopy(ctx);
    return {
      title: copy.title,
      subtitle: copy.subtitle,
      button: copy.button,
      secondaryButton: heroCopy(ctx).secondaryCta,
      note: ctaNote(ctx),
      showForm: contentProfileIdOf(ctx.productType) === "commerce",
      align: "center",
      emphasis: "bold",
      background: "plain",
      spacing: "normal",
    };
  },
  layout: {
    owns: [],
    // A short, wide strip reads as text and action side by side; anything taller, as a centered panel.
    fit: ({ w, heightPx }) => ({ variant: w >= 9 && heightPx <= 160 ? "split" : "banner" }),
  },
  Component: Cta,
});
