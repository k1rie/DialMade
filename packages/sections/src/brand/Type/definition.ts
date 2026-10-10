import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Type } from "./Type";

export const typeSchema = z.strictObject({
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  /** Text of the display sample; empty → the brand name. */
  sample: z.string().max(80).optional(),
  showGlyphs: z.boolean(),
});

export type TypeProps = z.infer<typeof typeSchema>;

export const typeSection = defineSection<TypeProps>({
  type: "brand.type",
  kind: "brand",
  label: t("Tipografía", "Typography"),
  description: t(
    "La pareja tipográfica con su specimen, la escala real de display a leyenda y los pesos.",
    "The type pairing as a specimen, the real scale from display to caption, and the weights.",
  ),
  variants: [
    { id: "specimen", label: t("Specimen", "Specimen") },
    { id: "scale", label: t("Solo escala", "Scale only") },
  ],
  schema: typeSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "sample", label: t("Texto de muestra", "Sample text"), control: "text", scope: "section" },
    { key: "showGlyphs", label: t("Caracteres", "Characters"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showGlyphs: true }),
  Component: Type,
});
