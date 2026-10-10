import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { countedList } from "../../lib/visible";
import { UI_LIST_MAX, uiListItems, uiListTitle, uiStrings } from "../content";
import { fitList } from "./fit";
import { List } from "./List";
import { listSchema, type ListProps } from "./schema";

export const listSection = defineSection<ListProps>({
  type: "ui.list",
  kind: "app",
  label: t("Lista", "List"),
  description: t("Filas con persona, detalle y hora.", "Rows with a person, a detail and a time."),
  variants: [
    { id: "simple", label: t("Simple", "Simple") },
    { id: "avatars", label: t("Con personas", "People") },
    { id: "divided", label: t("Con separadores", "Divided") },
  ],
  schema: listSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "count", label: t("Filas", "Rows"), control: "slider", min: 1, max: UI_LIST_MAX, step: 1, scope: "section" },
    { key: "showAvatars", label: t("Avatares", "Avatars"), control: "toggle", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "action", label: t("Enlace", "Link"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => ({
    title: uiListTitle(ctx),
    items: uiListItems(ctx, UI_LIST_MAX),
    count: 5,
    showAvatars: true,
    action: uiStrings(ctx.locale).viewAll,
    frame: "card",
  }),
  layout: { owns: ["count", "frame"], fit: fitList },
  visible: countedList("items"),
  Component: List,
});
