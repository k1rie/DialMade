import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Components } from "./Components";

export const componentsSchema = z.strictObject({
  title: z.string().max(120).optional(),
  intro: z.string().max(280).optional(),
  showTable: z.boolean(),
});

export type ComponentsProps = z.infer<typeof componentsSchema>;

export const componentsSection = defineSection<ComponentsProps>({
  type: "brand.components",
  kind: "brand",
  label: t("Componentes", "Components"),
  description: t(
    "Una selección del kit con la marca: botones, campos, etiquetas, una tarjeta y una tabla corta.",
    "A selection of the kit wearing the brand: buttons, fields, badges, a card and a short table.",
  ),
  variants: [
    { id: "showcase", label: t("Vitrina", "Showcase") },
    { id: "states", label: t("Estados", "States") },
  ],
  schema: componentsSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "intro", label: t("Introducción", "Intro"), control: "text", scope: "section" },
    { key: "showTable", label: t("Tabla", "Table"), control: "toggle", scope: "section" },
  ],
  defaultProps: () => ({ showTable: true }),
  Component: Components,
});
