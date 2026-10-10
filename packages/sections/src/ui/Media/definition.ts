import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { uiMediaCopy } from "../content";
import { fitMedia } from "./fit";
import { Media } from "./Media";
import { mediaSchema, type MediaProps } from "./schema";

export const mediaSection = defineSection<MediaProps>({
  type: "ui.media",
  kind: "app",
  label: t("Media", "Media"),
  description: t(
    "Una imagen de producto hecha con los colores de tu marca, sin fotos.",
    "A product image made with your brand colors, no photos.",
  ),
  variants: [
    { id: "gradient", label: t("Degradado", "Gradient") },
    { id: "browser", label: t("Navegador", "Browser") },
    { id: "device", label: t("Teléfono", "Phone") },
  ],
  schema: mediaSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "caption", label: t("Pie de imagen", "Caption"), control: "text", scope: "section" },
    { key: "alt", label: t("Texto alternativo", "Alt text"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const copy = uiMediaCopy(ctx);
    return { ratio: "16:9", caption: copy.caption, alt: copy.alt, frame: "plain" };
  },
  layout: { owns: ["ratio", "frame"], fit: fitMedia },
  Component: Media,
});
