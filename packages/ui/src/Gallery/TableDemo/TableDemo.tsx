"use client";

import { Avatar } from "../../Avatar";
import { Badge, type BadgeVariant } from "../../Badge";
import { intlLocale } from "../../lib/format";
import { Table, type TableColumn } from "../../Table";
import { useUiLocale } from "../../UiProvider";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";
import { INVOICES, type Invoice, type InvoiceStatus } from "./invoices";
import "./TableDemo.css";

const STATUS_VARIANT: Record<InvoiceStatus, BadgeVariant> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  draft: "neutral",
};

export function TableDemo() {
  const locale = useUiLocale();
  const copy = useGalleryCopy();
  const t = copy.table;
  const money = new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: t.currency });
  const date = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const columns: TableColumn<Invoice>[] = [
    { key: "id", header: t.invoice, rowHeader: true, cell: (row) => <span className="dl-gallery-mono">{row.id}</span> },
    {
      key: "customer",
      header: t.customer,
      cell: (row) => (
        <span className="dl-gallery-customer">
          <Avatar name={row.customer} size="xs" aria-hidden="true" />
          {row.customer}
        </span>
      ),
    },
    {
      key: "status",
      header: t.status,
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status]} dot>
          {t.statuses[row.status]}
        </Badge>
      ),
    },
    { key: "date", header: t.date, cell: (row) => date.format(new Date(`${row.date}T00:00:00Z`)) },
    { key: "amount", header: t.amount, align: "end", cell: (row) => money.format(row.amount) },
  ];
  return (
    <GalleryDemo label={copy.sections.table.title} span="full" bare>
      <Table caption={t.caption} columns={columns} rows={INVOICES} getRowKey={(row) => row.id} pageSize={5} />
    </GalleryDemo>
  );
}
