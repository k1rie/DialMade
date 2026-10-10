import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { ArtDirection } from "./ArtDirection";

const rule = z.string().max(160);

export const artDirectionSchema = z.strictObject({
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  /** Empty → the default rules in the page's language. */
  dos: z.array(rule).max(4).optional(),
  donts: z.array(rule).max(4).optional(),
  showApplications: z.boolean(),
});

export type ArtDirectionProps = z.infer<typeof artDirectionSchema>;

export const artDirectionSection = defineSection<ArtDirectionProps>({
  type: "brand.artDirection",
  kind: "brand",
  label: t("Dirección de arte", "Art direction"),
  description: t(
    "Degradados y texturas derivados de la marca, qué hacer y qué evitar, y miniaturas de la landing y el dashboard.",
    "Gradients and textures derived from the brand, do's and don'ts, and thumbnails of the landing and dashboard.",
  ),
  variants: [
    { id: "moodboard", label: t("Moodboard", "Moodboard") },
    { id: "guidelines", label: t("Normas", "Guidelines") },
  ],
  schema: artDirectionSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "showApplications", label: t("Aplicaciones", "Applications"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showApplications: true }),
  Component: ArtDirection,
});
