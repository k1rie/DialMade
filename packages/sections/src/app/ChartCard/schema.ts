import { z } from "zod";

export const VALUE_FORMATS = ["number", "decimal", "compact", "currency", "percent", "duration", "ms"] as const;

export const chartCardSchema = z.strictObject({
  title: z.string(),
  rangeLabel: z.string(),
  categoryLabel: z.string(),
  categories: z.array(z.string()).min(1).max(24),
  series: z
    .array(z.strictObject({ name: z.string(), values: z.array(z.number()).max(24) }))
    .min(1)
    .max(3),
  format: z.enum(VALUE_FORMATS),
  totalLabel: z.string(),
  showSummary: z.boolean(),
  showLegend: z.boolean(),
});

export type ChartCardProps = z.infer<typeof chartCardSchema>;
