import { z } from "zod";
import { sectionLevelSchema } from "../lib/heading";
import { iconSchema } from "../../app/content";
import { UI_CARDS_MAX } from "../content";
import { UI_FRAMES } from "../lib/fit";

export const CARD_COLUMNS = ["auto", "1", "2", "3", "4", "5", "6"] as const;
export const CARDS_MOBILE = ["one-column", "carousel"] as const;

export const cardItemSchema = z.strictObject({
  icon: iconSchema,
  title: z.string(),
  description: z.string(),
  meta: z.string(),
});

export type CardItem = z.infer<typeof cardItemSchema>;

export const cardsSchema = z.strictObject({
  title: z.string(),
  /** Stored at the maximum: `count` alone decides how many show, so resizing never loses edited cards. */
  items: z.array(cardItemSchema).min(1).max(UI_CARDS_MAX),
  count: z.number().int().min(1).max(UI_CARDS_MAX),
  columns: z.enum(CARD_COLUMNS),
  /** Below the layout's mobile breakpoint (`@container dl-layout (width < 40rem)`). */
  mobile: z.enum(CARDS_MOBILE),
  /** Link label at the end of each card; empty hides it. */
  action: z.string(),
  frame: z.enum(UI_FRAMES),
  /** Heading level of the title (`sectionLevelSchema`): absent is h2. */
  level: sectionLevelSchema,
});

export type CardsProps = z.infer<typeof cardsSchema>;
