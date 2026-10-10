// app.dataTable: the profile's main list as a real table: widget header with filter and «Filtros», a header row
// and the first page of rows (checkbox, cells drawn by column kind, row menu), then the pagination. Columns
// get px widths from their content (like an auto table) and the last data column absorbs the rest.
import { UI_STRINGS } from "@dialmade/ui";
import type { BuildContext, SectionBuilder } from "../../context";
import { button, column, num, records, row, str, text } from "../../nodes";
import type { DesignNode, FrameNode, Size } from "../../types";
import { appStrings, avatar, checkbox, control, elementWidth, iconButton, kitBadge, progressBar, widgetHeader, type KitBadgeVariant } from "./shared";

type Column = { key: string; label: string; kind: string; align: "start" | "end" };
type Cell = { text: string; value?: number; tone?: string };
type Row = { id: string; cells: Record<string, Cell> };

const columnsOf = (value: unknown): Column[] =>
  records(value).map((item) => ({ key: str(item.key), label: str(item.label), kind: str(item.kind), align: item.align === "end" ? "end" : "start" }));

const rowsOf = (value: unknown): Row[] =>
  records(value).map((item, i) => ({ id: str(item.id) || `row-${i}`, cells: (item.cells ?? {}) as Record<string, Cell> }));

/** Px a cell's content needs (≈7.2 px per glyph at the table's 14 px, plus avatars, badges and bars). */
function contentWidth(column: Column, cell: Cell | undefined): number {
  const glyphs = (cell?.text ?? "—").length * 7.2;
  switch (column.kind) {
    case "status":
      return glyphs * 0.9 + 30;
    case "person":
    case "company":
      return glyphs + 32;
    case "percent":
      return column.key === "progress" ? 144 + glyphs : glyphs;
    default:
      return glyphs;
  }
}

const CELL_PAD = 16;
/** Checkbox and row-menu columns: their content plus the cell padding (a table cell grows to its content). */
const SELECT_W = 18 + 2 * CELL_PAD;
const ACTIONS_W = 32 + 2 * CELL_PAD;

/** Column widths like an auto table: content width plus padding, the spare room shared by content. */
function columnWidths(columns: Column[], rows: Row[], available: number): number[] {
  const need = columns.map((column) =>
    Math.max(column.label.length * 6.6 + 2 * CELL_PAD, ...rows.map((r) => contentWidth(column, r.cells[column.key]) + 2 * CELL_PAD)),
  );
  const total = need.reduce((sum, value) => sum + value, 0);
  const spare = Math.max(0, available - total);
  return need.map((value) => Math.round(value + (spare * value) / (total || 1)));
}

function statusVariant(tone: string | undefined): KitBadgeVariant {
  return tone === "success" || tone === "warning" || tone === "info" || tone === "destructive" ? tone : "neutral";
}

/** `DataTableCell`: what each column kind draws. */
function cellContent(build: BuildContext, column: Column, cell: Cell | undefined, rowHeader: boolean): DesignNode | null {
  if (!cell) return text("—", "small", { color: "muted-foreground", tag: "span" });
  // `tbody th` (the row's first cell) is 550; entity names are 500.
  const weight = rowHeader ? { weight: 550 } : {};
  switch (column.kind) {
    case "status":
      return kitBadge(cell.text, statusVariant(cell.tone), { dot: true });
    case "person":
    case "company":
      return row({ name: "Entity", align: "center", gap: 2 }, [avatar(build, cell.text, "xs", column.kind === "company"), text(cell.text, "small", { color: "card-foreground", tag: "span", weight: rowHeader ? 550 : 500 })]);
    case "id":
      return text(cell.text, "mono", { color: "card-foreground", tag: "code", scale: 0.92, ...weight });
    case "percent":
      return cell.value !== undefined && column.key === "progress"
        ? row({ name: "Progress cell", width: "fill", align: "center", gap: 2 }, [progressBar(cell.value), text(cell.text, "small", { tag: "span" })])
        : text(cell.text, "small", { color: "card-foreground", tag: "span", ...weight });
    case "date":
    case "relative":
    case "time":
      return text(cell.text, "small", { color: "muted-foreground", tag: "span" });
    default:
      return text(cell.text, "small", { color: "card-foreground", tag: "span", ...weight });
  }
}

/** A `th`/`td`: fixed width (or the rest), the table's row height, content aligned like the column. */
function tableCell(name: string, width: Size, height: number, align: "start" | "end", content: DesignNode | null, padding: { left: number; right: number }): FrameNode {
  return row(
    { name, width, height, align: "center", justify: align === "end" ? "end" : "start", padding: { left: { px: padding.left }, right: { px: padding.right } } },
    [content],
  );
}

