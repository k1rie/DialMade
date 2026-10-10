// ui.calendar (`Calendar`): the month of the content's fixed «today» as a table (chips, or numbers and dots in the
// mini view), its week as day columns with events placed by time, or the agenda of upcoming days. The date model
// repeats `Calendar/model.ts` and `ui/content/calendar.ts` of @dialmade/sections (not exported).
import type { Locale } from "@dialmade/catalog";
import { CONTENT_TODAY, clockTime, monthLabel, weekdayLabel } from "@dialmade/sections";
import type { BuildContext, SectionBuilder } from "../../context";
import { column, divider, dot, frame, grid, num, records, row, str, text } from "../../nodes";
import type { DesignNode, FrameNode } from "../../types";
import { blockGeometry, ellipsis, fontPx, innerWidth, toneColor, uiBlock, uiFrameOf, uiHead, uiStrings, type BlockGeometry } from "./shared";

type Weekday = "monday" | "sunday";

interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  start: number;
  duration: number;
  tone: string;
}

/** First and last hour of the week view. */
const WEEK_HOURS = { from: 8, to: 19 } as const;

const contentDate = (day: number) => new Date(Date.UTC(CONTENT_TODAY.year, CONTENT_TODAY.month, CONTENT_TODAY.day + day));
const mondayIndex = (date: Date) => (date.getUTCDay() + 6) % 7;
const columnOf = (date: Date, start: Weekday) => (start === "monday" ? mondayIndex(date) : date.getUTCDay());
const weekdayIndexOf = (i: number, start: Weekday) => (start === "monday" ? i : (i + 6) % 7);

function sortEvents(events: readonly CalendarEvent[]): CalendarEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.day - b.event.day || a.event.start - b.event.start || a.index - b.index)
    .map(({ event }) => event);
}

function eventsByDay(events: readonly CalendarEvent[]): Map<number, CalendarEvent[]> {
  const out = new Map<number, CalendarEvent[]>();
  for (const event of sortEvents(events)) out.set(event.day, [...(out.get(event.day) ?? []), event]);
  return out;
}

function weekOffsets(start: Weekday): number[] {
  const first = -columnOf(contentDate(0), start);
  return Array.from({ length: 7 }, (_, i) => first + i);
}

