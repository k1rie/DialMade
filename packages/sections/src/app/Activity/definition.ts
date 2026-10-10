import { activityFeed } from "../../content/generators";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings } from "../content";
import { Activity } from "./Activity";
import { activitySchema, type ActivityProps } from "./schema";

export const activitySection = defineSection<ActivityProps>({
  type: "app.activity",
  kind: "app",
  label: t("Actividad", "Activity"),
  description: t("Lo último que ha pasado, con quién y cuándo.", "What happened lately, who did it and when."),
  variants: [
    { id: "timeline", label: t("Línea de tiempo", "Timeline") },
    { id: "list", label: t("Lista con personas", "People list") },
  ],
  schema: activitySchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "count", label: t("Entradas", "Entries"), control: "slider", min: 3, max: 6, step: 1, scope: "section" },
    { key: "showViewAll", label: t("Enlace «Ver todo»", "“View all” link"), control: "toggle", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const strings = appStrings(ctx.locale);
    const items = activityFeed(ctx, 6).map(({ id, actor, text, time, tone, icon }) => ({
      id,
      actor,
      text,
      time,
      tone,
      ...(icon && { icon }),
    }));
    return { title: strings.activityTitle, description: "", items, count: 5, showViewAll: true };
  },
  Component: Activity,
});
