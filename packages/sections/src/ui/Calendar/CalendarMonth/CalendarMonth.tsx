import type { Locale } from "@dialmade/catalog";
import { VisuallyHidden } from "@dialmade/ui";
import { clockTime, weekdayLabel } from "../../../content/format";
import { uiStrings, type Weekday } from "../../content";
import { eventsByDay, monthWeeks, weekdayIndexOf } from "../model";
import type { CalendarEvent } from "../schema";

export interface CalendarMonthProps {
  events: readonly CalendarEvent[];
  startWeekday: Weekday;
  locale: Locale;
  /** Id of the element that names the month («Septiembre 2026»). */
  labelledBy: string;
  /** `mini`: numbers and a dot on days with events. */
  compact?: boolean;
}

/** The month of «today» as a table: weekday headers, one row per week, events as chips (or dots). */
export function CalendarMonth({ events, startWeekday, locale, labelledBy, compact = false }: CalendarMonthProps) {
  const strings = uiStrings(locale);
  const byDay = eventsByDay(events);
  const chips = compact ? 0 : 2;
  return (
    <table className="dl-ui-calendar__month" data-compact={compact ? "" : undefined} aria-labelledby={labelledBy}>
      <thead>
        <tr>
          {Array.from({ length: 7 }, (_, i) => (
            <th key={i} scope="col" className="dl-ui-calendar__weekday">
              {weekdayLabel(weekdayIndexOf(i, startWeekday), locale)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(startWeekday).map((week, w) => (
          <tr key={w}>
            {week.map((cell, i) => {
              if (cell.date === null) return <td key={i} className="dl-ui-calendar__cell" data-outside="" />;
              const dayEvents = byDay.get(cell.day) ?? [];
              const today = cell.day === 0;
              return (
                <td
                  key={i}
                  className="dl-ui-calendar__cell"
                  data-today={today ? "" : undefined}
                  data-busy={dayEvents.length > 0 ? "" : undefined}
                  aria-current={today ? "date" : undefined}
                >
                  <span className="dl-ui-calendar__date">{cell.date}</span>
                  {compact && dayEvents.length > 0 ? (
                    <span className="dl-ui-calendar__dot">
                      <VisuallyHidden>{`, ${strings.hasEvents}`}</VisuallyHidden>
                    </span>
                  ) : null}
                  {chips > 0 && dayEvents.length > 0 ? (
                    <ul className="dl-ui-calendar__chips" role="list">
                      {dayEvents.slice(0, chips).map((event) => (
                        <li key={event.id} className="dl-ui-calendar__chip" data-tone={event.tone}>
                          <span className="dl-ui-calendar__chip-time">{clockTime(event.start, locale)}</span> {event.title}
                        </li>
                      ))}
                      {dayEvents.length > chips ? (
                        <li className="dl-ui-calendar__more">{strings.moreEvents(dayEvents.length - chips)}</li>
                      ) : null}
                    </ul>
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
