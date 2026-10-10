import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import type { KnobOption } from "../../types";
import { fitRegion } from "./fit";
import { regionFrame } from "./frame";
import { Region } from "./Region";
import { regionSchema, type RegionProps } from "./schema";

const PADDING_OPTIONS: readonly KnobOption[] = [
  { value: "none", label: t("Sin margen", "None") },
  { value: "sm", label: t("Pequeño", "Small") },
  { value: "md", label: t("Medio", "Medium") },
  { value: "lg", label: t("Grande", "Large") },
];

export const regionSection = defineSection<RegionProps>({
  type: "ui.region",
  kind: "app",
  label: t("Contenedor", "Container"),
  description: t("Agrupa bloques con su propio fondo y margen.", "Groups blocks with their own background and padding."),
  variants: [
    { id: "plain", label: t("Sin fondo", "Plain") },
    { id: "card", label: t("Tarjeta", "Card") },
    { id: "muted", label: t("Fondo suave", "Muted") },
  ],
  schema: regionSchema,
  knobs: [
    { key: "variant", label: t("Fondo", "Surface"), control: "select", scope: "section" },
    { key: "padding", label: t("Margen interior", "Padding"), control: "select", options: PADDING_OPTIONS, scope: "section" },
  ],
  defaultProps: () => ({ role: "group", padding: "none", layout: "stack", screenKind: "landing" }),
  container: true,
  layout: { owns: ["role"], fit: fitRegion },
  frame: regionFrame,
  Component: Region,
});
