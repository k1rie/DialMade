import { PEOPLE } from "../AvatarsDemo";

export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

export interface Invoice {
  id: string;
  customer: string;
  status: InvoiceStatus;
  /** ISO, sin hora: se formatea según el idioma. */
  date: string;
  amount: number;
}

const STATUSES: InvoiceStatus[] = ["paid", "pending", "paid", "overdue", "paid", "draft"];

/** 12 facturas deterministas con clientes ficticios. */
export const INVOICES: Invoice[] = Array.from({ length: 12 }, (_, index) => ({
  id: `INV-${String(2041 - index).padStart(4, "0")}`,
  customer: PEOPLE[index % PEOPLE.length] ?? "",
  status: STATUSES[index % STATUSES.length] ?? "paid",
  date: `2026-09-${String(28 - index * 2).padStart(2, "0")}`,
  amount: Math.round((420 + ((index * 7919) % 2600) + index * 13.5) * 100) / 100,
}));
