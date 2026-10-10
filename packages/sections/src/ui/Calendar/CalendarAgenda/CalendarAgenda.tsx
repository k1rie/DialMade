import type { Locale } from "@dialmade/catalog";
import { dayLabel, eventRange, uiStrings } from "../../content";
import { sortEvents } from "../model";
import type { CalendarEvent } from "../schema";

export interface CalendarAgendaProps {
  events: readonly CalendarEvent[];
  locale: Locale;
  /** Most events listed. */
  limit?: number;
}

/** Upcoming events from «today», grouped by day («Hoy», «Mañana», «Vie 2 oct»). */
export function CalendarAgenda({ events, locale, limit = 8 }: CalendarAgendaProps) {
  const upcoming = sortEvents(events)
    .filter((event) => event.day >= 0)
    .slice(0, limit);
  if (upcoming.length === 0) return <p className="dl-ui-calendar__empty">{uiStrings(locale).noEvents}</p>;
  const days: { day: number; events: CalendarEvent[] }[] = [];
  for (const event of upcoming) {
    const last = days[days.length - 1];
    if (last && last.day === event.day) last.events.push(event);
    else days.push({ day: event.day, events: [event] });
  }
  return (
    <ol className="dl-ui-calendar__agenda" role="list">
      {days.map(({ day, events: dayEvents }) => (
        <li key={day} className="dl-ui-calendar__agenda-day" data-today={day === 0 ? "" : undefined}>
          <h3 className="dl-ui-calendar__agenda-label">{dayLabel(day, locale)}</h3>
          <ul className="dl-ui-calendar__agenda-events" role="list">
            {dayEvents.map((event) => (
              <li key={event.id} className="dl-ui-calendar__agenda-event" data-tone={event.tone}>
                <span className="dl-ui-calendar__event-time">{eventRange(event, locale)}</span>
                <span className="dl-ui-calendar__event-title">{event.title}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
