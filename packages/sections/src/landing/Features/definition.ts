import { z } from "zod";
import { featureList, sectionHeading } from "../../content";
import { defineSection } from "../../defineSection";
import { sectionEyebrow } from "../lib/copy";
import { iconSchema, sectionStyleShape, sliderKnob, styleKnobs, textKnob, variantKnob } from "../lib/knobs";
import { Features } from "./Features";
import type { FeaturesProps } from "./types";

export const featuresSection = defineSection<FeaturesProps>({
  type: "landing.features",
  kind: "landing",
  label: { es: "Funciones", en: "Features" },
  description: {
    es: "De tres a seis ventajas con icono, en rejilla o en bento.",
    en: "Three to six benefits with icons, as a grid or a bento.",
  },
  variants: [
    { id: "grid", label: { es: "Rejilla", en: "Grid" } },
    { id: "bento", label: { es: "Bento", en: "Bento" } },
  ],
  schema: z.strictObject({
    eyebrow: z.string(),
    title: z.string().min(1),
    subtitle: z.string(),
    items: z.array(z.strictObject({ icon: iconSchema, title: z.string(), description: z.string() })).min(1).max(6),
    count: z.number().int().min(3).max(6),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<FeaturesProps>(),
    sliderKnob<FeaturesProps>("count", "Número de funciones", "Number of features", 3, 6),
    ...styleKnobs<FeaturesProps>({ es: "Estilo de los iconos", en: "Icon style" }),
    textKnob<FeaturesProps>("eyebrow", "Antetítulo", "Eyebrow"),
    textKnob<FeaturesProps>("title", "Título", "Title"),
    textKnob<FeaturesProps>("subtitle", "Subtítulo", "Subtitle"),
  ],
  defaultProps: (ctx) => {
    const heading = sectionHeading(ctx, "features");
    const items = featureList(ctx, 6);
    return {
      eyebrow: sectionEyebrow(ctx, "features"),
      title: heading.title,
      subtitle: heading.subtitle,
      items,
      count: Math.min(6, Math.max(3, items.length)),
      align: "center",
      emphasis: "default",
      background: "plain",
      spacing: "normal",
    };
  },
  Component: Features,
});
