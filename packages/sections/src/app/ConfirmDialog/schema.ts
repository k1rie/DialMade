import { z } from "zod";

export const confirmDialogSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  /** What the action applies to («#10482 · Lucía Herrera · $129»). Empty hides the box. */
  subject: z.string(),
  confirmLabel: z.string(),
  cancelLabel: z.string(),
  destructive: z.boolean(),
});

export type ConfirmDialogProps = z.infer<typeof confirmDialogSchema>;
