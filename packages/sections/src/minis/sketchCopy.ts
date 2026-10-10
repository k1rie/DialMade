import type { LocalizedText } from "@dialmade/catalog";
import { t } from "../content/t";

/**
 * Names of the parts the sketches draw. They say what goes where, never real copy: the sketch must not
 * read as the final design.
 */
export const SKETCH_COPY = {
  tag: t("Esquema", "Sketch"),
  menu: t("Menú", "Menu"),
  headline: t("Titular", "Headline"),
  subtitle: t("Subtítulo, una o dos líneas", "Subtitle, one or two lines"),
  mainAction: t("Acción principal", "Main action"),
  secondary: t("Secundaria", "Secondary"),
  benefit: t("Ventaja", "Benefit"),
  iconAndText: t("Icono y texto", "Icon and text"),
  home: t("Inicio", "Home"),
  section: t("Sección", "Section"),
  title: t("Título", "Title"),
  search: t("Buscador", "Search"),
  metric: t("Indicador", "Metric"),
  chart: t("Gráfica", "Chart"),
  table: t("Tabla", "Table"),
  onLight: t("Logo en claro", "Logo on light"),
  onDark: t("En oscuro", "On dark"),
  onBrand: t("Sobre la marca", "On brand"),
  primary: t("Primario", "Primary"),
  tint: t("Tinte", "Tint"),
  text: t("Texto", "Text"),
  surface: t("Superficie", "Surface"),
  type: t("Títulos y texto", "Headings and body"),
  button: t("Botón", "Button"),
} satisfies Record<string, LocalizedText>;

/** Heights (in %) of the sketch chart: a gentle climb, the last bar in the brand color. */
export const SKETCH_BARS = [42, 58, 50, 72, 64, 86, 78] as const;
