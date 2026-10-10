import type { CSSProperties } from "react";
import type { Locale } from "@dialmade/catalog";
import { clockTime, weekdayLabel } from "../../../content/format";
import { WEEK_HOURS, contentDate, eventRange, type Weekday } from "../../content";
import { eventsByDay, weekOffsets, weekdayIndexOf } from "../model";
import type { CalendarEvent } from "../schema";

export interface CalendarWeekProps {
  events: readonly CalendarEvent[];
  startWeekday: Weekday;
  locale: Locale;
  /** Prefix of the DOM ids of the day headers. */
  idPrefix: string;
}

const RANGE = (WEEK_HOURS.to - WEEK_HOURS.from) * 60;
const HOURS = Array.from({ length: WEEK_HOURS.to - WEEK_HOURS.from }, (_, i) => WEEK_HOURS.from + i);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Where an event sits in its day column, as fractions of the visible hours. */
function placement(event: CalendarEvent): CSSProperties {
  const top = clamp01((event.start - WEEK_HOURS.from * 60) / RANGE);
  const end = clamp01((event.start + event.duration - WEEK_HOURS.from * 60) / RANGE);
  return { "--_ui-ev-top": top.toFixed(4), "--_ui-ev-size": Math.max(end - top, 0.04).toFixed(4) } as CSSProperties;
}

/**
 * The week of «today»: a column per day with its events placed by time. On narrow blocks only the three
 * days from «today» show (`data-far` days hide).
 */
export function CalendarWeek({ events, startWeekday, locale, idPrefix }: CalendarWeekProps) {
  const offsets = weekOffsets(startWeekday);
  const byDay = eventsByDay(events);
  const todayIndex = offsets.indexOf(0);
  const nearFrom = Math.min(Math.max(todayIndex, 0), 4);
  const far = (i: number) => i < nearFrom || i > nearFrom + 2;
  return (
    <div className="dl-ui-calendar__week">
      <div className="dl-ui-calendar__week-head">
        <span className="dl-ui-calendar__corner" />
        {offsets.map((day, i) => (
          <p
            key={day}
            id={`${idPrefix}-day-${i}`}
            className="dl-ui-calendar__weekhead"
            data-today={day === 0 ? "" : undefined}
            data-far={far(i) ? "" : undefined}
          >
            <span>{weekdayLabel(weekdayIndexOf(i, startWeekday), locale)}</span>{" "}
            <span className="dl-ui-calendar__weeknum">{contentDate(day).getUTCDate()}</span>
          </p>
        ))}
      </div>
      <div className="dl-ui-calendar__week-body">
        <ol className="dl-ui-calendar__hours" aria-hidden="true">
          {HOURS.map((hour) => (
            <li key={hour}>{clockTime(hour * 60, locale)}</li>
          ))}
        </ol>
        {offsets.map((day, i) => {
          const dayEvents = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className="dl-ui-calendar__day"
              role="group"
              aria-labelledby={`${idPrefix}-day-${i}`}
              data-today={day === 0 ? "" : undefined}
              data-far={far(i) ? "" : undefined}
            >
              {dayEvents.length > 0 ? (
                <ul className="dl-ui-calendar__day-events" role="list">
                  {dayEvents.map((event) => (
                    <li key={event.id} className="dl-ui-calendar__event" data-tone={event.tone} style={placement(event)}>
                      {/* Title first: a short event only has room for one line. */}
                      <span className="dl-ui-calendar__event-title">{event.title}</span>
                      <span className="dl-ui-calendar__event-time">{eventRange(event, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
