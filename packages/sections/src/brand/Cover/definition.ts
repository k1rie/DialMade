import { z } from "zod";
import { t } from "../../content";
import { defineSection } from "../../defineSection";
import { Cover } from "./Cover";

export const coverSchema = z.strictObject({
  brandName: z.string().max(80),
  tagline: z.string().max(160).optional(),
  /** Small line above the name; empty → «Guía de estilo» in the page's language. */
  eyebrow: z.string().max(60).optional(),
  showIndex: z.boolean(),
  showFacts: z.boolean(),
});

export type CoverProps = z.infer<typeof coverSchema>;

export const coverSection = defineSection<CoverProps>({
  type: "brand.cover",
  kind: "brand",
  label: t("Portada", "Cover"),
  description: t(
    "Nombre, tagline y logo en grande, con el índice y la ficha de la guía.",
    "Name, tagline and a large logo, with the guide's contents and key facts.",
  ),
  variants: [
    { id: "split", label: t("Dividida", "Split") },
    { id: "centered", label: t("Centrada", "Centered") },
  ],
  schema: coverSchema,
  knobs: [
    { key: "variant", label: t("Composición", "Layout"), control: "select", scope: "section" },
    { key: "brandName", label: t("Nombre", "Name"), control: "text", scope: "section" },
    { key: "tagline", label: t("Tagline", "Tagline"), control: "text", scope: "section" },
    { key: "eyebrow", label: t("Antetítulo", "Eyebrow"), control: "text", scope: "section" },
    { key: "showIndex", label: t("Índice", "Contents"), control: "toggle", scope: "section" },
    { key: "showFacts", label: t("Ficha", "Facts"), control: "toggle", scope: "section" },
  ],
  bindings: { brandName: "brand.name", tagline: "brand.tagline" },
  defaultProps: (ctx) => ({
    brandName: ctx.brand.name,
    ...(ctx.brand.tagline ? { tagline: ctx.brand.tagline } : {}),
    showIndex: true,
    showFacts: true,
  }),
  Component: Cover,
});
