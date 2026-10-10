import type { LocalizedText } from "@dialmade/catalog";
import { t } from "../../content";

/** Display names of the color roles (camelCase keys, as in `theme.light`). */
export const ROLE_NAMES: Readonly<Record<string, LocalizedText>> = {
  background: t("Papel", "Paper"),
  foreground: t("Tinta", "Ink"),
  card: t("Tarjeta", "Card"),
  cardForeground: t("Texto en tarjeta", "Card text"),
  popover: t("Popover", "Popover"),
  popoverForeground: t("Texto en popover", "Popover text"),
  primary: t("Primario", "Primary"),
  primaryForeground: t("Sobre primario", "On primary"),
  secondary: t("Secundario", "Secondary"),
  secondaryForeground: t("Sobre secundario", "On secondary"),
  muted: t("Superficie", "Surface"),
  mutedForeground: t("Texto secundario", "Muted text"),
  accent: t("Tinte de marca", "Brand tint"),
  accentForeground: t("Sobre tinte", "On tint"),
  destructive: t("Destructivo", "Destructive"),
  destructiveForeground: t("Sobre destructivo", "On destructive"),
  border: t("Borde", "Border"),
  input: t("Borde de campo", "Input border"),
  ring: t("Foco", "Focus ring"),
  brand: t("Marca exacta", "Exact brand"),
  cta: t("Llamada a la acción", "Call to action"),
  ctaForeground: t("Sobre CTA", "On CTA"),
  primaryText: t("Texto de marca", "Brand text"),
  borderStrong: t("Borde fuerte", "Strong border"),
  success: t("Éxito", "Success"),
  successForeground: t("Sobre éxito", "On success"),
  warning: t("Aviso", "Warning"),
  warningForeground: t("Sobre aviso", "On warning"),
  info: t("Información", "Info"),
  infoForeground: t("Sobre información", "On info"),
  chart1: t("Gráfica 1", "Chart 1"),
  chart2: t("Gráfica 2", "Chart 2"),
  chart3: t("Gráfica 3", "Chart 3"),
  chart4: t("Gráfica 4", "Chart 4"),
  chart5: t("Gráfica 5", "Chart 5"),
};

/** The big chips: the colors that define the brand at a glance. */
export const CHIP_ROLES = ["primary", "cta", "foreground", "background", "muted", "accent"] as const;

/** Rows of the roles table; `charts` is one row with chart-1…5. */
export const TABLE_ROLES = [
  "background",
  "foreground",
  "card",
  "primary",
  "primaryForeground",
  "primaryText",
  "secondary",
  "muted",
  "mutedForeground",
  "accent",
  "cta",
  "ctaForeground",
  "border",
  "borderStrong",
  "ring",
  "destructive",
  "success",
  "warning",
  "info",
  "charts",
] as const;

export const CHART_ROLES = ["chart1", "chart2", "chart3", "chart4", "chart5"] as const;

/** Pairs shown in the contrast table (all of them count in the summary). */
export const KEY_PAIRS = [
  "foreground/background",
  "mutedForeground/background",
  "cardForeground/card",
  "primaryForeground/primary",
  "primaryText/background",
  "ctaForeground/cta",
  "secondaryForeground/secondary",
  "destructiveForeground/destructive",
  "successForeground/success",
  "warningForeground/warning",
  "infoForeground/info",
  "borderStrong/background",
  "ring/background",
] as const;

export const SCALE_GROUPS = ["brand", "cta", "neutral", "success", "warning", "error", "info"] as const;
export type ScaleGroup = (typeof SCALE_GROUPS)[number];

export const SCALE_NAMES: Readonly<Record<ScaleGroup, LocalizedText>> = {
  brand: t("Marca", "Brand"),
  cta: t("CTA", "CTA"),
  neutral: t("Neutro", "Neutral"),
  success: t("Éxito", "Success"),
  warning: t("Aviso", "Warning"),
  error: t("Error", "Error"),
  info: t("Info", "Info"),
};

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