function monthWeeks(start: Weekday): { date: number | null; day: number }[][] {
  const today = contentDate(0);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = columnOf(new Date(Date.UTC(year, month, 1)), start);
  const total = Math.ceil((lead + length) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => {
    const date = i - lead + 1;
    return date >= 1 && date <= length ? { date, day: date - today.getUTCDate() } : { date: null, day: 0 };
  });
  return Array.from({ length: total / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

function monthTitle(locale: Locale): string {
  const label = new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { month: "long", timeZone: "UTC" }).format(contentDate(0));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${CONTENT_TODAY.year}`;
}

function dayLabel(day: number, locale: Locale): string {
  const strings = uiStrings(locale);
  if (day === 0) return strings.today;
  if (day === 1) return strings.tomorrow;
  const date = contentDate(day);
  const weekday = weekdayLabel(mondayIndex(date), locale);
  const month = monthLabel(date.getUTCMonth(), locale);
  return locale === "es" ? `${weekday} ${date.getUTCDate()} ${month.toLowerCase()}` : `${weekday} ${month} ${date.getUTCDate()}`;
}

const eventRange = (event: CalendarEvent, locale: Locale) => `${clockTime(event.start, locale)}–${clockTime(event.start + event.duration, locale)}`;

function eventsOf(value: unknown): CalendarEvent[] {
  return records(value).map((event, i) => ({
    id: str(event.id) || `event-${i + 1}`,
    title: str(event.title),
    day: num(event.day, 0),
    start: num(event.start, 9 * 60),
    duration: num(event.duration, 60),
    tone: str(event.tone),
  }));
}

/** A date number in its circle (`dl-ui-calendar__date`); today on primary. */
function dateBadge(value: number, today: boolean, size: number, options: { underline?: boolean; style?: "caption" | "small" } = {}): FrameNode {
  return row(
    {
      name: today ? "Today" : "Date",
      width: "hug",
      height: size,
      minHeight: size,
      align: "center",
      justify: "center",
      padding: { x: { px: 4 } },
      radius: "full",
      ...(today && { fill: { color: "primary" } }),
      ...(options.underline && !today && { stroke: { color: "primary", width: 2, sides: ["bottom"] } }),
    },
    [
      text(value, today ? "caption-strong" : (options.style ?? "caption"), {
        color: today ? "primary-foreground" : "foreground",
        tag: "span",
        ...(!today && options.style !== "small" && { weight: 500 }),
      }),
    ],
  );
}

/* ── Month and mini ─────────────────────────────────────────────────────── */

function month(events: CalendarEvent[], start: Weekday, locale: Locale, build: BuildContext, width: number | null, cellHeight: number, compact: boolean): FrameNode {
  const byDay = eventsByDay(events);
  const strings = uiStrings(locale);
  // `@container dl-ui-calendar (width < 30rem)`: numbers only, busy days underlined.
  const tight = !compact && width !== null && width < 480;
  const chips = compact || tight ? 0 : 2;
  const cellW = width === null ? null : width / 7 - 8;
  const caption = fontPx(build, "caption");
  const weekdays = grid({ name: "Weekdays", columns: 7, gap: 0 }, Array.from({ length: 7 }, (_, i) =>
    text(weekdayLabel(weekdayIndexOf(i, start), locale), "caption-strong", {
      color: "muted-foreground",
      tag: "th",
      align: compact ? "center" : "start",
    }),
  ));
  const weeks = monthWeeks(start).map((week, w) =>
    grid(
      { name: `Week ${w + 1}`, columns: 7, gap: 0 },
      week.map((cell): FrameNode => {
        const borders = compact ? {} : { stroke: { color: "border", sides: ["right", "bottom"] as const } };
        if (cell.date === null) {
          return frame({
            name: "Outside",
            height: compact ? 26 : cellHeight,
            ...borders,
            ...(!compact && { fill: { color: "muted", opacity: 0.45 } }),
          });
        }
        const dayEvents = byDay.get(cell.day) ?? [];
        const today = cell.day === 0;
        if (compact) {
          return column({ name: "Day", align: "center", gap: { px: 1 }, padding: { top: { px: 2 }, bottom: { px: 2 } } }, [
            dateBadge(cell.date, today, 22),
            dayEvents.length > 0 ? dot("Has events", 4, "primary") : frame({ name: "No events", width: 4, height: 4 }),
          ]);
        }
        const chipNodes: DesignNode[] = dayEvents.slice(0, chips).map((event) => {
          const time = clockTime(event.start, locale);
          return row(
            {
              name: "Chip",
              tag: "li",
              width: "fill",
              gap: 1,
              align: "center",
              padding: { x: { px: 6 }, y: { px: 1 } },
              radius: "sm",
              fill: { color: toneColor(event.tone), opacity: 0.14 },
            },
            [
              text(time, "caption-strong", { tag: "span" }),
              text(ellipsis(event.title, cellW === null ? null : cellW - 12 - time.length * caption * 0.6, caption), "caption", { tag: "span", width: "fill" }),
            ],
          );
        });
        if (chips > 0 && dayEvents.length > chips) {
          chipNodes.push(text(strings.moreEvents(dayEvents.length - chips), "caption", { color: "muted-foreground", tag: "span" })!);
        }
        return column(
          {
            name: today ? "Today" : "Day",
            tag: "li",
            height: cellHeight,
            gap: { px: 2 },
            padding: 1,
            align: "start",
            ...borders,
          },
          [
            dateBadge(cell.date, today, 26, { underline: tight && dayEvents.length > 0 }),
            chipNodes.length > 0 ? column({ name: "Chips", tag: "ul", width: "fill", gap: { px: 2 } }, chipNodes) : null,
          ],
        );
      }),
    ),
  );
  return column({ name: compact ? "Mini month" : "Month", tag: "table", width: "fill", gap: compact ? 1 : 2 }, [
    weekdays,
    column({ name: "Weeks", width: "fill", ...(!compact && { stroke: { color: "border", sides: ["top", "left"] } }) }, weeks),
  ]);
}

/* ── Week ───────────────────────────────────────────────────────────────── */

function week(events: CalendarEvent[], start: Weekday, locale: Locale, width: number | null, bodyHeight: number): FrameNode {
  const offsets = weekOffsets(start);
  const byDay = eventsByDay(events);
  const todayIndex = offsets.indexOf(0);
  const nearFrom = Math.min(Math.max(todayIndex, 0), 4);
  // `@container dl-ui-calendar (width < 34rem)`: three days from «today» and a narrower hour column.
  const narrow = width !== null && width < 544;
  const shown = offsets.map((day, i) => ({ day, i })).filter(({ i }) => !narrow || (i >= nearFrom && i <= nearFrom + 2));
  const hourW = narrow ? 48 : 56;
  const hours = Array.from({ length: WEEK_HOURS.to - WEEK_HOURS.from }, (_, i) => WEEK_HOURS.from + i);
  const slot = bodyHeight / hours.length;
  const range = (WEEK_HOURS.to - WEEK_HOURS.from) * 60;
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

  const head = row({ name: "Week head", width: "fill", padding: { bottom: 2 }, stroke: { color: "border", sides: ["bottom"] } }, [
    frame({ name: "Corner", width: hourW, height: 1 }),
    ...shown.map(({ day, i }) =>
      column({ name: day === 0 ? "Today" : "Day", width: "fill", align: "center", gap: { px: 2 } }, [
        text(weekdayLabel(weekdayIndexOf(i, start), locale), "caption-strong", { color: day === 0 ? "primary-text" : "muted-foreground", width: "hug" }),
        dateBadge(contentDate(day).getUTCDate(), day === 0, 28, { style: "small" }),
      ]),
    ),
  ]);

  const hourColumn = column(
    { name: "Hours", tag: "ol", width: hourW, height: bodyHeight },
    hours.map((hour) =>
      column({ name: "Hour", height: Math.round(slot), padding: { top: { px: 2 } } }, [text(clockTime(hour * 60, locale), "caption", { color: "muted-foreground" })]),
    ),
  );

  const days = shown.map(({ day }) => {
    const dayEvents = byDay.get(day) ?? [];
    const lines = hours.map((_, h) =>
      frame({ name: "Hour line", width: "fill", height: Math.round(slot), ...(h > 0 && { stroke: { color: "border", sides: ["top"] as const } }) }),
    );
    const placed = dayEvents.map((event) => {
      const top = clamp01((event.start - WEEK_HOURS.from * 60) / range);
      const end = clamp01((event.start + event.duration - WEEK_HOURS.from * 60) / range);
      const height = Math.max(24, Math.round(Math.max(end - top, 0.04) * bodyHeight));
      const tone = toneColor(event.tone);
      return column(
        {
          name: "Event",
          tag: "li",
          absolute: { left: 0.03, top: Math.round(top * bodyHeight), width: 0.94 },
          height,
          clip: true,
          padding: { x: { px: 6 }, y: { px: 2 } },
          radius: "sm",
          fill: { color: tone, opacity: 0.14 },
          stroke: { color: tone, width: 3, sides: ["left"] },
        },
        [text(event.title, "caption-strong", { tag: "span" }), text(eventRange(event, locale), "caption", { color: "muted-foreground", tag: "span" })],
      );
    });
    return column(
      {
        name: day === 0 ? "Today" : "Day",
        width: "fill",
        height: bodyHeight,
        stroke: { color: "border", sides: ["left"] },
        ...(day === 0 && { fill: { color: "primary", opacity: 0.05 } }),
      },
      [...lines, ...placed],
    );
  });

  return column({ name: "Week", width: "fill" }, [head, row({ name: "Week body", width: "fill", align: "stretch" }, [hourColumn, ...days])]);
}

/* ── Agenda ─────────────────────────────────────────────────────────────── */

function agenda(events: CalendarEvent[], locale: Locale, limit = 8): FrameNode {
  const upcoming = sortEvents(events)
    .filter((event) => event.day >= 0)
    .slice(0, limit);
  if (upcoming.length === 0) return column({ name: "Agenda", width: "fill" }, [text(uiStrings(locale).noEvents, "small", { color: "muted-foreground" })]);
  const days: { day: number; events: CalendarEvent[] }[] = [];
  for (const event of upcoming) {
    const last = days[days.length - 1];
    if (last && last.day === event.day) last.events.push(event);
    else days.push({ day: event.day, events: [event] });
  }
  return column(
    { name: "Agenda", tag: "ol", width: "fill", gap: 4 },
    days.map(({ day, events: dayEvents }) =>
      column({ name: dayLabel(day, locale), tag: "li", width: "fill", gap: 2 }, [
        text(dayLabel(day, locale), "overline", { color: day === 0 ? "primary-text" : "muted-foreground", tag: "h3" }),
        column(
          { name: "Events", tag: "ul", width: "fill", gap: 2 },
          dayEvents.map((event) => {
            const tone = toneColor(event.tone);
            return row(
              {
                name: "Event",
                tag: "li",
                width: "fill",
                align: "center",
                gap: 3,
                padding: { x: 3, y: 2 },
                radius: "sm",
                fill: { color: tone, opacity: 0.08 },
                stroke: { color: tone, width: 3, sides: ["left"] },
              },
              [text(eventRange(event, locale), "caption", { color: "muted-foreground", tag: "span" }), text(event.title, "small", { tag: "span", width: "fill", weight: 500 })],
            );
          }),
        ),
      ]),
    ),
  );
}

/** Room the view gets inside an app block of a drawn height (the month and week fill it). */
function viewHeight(geometry: BlockGeometry | null, framePad: number, title: boolean): number | null {
  if (geometry?.kind !== "app" || geometry.heightPx === null) return null;
  return geometry.heightPx - framePad - (title ? 44 : 22) - 16;
}

export const calendarBuilder: SectionBuilder = ({ id, props, variant, ctx, build }) => {
  const { locale } = ctx;
  const frameKind = uiFrameOf(props.frame);
  const geometry = blockGeometry(ctx, id);
  const width = innerWidth(geometry, frameKind, build);
  const start: Weekday = props.startWeekday === "sunday" ? "sunday" : "monday";
  const events = eventsOf(props.events);
  const title = str(props.title);
  const room = viewHeight(geometry, frameKind === "card" ? 2 * build.light.space[4]! : 0, title !== "");

  let view: FrameNode;
  if (variant === "week") {
    view = week(events, start, locale, width, Math.max(256, (room ?? 400) - 56));
  } else if (variant === "agenda") {
    view = agenda(events, locale);
  } else {
    const compact = variant === "mini";
    const weeks = monthWeeks(start).length;
    const tight = !compact && width !== null && width < 480;
    const base = tight ? 44 : 80;
    const cellHeight = room === null || compact ? base : Math.max(base, Math.floor((room - 28) / weeks));
    view = month(events, start, locale, build, width, cellHeight, compact);
  }

  const next = variant === "mini" ? sortEvents(events).find((event) => event.day >= 0) : undefined;
  const nextLine = next
    ? column({ name: "Next", width: "fill", gap: 3 }, [
        divider(),
        frame({
          name: "Next event",
          width: "fill",
          layout: { kind: "flex", direction: "row", gap: 2, crossGap: 1, align: "center", wrap: true },
          children: [
            text(uiStrings(locale).nextEvent, "overline", { color: "primary-text", tag: "span" }),
            text(eventRange(next, locale), "caption", { color: "muted-foreground", tag: "span" }),
            text(next.title, "small", { tag: "span", weight: 500 }),
          ],
        }),
      ])
    : null;

  return uiBlock("Calendar", frameKind, [
    uiHead(build, { title, level: props.level, subtitle: monthTitle(locale) }),
    column({ name: "View", width: "fill", gap: 3 }, [view, nextLine]),
  ]);
};
