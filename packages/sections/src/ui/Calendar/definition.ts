import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import type { KnobOption } from "../../types";
import { defaultWeekday, uiCalendarEvents, uiCalendarTitle } from "../content";
import { Calendar } from "./Calendar";
import { fitCalendar } from "./fit";
import { calendarSchema, type CalendarProps } from "./schema";

const WEEKDAY_OPTIONS: readonly KnobOption[] = [
  { value: "monday", label: t("Lunes", "Monday") },
  { value: "sunday", label: t("Domingo", "Sunday") },
];

export const calendarSection = defineSection<CalendarProps>({
  type: "ui.calendar",
  kind: "app",
  label: t("Calendario", "Calendar"),
  description: t("Eventos del mes, de la semana o los próximos.", "Events of the month, of the week or coming up."),
  variants: [
    { id: "month", label: t("Mes", "Month") },
    { id: "week", label: t("Semana", "Week") },
    { id: "agenda", label: t("Agenda", "Agenda") },
    { id: "mini", label: t("Mini", "Mini") },
  ],
  schema: calendarSchema,
  knobs: [
    { key: "variant", label: t("Vista", "View"), control: "select", scope: "section" },
    { key: "startWeekday", label: t("La semana empieza en", "Week starts on"), control: "select", options: WEEKDAY_OPTIONS, scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => ({
    title: uiCalendarTitle(ctx),
    startWeekday: defaultWeekday(ctx.locale),
    events: uiCalendarEvents(ctx, 12),
    mobile: "agenda",
    frame: "card",
  }),
  layout: { owns: ["mobile", "frame"], fit: fitCalendar },
  Component: Calendar,
});
