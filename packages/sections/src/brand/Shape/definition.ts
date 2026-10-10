import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Shape } from "./Shape";

export const shapeSchema = z.strictObject({
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  showSpacing: z.boolean(),
});

export type ShapeProps = z.infer<typeof shapeSchema>;

export const shapeSection = defineSection<ShapeProps>({
  type: "brand.shape",
  kind: "brand",
  label: t("Formas", "Shape"),
  description: t(
    "Radios, sombras, bordes, espaciado y densidad del sistema.",
    "The system's radii, shadows, borders, spacing and density.",
  ),
  variants: [
    { id: "tiles", label: t("Detalle", "Detailed") },
    { id: "summary", label: t("Resumen", "Summary") },
  ],
  schema: shapeSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "showSpacing", label: t("Espaciado y densidad", "Spacing and density"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showSpacing: true }),
  Component: Shape,
});
