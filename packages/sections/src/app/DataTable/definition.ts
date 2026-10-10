import { tableData } from "../../content/generators";
import { t } from "../../content/t";
import { defineSection } from "../../defineSection";
import { appStrings } from "../content";
import { DataTable } from "./DataTable";
import { dataTableSchema, type DataTableProps } from "./schema";

const ROWS = 12;

export const dataTableSection = defineSection<DataTableProps>({
  type: "app.dataTable",
  kind: "app",
  label: t("Tabla", "Table"),
  description: t("La lista principal del producto con estados y paginación.", "The product's main list, with statuses and pagination."),
  variants: [
    { id: "card", label: t("En tarjeta", "In a card") },
    { id: "plain", label: t("Abierta", "Open") },
  ],
  schema: dataTableSchema,
  knobs: [
    { key: "variant", label: t("Estilo", "Style"), control: "select", scope: "section" },
    { key: "pageSize", label: t("Filas por página", "Rows per page"), control: "slider", min: 3, max: 10, step: 1, scope: "section" },
    { key: "selectable", label: t("Selección de filas", "Row selection"), control: "toggle", scope: "section" },
    { key: "showToolbar", label: t("Filtro y búsqueda", "Filter and search"), control: "toggle", scope: "section" },
    { key: "title", label: t("Título", "Title"), control: "text", scope: "section" },
  ],
  defaultProps: (ctx) => {
    const data = tableData(ctx, ROWS);
    return {
      title: data.title,
      description: appStrings(ctx.locale).tableTotal(data.rows.length),
      columns: data.columns.map(({ key, label, kind, align }) => ({ key, label, kind, align })),
      rows: data.rows.map(({ id, cells }) => ({ id, cells })),
      pageSize: 5,
      selectable: true,
      showToolbar: true,
    };
  },
  layout: {
    owns: ["pageSize"],
    // The chip's rows (3–10, from the height) are the rows per page.
    fit: ({ estimate }) => (estimate?.kind === "count" ? { props: { pageSize: estimate.value } } : {}),
  },
  Component: DataTable,
});
