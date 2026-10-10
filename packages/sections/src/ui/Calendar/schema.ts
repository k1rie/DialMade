import { z } from "zod";
import { toneSchema } from "../../app/content";
import { UI_CALENDAR_MAX } from "../content";
import { UI_FRAMES } from "../lib/fit";

export const WEEKDAYS = ["monday", "sunday"] as const;
export const CALENDAR_MOBILE = ["agenda", "keep"] as const;

export const calendarEventSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string(),
  /** Days from the content's «today» (`CONTENT_TODAY`): 0 today, −2 two days ago. */
  day: z.number().int().min(-62).max(62),
  /** Minutes after midnight. */
  start: z.number().int().min(0).max(1439),
  /** Minutes. */
  duration: z.number().int().min(5).max(720),
  tone: toneSchema,
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const calendarSchema = z.strictObject({
  title: z.string(),
  startWeekday: z.enum(WEEKDAYS),
  events: z.array(calendarEventSchema).max(UI_CALENDAR_MAX),
  /** Below the layout's mobile breakpoint: switch to the agenda (always in the markup) or keep the view. */
  mobile: z.enum(CALENDAR_MOBILE),
  frame: z.enum(UI_FRAMES),
});

export type CalendarProps = z.infer<typeof calendarSchema>;
