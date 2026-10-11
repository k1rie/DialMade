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

export type ThemeMode = "light" | "dark";
export type ThemeSource = "daisyui" | "tweakcn";

/** Roles de color de un tema importado, en hex sRGB. Los opcionales dependen de la fuente. */
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  destructive: string;
  destructiveForeground?: string;
  /** Solo daisyUI. */
  success?: string;
  warning?: string;
  info?: string;
  /** Solo tweakcn: 5 colores de gráfica. */
  chart?: string[];
}

/** La forma de un tema importado: todo menos los colores (la paleta es de la marca del usuario). */
export interface ThemeShape {
  id: string;
  label: string;
  source: ThemeSource;
  /** Nombre del tema en su origen (`cupcake`, `neo-brutalism`). */
  sourceKey: string;
  /** daisyUI define un tema por modo; tweakcn trae claro y oscuro juntos. */
  modes: ThemeMode[];
  /** Radios en px: `selector` (chips, toggles), `field` (botones, inputs) y `box` (cards, modales). */
  radius: { selector: number; field: number; box: number };
  /** Ancho de borde en px. */
  border: number;
  /** Solo daisyUI: relieve de botones y cards. */
  depth?: 0 | 1;
  /** Solo daisyUI: textura de ruido. */
  noise?: 0 | 1;
  /** Solo tweakcn: primera familia de cada pila. */
  fonts?: { sans?: string; serif?: string; mono?: string };
  /** Solo tweakcn: sombra base en px. */
  shadow?: { color: string; opacity: number; blur: number; spread: number; x: number; y: number };
  /** Solo tweakcn: `letter-spacing` en em. */
  tracking?: number;
  /** Solo tweakcn: unidad de espaciado en rem (0.25 es la de Tailwind). */
  spacing?: number;
}

/** Un tema de daisyUI o tweakcn ya normalizado por el ETL (`data/themePresets.json`). */
export interface ThemePreset extends ThemeShape {
  colors: Partial<Record<ThemeMode, ThemeColors>>;
}

/** Una receta derivada de un tema, con el arquetipo hecho a mano del que hereda lo que el tema no define. */
export interface ThemeRecipe extends StyleRecipe {
  themeId: string;
  archetypeId: string;
}
