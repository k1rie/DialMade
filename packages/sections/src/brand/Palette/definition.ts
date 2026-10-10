import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Palette } from "./Palette";

export const paletteSchema = z.strictObject({
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  showScales: z.boolean(),
  showContrast: z.boolean(),
});

export type PaletteProps = z.infer<typeof paletteSchema>;

export const paletteSection = defineSection<PaletteProps>({
  type: "brand.palette",
  kind: "brand",
  label: t("Paleta", "Palette"),
  description: t(
    "Colores principales, roles en claro y oscuro, escalas 50–950 y tabla de contraste AA.",
    "Core colors, roles in light and dark, 50–950 scales and an AA contrast table.",
  ),
  variants: [
    { id: "system", label: t("Sistema completo", "Full system") },
    { id: "swatches", label: t("Muestras", "Swatches") },
  ],
  schema: paletteSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "showScales", label: t("Escalas", "Scales"), control: "toggle", scope: "section" },
    { key: "showContrast", label: t("Contraste", "Contrast"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showScales: true, showContrast: true }),
  Component: Palette,
});