export const dataTableBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const strings = appStrings(ctx.locale);
  const ui = UI_STRINGS[ctx.locale];
  const inCard = variant !== "plain";
  const columns = columnsOf(props.columns);
  const allRows = rowsOf(props.rows);
  const pageSize = Math.max(1, num(props.pageSize, 5));
  const rows = allRows.slice(0, pageSize);
  const selectable = props.selectable === true;
  const rowH = build.light.components.table.rowH;
  const cardPad = build.light.components.card.padding.px;
  const width = elementWidth(build, id, "app.dataTable") - 2;
  const widths = columnWidths(columns, rows, width - (selectable ? SELECT_W : 0) - ACTIONS_W);

  // `.dl-app-table[data-variant="card"]`: first and last cells line up with the card padding.
  const edge = { first: inCard ? cardPad : CELL_PAD, last: inCard ? cardPad - 8 : CELL_PAD };
  const cells = (kind: "head" | "body", r: Row | null): FrameNode[] => {
    const height = kind === "head" ? Math.round(rowH * 0.8) : rowH;
    const out: FrameNode[] = [];
    const leftPad = (index: number) => (index === 0 ? edge.first : CELL_PAD);
    let index = 0;
    if (selectable) {
      out.push(tableCell("Select", SELECT_W + (leftPad(0) - CELL_PAD), height, "start", checkbox(false), { left: leftPad(0), right: CELL_PAD }));
      index++;
    }
    columns.forEach((column, c) => {
      const last = c === columns.length - 1;
      const pad = { left: leftPad(index), right: CELL_PAD };
      const content =
        kind === "head"
          ? text(column.label, "caption-strong", { color: "muted-foreground", tag: "th" })
          : cellContent(build, column, r!.cells[column.key], c === 0);
      out.push(tableCell(kind === "head" ? `th/${column.key}` : `td/${column.key}`, last ? "fill" : widths[c]! + (index === 0 ? edge.first - CELL_PAD : 0), height, column.align, content, pad));
      index++;
    });
    out.push(
      tableCell("Row actions", ACTIONS_W + (edge.last - CELL_PAD), height, "end", kind === "head" ? null : iconButton("More options", "more", "foreground"), {
        left: CELL_PAD,
        right: edge.last,
      }),
    );
    return out;
  };

  const headRow = row({ name: "tr/head", width: "fill", align: "center", fill: { color: "muted" }, stroke: { color: "border", sides: ["bottom"] } }, cells("head", null));
  const bodyRows = rows.map((r, i) =>
    row(
      { name: `tr/${r.id}`, width: "fill", align: "center", ...(i < rows.length - 1 && { stroke: { color: "border", sides: ["bottom"] } }) },
      cells("body", r),
    ),
  );
  const pageCount = Math.max(1, Math.ceil(allRows.length / pageSize));
  const pagination =
    allRows.length > 0
      ? row(
          { name: "Pagination", tag: "nav", width: "fill", align: "center", justify: "between", gap: 3, padding: { y: 2, x: 4 }, stroke: { color: "border", sides: ["top"] } },
          [
            text(ui.rowsRange(1, Math.min(allRows.length, pageSize), allRows.length), "caption", { color: "muted-foreground", tag: "p" }),
            row({ name: "Controls", align: "center", gap: 2 }, [
              { ...button(ui.previous, { variant: "outline", size: "sm", leadingIcon: "chevron-left" })!, opacity: 0.5 },
              text(ui.pageOf(1, pageCount), "caption", { color: "muted-foreground", align: "center", tag: "span" }),
              { ...button(ui.next, { variant: "outline", size: "sm", icon: "chevron-right" })!, ...(pageCount <= 1 && { opacity: 0.5 }) },
            ]),
          ],
        )
      : null;

  const table = column(
    {
      name: "Table",
      tag: "table",
      width: "fill",
      clip: true,
      ...(inCard
        ? { stroke: { color: "border", sides: ["top"] } }
        : { fill: { color: "card" }, stroke: { color: "border" }, radius: "card" }),
    },
    [headRow, ...bodyRows, pagination],
  );

  const header = widgetHeader(
    build,
    props.title,
    props.description,
    props.showToolbar === true
      ? [
          control({ name: "Filter", size: "sm", width: 224, placeholder: strings.filterRows, leadingIcon: "search" }),
          button(strings.filters, { variant: "outline", size: "sm", leadingIcon: "filter" }),
        ]
      : [],
  );

  if (inCard) {
    return column(
      { name: "Data table", tag: "section", width: "fill", fill: { color: "card" }, stroke: { color: "border", card: true }, radius: "card", shadow: "card", clip: true },
      [column({ name: "Header", width: "fill", padding: { top: 5, x: 5, bottom: 4 } }, [header]), table],
    );
  }
  return column({ name: "Data table", tag: "section", width: "fill", gap: 4 }, [header, table]);
};
