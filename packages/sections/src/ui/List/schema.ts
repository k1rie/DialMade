import { z } from "zod";
import { sectionLevelSchema } from "../lib/heading";
import { toneSchema } from "../../app/content";
import { UI_LIST_MAX } from "../content";
import { UI_FRAMES } from "../lib/fit";

export const listItemSchema = z.strictObject({
  id: z.string().min(1),
  primary: z.string(),
  secondary: z.string(),
  meta: z.string(),
  tone: toneSchema,
});

export type ListItem = z.infer<typeof listItemSchema>;

export const listSchema = z.strictObject({
  title: z.string(),
  /** Stored at the maximum: `count` alone decides how many rows show. */
  items: z.array(listItemSchema).min(1).max(UI_LIST_MAX),
  count: z.number().int().min(1).max(UI_LIST_MAX),
  /** Avatars in the simple and divided styles (the avatars style always has them). */
  showAvatars: z.boolean(),
  /** Link label in the header («Ver todo»); empty hides it. */
  action: z.string(),
  frame: z.enum(UI_FRAMES),
  /** Heading level of the title (`sectionLevelSchema`): absent is h2. */
  level: sectionLevelSchema,
});

export type ListProps = z.infer<typeof listSchema>;
