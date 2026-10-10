import { contentDate, mondayIndex, type Weekday } from "../content";
import type { CalendarEvent } from "./schema";

/** Events by (day, start), stable for equal keys. */
export function sortEvents(events: readonly CalendarEvent[]): CalendarEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.day - b.event.day || a.event.start - b.event.start || a.index - b.index)
    .map(({ event }) => event);
}

/** Column of a date in a week that starts on `start` (0–6). */
export const columnOf = (date: Date, start: Weekday): number => (start === "monday" ? mondayIndex(date) : date.getUTCDay());

/** `weekdayLabel` index (0 = Monday) of the column `i` of a week that starts on `start`. */
export const weekdayIndexOf = (i: number, start: Weekday): number => (start === "monday" ? i : (i + 6) % 7);

/** Day offsets (from «today») of the 7 days of the week that holds «today». */
export function weekOffsets(start: Weekday): number[] {
  const first = -columnOf(contentDate(0), start);
  return Array.from({ length: 7 }, (_, i) => first + i);
}

export interface MonthCell {
  /** Day of the month, or `null` for the blanks before the 1st and after the last day. */
  date: number | null;
  /** Day offset from «today» (only for real days). */
  day: number;
}

/** Weeks of the month of «today», as rows of 7 cells. */
export function monthWeeks(start: Weekday): MonthCell[][] {
  const today = contentDate(0);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = columnOf(first, start);
  const total = Math.ceil((lead + length) / 7) * 7;
  const cells: MonthCell[] = Array.from({ length: total }, (_, i) => {
    const date = i - lead + 1;
    return date >= 1 && date <= length ? { date, day: date - today.getUTCDate() } : { date: null, day: 0 };
  });
  return Array.from({ length: total / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Events grouped by day offset. */
export function eventsByDay(events: readonly CalendarEvent[]): Map<number, CalendarEvent[]> {
  const out = new Map<number, CalendarEvent[]>();
  for (const event of sortEvents(events)) out.set(event.day, [...(out.get(event.day) ?? []), event]);
  return out;
}
