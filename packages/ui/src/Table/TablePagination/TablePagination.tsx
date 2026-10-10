"use client";

import { Button } from "../../Button";
import { cx } from "../../lib/cx";
import { useUiStrings } from "../../UiProvider";
import "./TablePagination.css";

export interface TablePaginationProps {
  /** Página actual, empezando en 1. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({ page, pageSize, total, onPageChange, className }: TablePaginationProps) {
  const strings = useUiStrings();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className={cx("dl-table-pagination", className)} aria-label={strings.pagination}>
      <p className="dl-table-pagination__range" aria-live="polite">
        {strings.rowsRange(from, to, total)}
      </p>
      <div className="dl-table-pagination__controls">
        <Button
          variant="outline"
          size="sm"
          iconStart="chevron-left"
          aria-label={strings.previousPage}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {strings.previous}
        </Button>
        <span className="dl-table-pagination__page">{strings.pageOf(page, pageCount)}</span>
        <Button
          variant="outline"
          size="sm"
          iconEnd="chevron-right"
          aria-label={strings.nextPage}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {strings.next}
        </Button>
      </div>
    </nav>
  );
}
