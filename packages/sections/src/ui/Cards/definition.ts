import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { countedList } from "../../lib/visible";
import type { KnobOption } from "../../types";
import { UI_CARDS_MAX, uiCardItems } from "../content";
import { Cards } from "./Cards";
import { fitCards } from "./fit";
import { CARD_COLUMNS, cardsSchema, type CardsProps } from "./schema";

const COLUMN_OPTIONS: readonly KnobOption[] = CARD_COLUMNS.map((value) => ({
  value,
  label: value === "auto" ? t("Automáticas", "Automatic") : t(value, value),
}));

export const cardsSection = defineSection<CardsProps>({
  type: "ui.cards",
  kind: "app",
  label: t("Tarjetas", "Cards"),
  description: t("Una rejilla de tarjetas con icono, título y dato.", "A grid of cards with icon, title and figure."),
  variants: [
    { id: "feature", label: t("Con descripción", "Feature") },
    { id: "compact", label: t("Compactas", "Compact") },
    { id: "stat", label: t("Con cifra", "Stat") },
  ],
  schema: cardsSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "count", label: t("Tarjetas", "Cards"), control: "slider", min: 1, max: UI_CARDS_MAX, step: 1, scope: "section" },
    { key: "columns", label: t("Columnas", "Columns"), control: "select", options: COLUMN_OPTIONS, scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
    { key: "action", label: t("Enlace de cada tarjeta", "Card link"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => ({
    title: "",
    items: uiCardItems(ctx, UI_CARDS_MAX),
    count: 3,
    columns: "auto",
    mobile: "one-column",
    action: "",
    frame: "plain",
  }),
  layout: { owns: ["count", "columns", "mobile", "frame"], fit: fitCards },
  visible: countedList("items"),
  Component: Cards,
});
