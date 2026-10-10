import { z } from "zod";
import { MEDIA_RATIO_IDS, UI_FRAMES } from "../lib/fit";

export const mediaSchema = z.strictObject({
  /** Layout-owned: one of the canvas ratios (`MEDIA_RATIOS` of @dialmade/layout). */
  ratio: z.enum(MEDIA_RATIO_IDS),
  caption: z.string(),
  /** Accessible name of the artwork; empty makes it decorative. */
  alt: z.string(),
  frame: z.enum(UI_FRAMES),
});

export type MediaProps = z.infer<typeof mediaSchema>;
