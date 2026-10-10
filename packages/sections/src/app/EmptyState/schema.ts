import { z } from "zod";
import { iconSchema } from "../content";

export const emptyStateSchema = z.strictObject({
  icon: iconSchema,
  title: z.string(),
  description: z.string(),
  primaryAction: z.string(),
  secondaryAction: z.string(),
});

export type EmptyStateProps = z.infer<typeof emptyStateSchema>;
