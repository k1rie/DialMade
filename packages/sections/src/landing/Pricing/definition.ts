import { z } from "zod";
import { contentProfileOf, pricingPlans } from "../../content";
import { defineSection } from "../../defineSection";
import { countedList } from "../../lib/visible";
import { sectionEyebrow, yearlyDiscount } from "../lib/copy";
import { sectionStyleShape, selectKnob, sliderKnob, styleKnobs, textKnob, toggleKnob, variantKnob } from "../lib/knobs";
import { landingStrings } from "../lib/strings";
import { extraPlan } from "./extraPlan";
import { Pricing } from "./Pricing";
import type { PricingProps } from "./types";

const planSchema = z.strictObject({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().min(0),
  description: z.string(),
  features: z.array(z.string()).max(8),
  cta: z.string().min(1),
  highlighted: z.boolean(),
});

export const pricingSection = defineSection<PricingProps>({
  type: "landing.pricing",
  kind: "landing",
  label: { es: "Precios", en: "Pricing" },
  description: {
    es: "Tres planes con el recomendado destacado y un selector mensual o anual.",
    en: "Three plans with the recommended one highlighted and a monthly or yearly switch.",
  },
  variants: [
    { id: "cards", label: { es: "Columnas", en: "Columns" } },
    { id: "split", label: { es: "Lista con resumen", en: "Split list" } },
  ],
  schema: z.strictObject({
    eyebrow: z.string(),
    title: z.string().min(1),
    subtitle: z.string(),
    note: z.string(),
    plans: z.array(planSchema).min(1).max(4),
    /** How many of `plans` are shown (1–4). */
    count: z.number().int().min(1).max(4),
    recurring: z.boolean(),
    billing: z.enum(["monthly", "yearly"]),
    showToggle: z.boolean(),
    yearlyDiscount: z.number().int().min(0).max(50),
    highlightLabel: z.string(),
    ...sectionStyleShape,
  }),
  knobs: [
    variantKnob<PricingProps>(),
    ...styleKnobs<PricingProps>({ es: "Plan destacado", en: "Highlighted plan" }),
    toggleKnob<PricingProps>("showToggle", "Selector mensual / anual", "Monthly / yearly switch"),
    selectKnob<PricingProps>("billing", "Periodo inicial", "Initial period", [
      { value: "monthly", label: { es: "Mensual", en: "Monthly" } },
      { value: "yearly", label: { es: "Anual", en: "Yearly" } },
    ]),
    sliderKnob<PricingProps>("yearlyDiscount", "Descuento anual (%)", "Yearly discount (%)", 0, 50, 5),
    textKnob<PricingProps>("title", "Título", "Title"),
    textKnob<PricingProps>("subtitle", "Subtítulo", "Subtitle"),
    textKnob<PricingProps>("highlightLabel", "Etiqueta del destacado", "Highlight label"),
    textKnob<PricingProps>("note", "Nota", "Note"),
  ],
  defaultProps: (ctx) => {
    const copy = pricingPlans(ctx);
    const recurring = contentProfileOf(ctx.productType).pricing.period === "month";
    const discount = recurring ? yearlyDiscount(ctx) : 0;
    const plans = copy.plans.map(({ id, name, price, description, features, cta, highlighted }) => ({
      id,
      name,
      price,
      description,
      features,
      cta,
      highlighted,
    }));
    return {
      eyebrow: sectionEyebrow(ctx, "pricing"),
      title: copy.title,
      subtitle: copy.subtitle,
      note: copy.note,
      plans,
      count: plans.length,
      recurring,
      billing: "monthly",
      showToggle: discount > 0,
      yearlyDiscount: discount,
      highlightLabel: landingStrings(ctx.locale).mostPopular,
      align: "center",
      emphasis: "default",
      background: "plain",
      spacing: "normal",
    };
  },
  layout: {
    owns: ["count"],
    fit: ({ estimate }) => (estimate?.kind === "count" ? { props: { count: estimate.value } } : {}),
    // Four plans, so `count` alone decides how many show.
    defaults: (ctx) => {
      const plans = pricingPlans(ctx).plans.map(({ id, name, price, description, features, cta, highlighted }) => ({
        id,
        name,
        price,
        description,
        features,
        cta,
        highlighted,
      }));
      return { plans: [...plans, extraPlan(ctx, plans)] };
    },
  },
  visible: countedList("plans"),
  Component: Pricing,
});
