export type OutputKind = "brand" | "landing" | "app";
export type Locale = "es" | "en";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface ProductType {
  id: string;
  label: LocalizedText;
  group: string;
  landingPatternId?: string;
  dashboardStyle?: string;
  doNotUseStyles: string[];
  keywords: string[];
  /** Style ID de uupm recomendados para el producto, en orden (primario y secundarios). */
  styleIds?: string[];
}

export interface TypographyPairing {
  id: string;
  label: LocalizedText;
  heading: { family: string; weights: number[]; fallback: string };
  body: { family: string; weights: number[]; fallback: string };
  googleFontsUrl: string;
  mood: string[];
  /** Pairing de typography.csv en el que se inspira (ver data/typographySources.json). */
  sourcePairingId?: string;
}

export interface StyleRecipe {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  sourceStyleId?: string;
  radius: { sm: number; md: number; lg: number; xl: number };
  borderWidth: number;
  shadow: "none" | "soft" | "crisp" | "deep" | "glow";
  surface: "flat" | "layered" | "glass" | "outlined";
  button: { shape: "square" | "rounded" | "pill"; weight: number; shadow: boolean };
  card: { elevation: 0 | 1 | 2 | 3; border: boolean; padding: "compact" | "normal" | "roomy" };
  headingWeight: number;
  headingTracking: number;
  defaultMotion: "subtle" | "standard" | "expressive";
  tags: string[];
  /** Otros Style ID de uupm que esta receta representa. */
  relatedStyleIds?: string[];
  /** Pairing que mejor encaja con la receta. */
  pairingId?: string;
  /** Modo en el que la receta luce mejor. Sin valor, funciona igual en claro y oscuro. */
  preferredMode?: "light" | "dark";
}

export interface LandingLayout {
  id: string;
  label: LocalizedText;
  sections: string[];
  sourcePatternId?: string;
  description?: LocalizedText;
  /** Pattern ID de landing.csv que este layout cubre. */
  patternIds?: string[];
}

export interface MotionTier {
  id: "subtle" | "standard" | "expressive";
  label: LocalizedText;
  durations: { fast: number; base: number; slow: number };
  ease: string;
  description?: LocalizedText;
}

export type LandingSectionType =
  | "landing.navbar"
  | "landing.hero"
  | "landing.socialProof"
  | "landing.features"
  | "landing.testimonials"
  | "landing.pricing"
  | "landing.cta"
  | "landing.footer";

export type GenericProductId = "generic";

export type ProductGroupId =
  | "software"
  | "data"
  | "developer"
  | "commerce"
  | "finance"
  | "health"
  | "education"
  | "media"
  | "creative"
  | "community"
  | "services"
  | "travel"
  | "personal"
  | "games"
  | "public"
  | "industry"
  | "events";

export interface ProductGroup {
  id: ProductGroupId;
  label: LocalizedText;
}

/** Chip de tipo de producto. `id` es el id de un ProductType o `"generic"`. */
export interface ProductChip {
  id: string;
  label: LocalizedText;
}

export type FirstUseAnswer = "launch" | "build" | "handoff";

export interface FirstUseOption {
  answer: FirstUseAnswer;
  kind: OutputKind;
  label: LocalizedText;
}

export interface OutputKindOption {
  id: OutputKind;
  label: LocalizedText;
  /** Completa la frase «Para ti si…». */
  forYouIf: LocalizedText;
}

export interface StyleSource {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface TypographySource {
  id: string;
  name: string;
  category: string;
  heading: string;
  body: string;
  mood: string[];
}

export interface FontFamily {
  family: string;
  category: string;
  weights: number[];
}

export interface DesignDefaults {
  productType: ProductType | undefined;
  recipe: StyleRecipe;
  pairing: TypographyPairing;
  landingLayout: LandingLayout;
  motion: MotionTier;
}
