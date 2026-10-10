import { z } from "zod";
import { iconSchema } from "../content";

export const kpiItemSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string(),
  value: z.string(),
  /** Change vs. the previous period, in %. */
  delta: z.number(),
  invert: z.boolean(),
  icon: iconSchema.optional(),
  trend: z.array(z.number()).max(32),
});

export type KpiItem = z.infer<typeof kpiItemSchema>;

export const kpiRowSchema = z.strictObject({
  items: z.array(kpiItemSchema).min(1).max(6),
  count: z.number().int().min(1).max(6),
  comparison: z.string(),
  showTrend: z.boolean(),
});

export type KpiRowProps = z.infer<typeof kpiRowSchema>;
