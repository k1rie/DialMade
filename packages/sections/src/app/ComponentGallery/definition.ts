import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings } from "../content";
import { ComponentGallery } from "./ComponentGallery";
import { componentGallerySchema, type ComponentGalleryProps } from "./schema";

export const componentGallerySection = defineSection<ComponentGalleryProps>({
  type: "app.componentGallery",
  kind: "app",
  label: t("Componentes", "Components"),
  description: t(
    "El UI kit con tu tema: botones, formularios, tablas, gráficas y sus estados.",
    "The UI kit with your theme: buttons, forms, tables, charts and their states.",
  ),
  variants: [
    { id: "index", label: t("Con índice", "With index") },
    { id: "stacked", label: t("Sin índice", "No index") },
  ],
  schema: componentGallerySchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    {
      key: "scope",
      label: t("Qué mostrar", "What to show"),
      control: "select",
      options: [
        { value: "all", label: t("Todos los componentes", "Every component") },
        { value: "essentials", label: t("Lo esencial", "Essentials") },
      ],
      scope: "section",
    },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
  ],
  bindings: { brandName: "brand.name" },
  defaultProps: (ctx) => {
    const strings = appStrings(ctx.locale);
    return { brandName: ctx.brand.name, title: strings.galleryTitle, subtitle: strings.gallerySubtitle, scope: "all" };
  },
  Component: ComponentGallery,
});
