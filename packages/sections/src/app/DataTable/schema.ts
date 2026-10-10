import { z } from "zod";
import { toneSchema } from "../content";

export const COLUMN_KINDS = [
  "id",
  "person",
  "company",
  "choice",
  "status",
  "money",
  "number",
  "percent",
  "duration",
  "date",
  "relative",
  "time",
] as const;

export const tableColumnSchema = z.strictObject({
  key: z.string().min(1),
  label: z.string(),
  kind: z.enum(COLUMN_KINDS),
  align: z.enum(["start", "end"]),
});

export const tableCellSchema = z.strictObject({
  text: z.string(),
  value: z.number().optional(),
  tone: toneSchema.optional(),
});

export const tableRowSchema = z.strictObject({
  id: z.string().min(1),
  cells: z.record(z.string(), tableCellSchema),
});

export type DataTableColumn = z.infer<typeof tableColumnSchema>;
export type DataTableCellData = z.infer<typeof tableCellSchema>;
export type DataTableRow = z.infer<typeof tableRowSchema>;

export const dataTableSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  columns: z.array(tableColumnSchema).min(1).max(8),
  rows: z.array(tableRowSchema).max(50),
  pageSize: z.number().int().min(3).max(10),
  selectable: z.boolean(),
  showToolbar: z.boolean(),
});

export type DataTableProps = z.infer<typeof dataTableSchema>;
