import { tableData } from "../../content/generators";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import type { ContentContext } from "../../types";
import { appCopyOf, appStrings, text } from "../content";
import { ConfirmDialog } from "./ConfirmDialog";
import { confirmDialogSchema, type ConfirmDialogProps } from "./schema";

const SUBJECT_KINDS = new Set(["id", "person", "company", "choice", "money", "date", "time"]);

/** The first row of the profile's table, as the thing being confirmed («#10482 · Lucía Herrera · 129 €»). */
function subjectOf(ctx: ContentContext): string {
  const { columns, rows } = tableData(ctx, 1);
  const row = rows[0];
  if (!row) return "";
  return columns
    .filter((column) => SUBJECT_KINDS.has(column.kind))
    .slice(0, 3)
    .map((column) => row.cells[column.key]?.text)
    .filter(Boolean)
    .join(" · ");
}

export const confirmDialogSection = defineSection<ConfirmDialogProps>({
  type: "app.confirmDialog",
  kind: "app",
  label: t("Diálogo de confirmación", "Confirmation dialog"),
  description: t("Una acción delicada que pide confirmación.", "A sensitive action that asks for confirmation."),
  variants: [
    { id: "modal", label: t("Sobre la página", "Over the page") },
    { id: "panel", label: t("Solo el panel", "Panel only") },
  ],
  schema: confirmDialogSchema,
  knobs: [
    { key: "variant", label: t("Presentación", "Presentation"), control: "select", scope: "section" },
    { key: "destructive", label: t("Acción destructiva", "Destructive action"), control: "toggle", scope: "section" },
    { key: "title", label: t("Pregunta", "Question"), control: "text", scope: "section" },
    { key: "confirmLabel", label: t("Botón de confirmar", "Confirm button"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const { confirm } = appCopyOf(ctx);
    return {
      title: text(confirm.title, ctx),
      description: text(confirm.description, ctx),
      subject: subjectOf(ctx),
      confirmLabel: text(confirm.action, ctx),
      cancelLabel: confirm.cancel ? text(confirm.cancel, ctx) : appStrings(ctx.locale).cancel,
      destructive: true,
    };
  },
  Component: ConfirmDialog,
});
