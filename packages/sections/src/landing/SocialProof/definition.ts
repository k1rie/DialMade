import { z } from "zod";
import { logoWall, statList } from "../../content";
import { defineSection } from "../../defineSection";
import { sectionStyleShape, styleKnobs, textKnob, toggleKnob, variantKnob } from "../lib/knobs";
import { SocialProof } from "./SocialProof";
import type { SocialProofProps } from "./types";

export const socialProofSection = defineSection<SocialProofProps>({
  type: "landing.socialProof",
  kind: "landing",
  label: { es: "Prueba social", en: "Social proof" },
  description: {
    es: "Logotipos ficticios de clientes o medios y las cifras que respaldan el producto.",
    en: "Fictional customer or press logos and the numbers that back the product.",
  },
  variants: [
    { id: "logos", label: { es: "Logotipos", en: "Logo wall" } },
    { id: "metrics", label: { es: "Cifras", en: "Metrics" } },
  ],
  schema: z.strictObject({
    title: z.string().min(1),
    logos: z.array(z.string().min(1)).max(8),
    stats: z.array(z.strictObject({ value: z.string(), label: z.string() })).max(4),
    showStats: z.boolean(),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<SocialProofProps>(),
    ...styleKnobs<SocialProofProps>({ es: "Contraste de los logotipos", en: "Logo contrast" }),
    toggleKnob<SocialProofProps>("showStats", "Mostrar cifras", "Show numbers"),
    textKnob<SocialProofProps>("title", "Título", "Title"),
  ],
  defaultProps: (ctx) => {
    const wall = logoWall(ctx, 6);
    return {
      title: wall.title,
      logos: wall.names,
      stats: statList(ctx),
      showStats: false,
      align: "center",
      emphasis: "default",
      background: "plain",
      spacing: "compact",
    };
  },
  Component: SocialProof,
});
