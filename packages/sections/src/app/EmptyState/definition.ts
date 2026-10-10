import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appCopyOf, text } from "../content";
import { EmptyState } from "./EmptyState";
import { emptyStateSchema, type EmptyStateProps } from "./schema";

export const emptyStateSection = defineSection<EmptyStateProps>({
  type: "app.emptyState",
  kind: "app",
  label: t("Estado vacío", "Empty state"),
  description: t("Cómo se ve una lista antes de tener datos.", "What a list looks like before it has data."),
  variants: [
    { id: "dashed", label: t("Recuadro", "Dashed box") },
    { id: "illustrated", label: t("Ilustrado", "Illustrated") },
  ],
  schema: emptyStateSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "primaryAction", label: t("Acción principal", "Primary action"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const { empty } = appCopyOf(ctx);
    return {
      icon: empty.icon,
      title: text(empty.title, ctx),
      description: text(empty.description, ctx),
      primaryAction: text(empty.action, ctx),
      secondaryAction: text(empty.secondary, ctx),
    };
  },
  layout: {
    owns: [],
    // Tall blocks (≥ 320 px) have room for the illustration.
    fit: ({ heightPx }) => ({ variant: heightPx >= 320 ? "illustrated" : "dashed" }),
  },
  Component: EmptyState,
});
