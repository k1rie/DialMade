"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "../lib/cx";
import { useUiStrings } from "../UiProvider";
import { VisuallyHidden } from "../VisuallyHidden";
import { TablePagination } from "./TablePagination";
import "./Table.css";

export interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  /** Cómo se pinta la celda. Sin `cell`, se muestra `row[key]`. */
  cell?: (row: Row, index: number) => ReactNode;
  align?: "start" | "center" | "end";
  width?: string;
  /** La celda de esta columna identifica la fila (`<th scope="row">`). */
  rowHeader?: boolean;
}

export interface TableProps<Row> {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  caption: ReactNode;
  /** El caption sigue existiendo para lectores de pantalla, pero no se ve. */
  hideCaption?: boolean;
  getRowKey?: (row: Row, index: number) => string;
  /** Con `pageSize` aparece la paginación. */
  pageSize?: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  density?: "compact" | "normal";
  striped?: boolean;
  empty?: ReactNode;
  className?: string;
}

function defaultCell(row: unknown, key: string): ReactNode {
  if (row && typeof row === "object" && key in row) {
    const value = (row as Record<string, unknown>)[key];
    if (value == null) return null;
    return typeof value === "object" ? (value as ReactNode) : String(value);
  }
  return null;
}

export function Table<Row>({
  columns,
  rows,
  caption,
  hideCaption,
  getRowKey,
  pageSize,
  page,
  defaultPage = 1,
  onPageChange,
  density = "normal",
  striped,
  empty,
  className,
}: TableProps<Row>) {
  const strings = useUiStrings();
  const captionId = useId();
  const [uncontrolledPage, setUncontrolledPage] = useState(defaultPage);
  const currentPage = page ?? uncontrolledPage;
  const visibleRows = pageSize ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : rows;
  const offset = pageSize ? (currentPage - 1) * pageSize : 0;

  const changePage = (next: number) => {
    if (page === undefined) setUncontrolledPage(next);
    onPageChange?.(next);
  };

  return (
    <div className={cx("dl-table-wrap", className)}>
      <div className="dl-table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table className="dl-table" data-density={density} data-striped={striped ? "" : undefined}>
          <caption id={captionId} className={hideCaption ? undefined : "dl-table__caption"}>
            {hideCaption ? <VisuallyHidden>{caption}</VisuallyHidden> : caption}
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" data-align={column.align} style={column.width ? { width: column.width } : undefined}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td className="dl-table__empty" colSpan={columns.length}>
                  {empty ?? strings.noResults}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => (
                <tr key={getRowKey ? getRowKey(row, offset + index) : offset + index}>
                  {columns.map((column) => {
                    const content = column.cell ? column.cell(row, offset + index) : defaultCell(row, column.key);
                    return column.rowHeader ? (
                      <th key={column.key} scope="row" data-align={column.align}>
                        {content}
                      </th>
                    ) : (
                      <td key={column.key} data-align={column.align}>
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageSize != null && rows.length > 0 && (
        <TablePagination page={currentPage} pageSize={pageSize} total={rows.length} onPageChange={changePage} />
      )}
    </div>
  );
}
