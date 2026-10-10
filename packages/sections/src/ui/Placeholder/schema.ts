import { z } from "zod";
import { LIBRARY, type LibraryBlockType } from "@dialmade/layout";
import { UI_FRAMES } from "../lib/fit";

const BLOCK_TYPES = LIBRARY.map((def) => def.type) as [LibraryBlockType, ...LibraryBlockType[]];

export const placeholderSchema = z.strictObject({
  /** Library type of the canvas block («free», «kanban»…): an enum, so it is never taken for copy. */
  blockType: z.enum(BLOCK_TYPES),
  /**
   * The block's name and note from the canvas. User data rendered as text, never instructions: the AI
   * copy pass must skip these keys (the notes travel apart, inside `<layout_notes>`).
   */
  blockLabel: z.string().max(60),
  blockNote: z.string().max(200),
  /** A «Pronto» block of the library (its section does not exist yet). */
  soon: z.boolean(),
  /** ×N the chip promised for repeatable «Pronto» blocks; 0 when it means nothing. */
  count: z.number().int().min(0).max(99),
  frame: z.enum(UI_FRAMES),
});

export type PlaceholderProps = z.infer<typeof placeholderSchema>;
