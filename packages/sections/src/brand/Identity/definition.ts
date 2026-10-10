import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Identity } from "./Identity";

export const identitySchema = z.strictObject({
  /** Empty → the default title in the page's language. */
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  showClearSpace: z.boolean(),
  showSizes: z.boolean(),
});

export type IdentityProps = z.infer<typeof identitySchema>;

export const identitySection = defineSection<IdentityProps>({
  type: "brand.identity",
  kind: "brand",
  label: t("Identidad", "Identity"),
  description: t(
    "El logo sobre fondo claro, oscuro y de marca, con su zona de respeto, tamaño mínimo y versiones.",
    "The logo on light, dark and brand backgrounds, with clear space, minimum size and versions.",
  ),
  variants: [
    { id: "surfaces", label: t("Tres superficies", "Three surfaces") },
    { id: "spotlight", label: t("Destacado", "Spotlight") },
  ],
  schema: identitySchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "showClearSpace", label: t("Zona de respeto", "Clear space"), control: "toggle", scope: "section" },
    { key: "showSizes", label: t("Tamaños y versiones", "Sizes and versions"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showClearSpace: true, showSizes: true }),
  Component: Identity,
});
