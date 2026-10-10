import { z } from "zod";
import { UI_FRAMES } from "../lib/fit";

export const TEXT_LEVELS = ["h1", "h2", "h3"] as const;
export const TEXT_ALIGNS = ["start", "center"] as const;

export const textSchema = z.strictObject({
  eyebrow: z.string(),
  title: z.string(),
  body: z.string(),
  /** Label of the action link; empty hides it. */
  action: z.string(),
  level: z.enum(TEXT_LEVELS),
  align: z.enum(TEXT_ALIGNS),
  /** Layout-owned: a short block (one line) only fits the heading. */
  showBody: z.boolean(),
  /** Layout-owned: the action shows only when the block is tall enough. */
  showAction: z.boolean(),
  frame: z.enum(UI_FRAMES),
});

export type TextProps = z.infer<typeof textSchema>;
