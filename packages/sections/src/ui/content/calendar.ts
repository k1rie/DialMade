import type { LocalizedText, Locale } from "@dialmade/catalog";
import { localize } from "../../content/generators";
import { CONTENT_TODAY, clockTime, monthLabel, weekdayLabel } from "../../content/format";
import { COMPANY_NAMES, personNames } from "../../content/people";
import { contentProfileOf } from "../../content/profiles";
import { rngFor } from "../../content/rng";
import { t } from "../../content/t";
import type { Tone } from "../../content/types";
import type { ContentContext } from "../../types";
import { uiStrings } from "./strings";

export interface UiCalendarEvent {
  id: string;
  title: string;
  /** Days from the content's fixed «today» (`CONTENT_TODAY`): 0 today, 1 tomorrow, −2 two days ago. */
  day: number;
  /** Minutes after midnight. */
  start: number;
  /** Minutes. */
  duration: number;
  tone: Tone;
}

export type Weekday = "monday" | "sunday";

/** Most events a calendar stores. */
export const UI_CALENDAR_MAX = 24;
/** First and last hour of the week view. */
export const WEEK_HOURS = { from: 8, to: 19 } as const;

// Spread over the month of «today» with most of them in its week, so every view has something to show.
const DAY_SLOTS = [0, 1, 1, 2, -2, 3, -1, 4, -6, -9, -13, -16, -20, -23, 6, 8, -27, 10, -4, -11, -18, 13, -25, 15];
const STARTS = [9 * 60, 9 * 60 + 30, 10 * 60, 11 * 60, 12 * 60 + 30, 14 * 60, 15 * 60 + 30, 16 * 60, 17 * 60];
const DURATIONS = [30, 45, 60, 60, 90];
const TONES: readonly Tone[] = ["info", "success", "warning", "neutral", "destructive"];

type Template = { text: LocalizedText; needs: "target" | "person" | "company" };
const TEMPLATES: readonly Template[] = [
  { text: t("Revisión: {x}", "Review: {x}"), needs: "target" },
  { text: t("Reunión con {x}", "Meeting with {x}"), needs: "person" },
  { text: t("Llamada con {x}", "Call with {x}"), needs: "company" },
  { text: t("Entrega de {x}", "Deliver {x}"), needs: "target" },
  { text: t("Demo para {x}", "Demo for {x}"), needs: "company" },
  { text: t("1:1 con {x}", "1:1 with {x}"), needs: "person" },
  { text: t("Planificación semanal", "Weekly planning"), needs: "target" },
];

const firstName = (name: string) => name.split(" ")[0] ?? name;

/** Date of a day offset from `CONTENT_TODAY` (UTC, so it never depends on the clock or the time zone). */
export function contentDate(day: number): Date {
  return new Date(Date.UTC(CONTENT_TODAY.year, CONTENT_TODAY.month, CONTENT_TODAY.day + day));
}

/** 0 = Monday … 6 = Sunday (the index `weekdayLabel` expects). */
export const mondayIndex = (date: Date): number => (date.getUTCDay() + 6) % 7;

/** «Hoy», «Mañana» or «Jue 2 oct» / «Thu Oct 2». */
export function dayLabel(day: number, locale: Locale): string {
  const strings = uiStrings(locale);
  if (day === 0) return strings.today;
  if (day === 1) return strings.tomorrow;
  const date = contentDate(day);
  const weekday = weekdayLabel(mondayIndex(date), locale);
  const month = monthLabel(date.getUTCMonth(), locale);
  return locale === "es" ? `${weekday} ${date.getUTCDate()} ${month.toLowerCase()}` : `${weekday} ${month} ${date.getUTCDate()}`;
}

/** «Septiembre 2026» / «September 2026» for the month of «today». */
export function monthTitle(locale: Locale): string {
  const label = new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { month: "long", timeZone: "UTC" }).format(contentDate(0));
  const month = label.charAt(0).toUpperCase() + label.slice(1);
  return `${month} ${CONTENT_TODAY.year}`;
}

/** «09:00–10:00» / «9:00 AM–10:00 AM». */
export function eventRange(event: Pick<UiCalendarEvent, "start" | "duration">, locale: Locale): string {
  return uiStrings(locale).eventRange(clockTime(event.start, locale), clockTime(event.start + event.duration, locale));
}

/** Title of a calendar block (the profile's own word for it is not in the profiles, so it is generic). */
export function uiCalendarTitle(ctx: ContentContext): string {
  return uiStrings(ctx.locale).calendarTitle;
}

/** First weekday of the locale: Monday in es-MX style calendars, Sunday in en-US ones. */
export const defaultWeekday = (locale: Locale): Weekday => (locale === "es" ? "monday" : "sunday");

/**
 * Up to 24 events around the content's «today», with titles from the profile's activity targets and
 * fictional people and companies. Events of the same day never overlap.
 */
export function uiCalendarEvents(ctx: ContentContext, count = 12): UiCalendarEvent[] {
  const total = Math.max(0, Math.min(UI_CALENDAR_MAX, count));
  const r = rngFor(ctx.seed, `${ctx.productType.id}:ui-calendar`);
  const profile = contentProfileOf(ctx.productType);
  const targets = profile.activity.flatMap((activity) => activity.targets);
  const people = personNames(r, ctx.locale, 8).map(firstName);
  const companies = r.sample(COMPANY_NAMES, 6);
  const busyUntil = new Map<number, number>();
  const events: UiCalendarEvent[] = [];

  for (let i = 0; i < total; i++) {
    const day = DAY_SLOTS[i % DAY_SLOTS.length]!;
    const duration = r.pick(DURATIONS);
    const earliest = busyUntil.get(day) ?? 0;
    const candidates = STARTS.filter((start) => start >= earliest && start + duration <= WEEK_HOURS.to * 60);
    const start = candidates.length > 0 ? r.pick(candidates) : Math.min(WEEK_HOURS.to * 60 - duration, earliest);
    busyUntil.set(day, start + duration + 15);

    const template = TEMPLATES[r.int(0, TEMPLATES.length - 1)]!;
    const fill =
      template.needs === "person"
        ? people[i % people.length]!
        : template.needs === "company"
          ? companies[i % companies.length]!
          : targets.length > 0
            ? localize(r.pick(targets), ctx)
            : ctx.brand.name;
    events.push({
      id: `event-${i + 1}`,
      title: localize(template.text, ctx).replace("{x}", fill),
      day,
      start,
      duration,
      tone: TONES[i % TONES.length]!,
    });
  }
  return events;
}
