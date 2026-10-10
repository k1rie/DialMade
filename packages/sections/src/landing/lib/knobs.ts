import { z } from "zod";
import { isIconName, type IconName } from "@dialmade/ui";
import { t } from "../../content";
import type { KnobDef, KnobOption } from "../../types";

export const BACKGROUNDS = ["plain", "subtle", "brand-gradient"] as const;
export const SPACINGS = ["compact", "normal", "roomy"] as const;
export const ALIGNS = ["start", "center"] as const;
export const EMPHASES = ["subtle", "default", "bold"] as const;

export type Background = (typeof BACKGROUNDS)[number];
export type Spacing = (typeof SPACINGS)[number];
export type Align = (typeof ALIGNS)[number];
export type Emphasis = (typeof EMPHASES)[number];

export const backgroundSchema = z.enum(BACKGROUNDS);
export const spacingSchema = z.enum(SPACINGS);
export const alignSchema = z.enum(ALIGNS);
export const emphasisSchema = z.enum(EMPHASES);
export const iconSchema = z.custom<IconName>((value) => isIconName(value), { message: "Unknown icon" });
/** A link; `linkTo` (Layout mode) names the screen it opens and wins over `href` when that screen has a URL. */
export const linkSchema = z.strictObject({ label: z.string(), href: z.string(), linkTo: z.string().min(1).max(64).optional() });

/** Section-wide look shared by every landing section. */
export interface SectionStyle {
  align: Align;
  emphasis: Emphasis;
  background: Background;
  spacing: Spacing;
}

export const sectionStyleShape = {
  align: alignSchema,
  emphasis: emphasisSchema,
  background: backgroundSchema,
  spacing: spacingSchema,
};

const option = (value: string, es: string, en: string): KnobOption => ({ value, label: t(es, en) });

export const BACKGROUND_OPTIONS: readonly KnobOption[] = [
  option("plain", "Liso", "Plain"),
  option("subtle", "Sutil", "Subtle"),
  option("brand-gradient", "Degradado de marca", "Brand gradient"),
];
export const SPACING_OPTIONS: readonly KnobOption[] = [
  option("compact", "Compacto", "Compact"),
  option("normal", "Normal", "Normal"),
  option("roomy", "Amplio", "Roomy"),
];
export const ALIGN_OPTIONS: readonly KnobOption[] = [option("start", "Izquierda", "Left"), option("center", "Centrado", "Centered")];
export const EMPHASIS_OPTIONS: readonly KnobOption[] = [
  option("subtle", "Sutil", "Subtle"),
  option("default", "Normal", "Default"),
  option("bold", "Audaz", "Bold"),
];

type Key<P> = Extract<keyof P, string>;
const key = <P>(name: string) => name as Key<P>;

export const variantKnob = <P extends object>(): KnobDef<P> => ({
  key: "variant",
  label: t("Variante", "Variant"),
  control: "select",
  scope: "section",
});

export const textKnob = <P extends object>(name: Key<P>, es: string, en: string): KnobDef<P> => ({
  key: name,
  label: t(es, en),
  control: "text",
  scope: "section",
});

export const toggleKnob = <P extends object>(name: Key<P>, es: string, en: string): KnobDef<P> => ({
  key: name,
  label: t(es, en),
  control: "toggle",
  scope: "section",
});

export const selectKnob = <P extends object>(name: Key<P>, es: string, en: string, options: readonly KnobOption[]): KnobDef<P> => ({
  key: name,
  label: t(es, en),
  control: "select",
  options,
  scope: "section",
});

export const sliderKnob = <P extends object>(name: Key<P>, es: string, en: string, min: number, max: number, step = 1): KnobDef<P> => ({
  key: name,
  label: t(es, en),
  control: "slider",
  min,
  max,
  step,
  scope: "section",
});

/** Alignment, emphasis, background and spacing, in that order; `emphasisLabel` names what emphasis does here. */
export function styleKnobs<P extends SectionStyle>(emphasisLabel: { es: string; en: string } = { es: "Énfasis", en: "Emphasis" }): KnobDef<P>[] {
  return [
    selectKnob<P>(key<P>("align"), "Alineación", "Alignment", ALIGN_OPTIONS),
    selectKnob<P>(key<P>("emphasis"), emphasisLabel.es, emphasisLabel.en, EMPHASIS_OPTIONS),
    selectKnob<P>(key<P>("background"), "Fondo", "Background", BACKGROUND_OPTIONS),
    selectKnob<P>(key<P>("spacing"), "Espaciado", "Spacing", SPACING_OPTIONS),
  ];
}
