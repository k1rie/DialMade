"use client";

import type { SectionComponentProps } from "../../types";
import { eventRange, monthTitle, uiStrings } from "../content";
import { UiBlock } from "../UiBlock";
import { CalendarAgenda } from "./CalendarAgenda";
import { CalendarMonth } from "./CalendarMonth";
import { CalendarWeek } from "./CalendarWeek";
import { sortEvents } from "./model";
import type { CalendarProps } from "./schema";
import "./Calendar.css";

/**
 * Calendar of the content's month («today» is fixed, so the copy never depends on the clock): month,
 * week, agenda or mini. With `mobile: "agenda"` the agenda is also in the markup and replaces the view
 * below the layout's mobile breakpoint.
 */
export function Calendar({ title, level, startWeekday, events, mobile, frame, variant, ctx, elementId }: SectionComponentProps<CalendarProps>) {
  const { locale } = ctx;
  const strings = uiStrings(locale);
  const titleId = `${elementId}-title`;
  const Heading = level ?? "h2";
  const monthId = `${elementId}-month`;
  const mobileAgenda = mobile === "agenda" && variant !== "agenda";
  const next = variant === "mini" ? sortEvents(events).find((event) => event.day >= 0) : undefined;

  const view =
    variant === "week" ? (
      <CalendarWeek events={events} startWeekday={startWeekday} locale={locale} idPrefix={`${elementId}-week`} />
    ) : variant === "agenda" ? (
      <CalendarAgenda events={events} locale={locale} />
    ) : (
      <CalendarMonth events={events} startWeekday={startWeekday} locale={locale} labelledBy={monthId} compact={variant === "mini"} />
    );

  return (
    <UiBlock
      className="dl-ui-calendar"
      variant={variant}
      frame={frame}
      labelledBy={title ? titleId : monthId}
      data={{ "data-mobile-agenda": mobileAgenda ? "" : undefined }}
    >
      <div className="dl-ui__head">
        <div className="dl-ui__heading">
          {title ? (
            <Heading id={titleId} className="dl-ui__title" data-dl-prop="title">
              {title}
            </Heading>
          ) : null}
          <p id={monthId} className="dl-ui__subtitle">
            {monthTitle(locale)}
          </p>
        </div>
      </div>
      <div className="dl-ui-calendar__view">
        {view}
        {next ? (
          <p className="dl-ui-calendar__next">
            <span className="dl-ui-calendar__next-label">{strings.nextEvent}</span>
            <span className="dl-ui-calendar__event-time">{eventRange(next, locale)}</span>
            <span className="dl-ui-calendar__event-title">{next.title}</span>
          </p>
        ) : null}
      </div>
      {mobileAgenda ? (
        <div className="dl-ui-calendar__mobile">
          <CalendarAgenda events={events} locale={locale} />
        </div>
      ) : null}
    </UiBlock>
  );
}
