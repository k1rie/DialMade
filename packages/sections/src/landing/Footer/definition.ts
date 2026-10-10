import { z } from "zod";
import { footerCopy } from "../../content";
import { defineSection } from "../../defineSection";
import { linkSchema, sectionStyleShape, styleKnobs, textKnob, variantKnob } from "../lib/knobs";
import { Footer } from "./Footer";
import type { FooterProps } from "./types";

export const footerSection = defineSection<FooterProps>({
  type: "landing.footer",
  kind: "landing",
  label: { es: "Pie de página", en: "Footer" },
  description: {
    es: "Marca, columnas de enlaces y la línea legal.",
    en: "Brand, link columns and the legal line.",
  },
  variants: [
    { id: "columns", label: { es: "Columnas", en: "Columns" } },
    { id: "simple", label: { es: "Una línea", en: "Single row" } },
  ],
  schema: z.strictObject({
    brandName: z.string().min(1),
    tagline: z.string(),
    columns: z.array(z.strictObject({ title: z.string(), links: z.array(linkSchema).max(8) })).max(4),
    rights: z.string(),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<FooterProps>(),
    ...styleKnobs<FooterProps>({ es: "Presencia de la marca", en: "Brand presence" }),
    textKnob<FooterProps>("tagline", "Eslogan", "Tagline"),
    textKnob<FooterProps>("rights", "Texto legal", "Legal text"),
  ],
  bindings: { brandName: "brand.name", tagline: "brand.tagline" },
  defaultProps: (ctx) => {
    const copy = footerCopy(ctx);
    return {
      brandName: ctx.brand.name,
      tagline: ctx.brand.tagline ?? "",
      columns: copy.columns,
      rights: copy.rights,
      align: "start",
      emphasis: "default",
      background: "plain",
      spacing: "compact",
    };
  },
  Component: Footer,
});
