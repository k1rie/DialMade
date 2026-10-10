import { z } from "zod";
import { iconSchema, toneSchema } from "../content";

export const activityItemSchema = z.strictObject({
  id: z.string().min(1),
  actor: z.string(),
  text: z.string(),
  time: z.string(),
  tone: toneSchema,
  icon: iconSchema.optional(),
});

export type ActivityEntry = z.infer<typeof activityItemSchema>;

export const activitySchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  items: z.array(activityItemSchema).min(1).max(8),
  count: z.number().int().min(1).max(8),
  showViewAll: z.boolean(),
});

export type ActivityProps = z.infer<typeof activitySchema>;
