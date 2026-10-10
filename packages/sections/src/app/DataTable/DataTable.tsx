"use client";

import { Button, Checkbox, IconButton, Input, Table, VisuallyHidden, type TableColumn } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { appStrings } from "../content";
import { WidgetHeader } from "../WidgetHeader";
import { DataTableCell } from "./DataTableCell";
import type { DataTableProps, DataTableRow } from "./schema";
import "./DataTable.css";

/** The profile's main list (orders, deployments, appointments…) with status badges and pagination. */
export function DataTable({
  title,
  description,
  columns,
  rows,
  pageSize,
  selectable,
  showToolbar,
  variant,
  ctx,
  elementId,
}: SectionComponentProps<DataTableProps>) {
  const strings = appStrings(ctx.locale);
  const titleId = `${elementId}-title`;
  const firstKey = columns[0]?.key ?? "";
  const rowName = (row: DataTableRow) => row.cells[firstKey]?.text ?? row.id;

  const tableColumns: TableColumn<DataTableRow>[] = [
    ...(selectable
      ? [
          {
            key: "__select",
            header: <Checkbox aria-label={strings.selectAll} />,
            cell: (row: DataTableRow) => <Checkbox aria-label={strings.selectRow(rowName(row))} />,
            width: "2.75rem",
          },
        ]
      : []),
    ...columns.map(
      (column, index): TableColumn<DataTableRow> => ({
        key: column.key,
        header: column.label,
        align: column.align,
        rowHeader: index === 0,
        cell: (row) => <DataTableCell column={column} cell={row.cells[column.key]} rowName={rowName(row)} />,
      }),
    ),
    {
      key: "__actions",
      header: <VisuallyHidden>{strings.moreOptions}</VisuallyHidden>,
      align: "end",
      width: "3.25rem",
      cell: (row) => <IconButton icon="more" size="sm" label={strings.rowActions(rowName(row))} />,
    },
  ];

  return (
    <section className="dl-app-table" data-variant={variant} aria-labelledby={titleId}>
      <div className="dl-app-table__header">
        <WidgetHeader
          id={titleId}
          title={title}
          description={description}
          actions={
            showToolbar ? (
              <>
                <Input
                  type="search"
                  size="sm"
                  hideLabel
                  label={strings.filterRows}
                  placeholder={strings.filterRows}
                  iconStart="search"
                  fieldClassName="dl-app-table__filter"
                />
                <Button variant="outline" size="sm" iconStart="filter">
                  {strings.filters}
                </Button>
              </>
            ) : null
          }
        />
      </div>
      <Table
        className="dl-app-table__table"
        caption={title}
        hideCaption
        columns={tableColumns}
        rows={rows}
        getRowKey={(row) => row.id}
        pageSize={pageSize}
      />
    </section>
  );
}
