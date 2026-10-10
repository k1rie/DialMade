"use client";

import { Avatar, Button, Card, Icon } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import { appStrings } from "../content";
import { WidgetHeader } from "../WidgetHeader";
import type { ActivityProps } from "./schema";
import "./Activity.css";

/** Recent activity: a timeline of tinted icons by tone, or a list of people. */
export function Activity({ title, description, items, count, showViewAll, variant, ctx, elementId }: SectionComponentProps<ActivityProps>) {
  const titleId = `${elementId}-title`;
  const timeline = variant !== "list";
  return (
    <Card as="section" className="dl-app-activity" data-layout={timeline ? "timeline" : "list"} aria-labelledby={titleId}>
      <WidgetHeader
        id={titleId}
        title={title}
        description={description}
        actions={
          showViewAll ? (
            <Button variant="ghost" size="sm" iconEnd="arrow-right">
              {appStrings(ctx.locale).viewAll}
            </Button>
          ) : null
        }
      />
      <ol className="dl-app-activity__list">
        {items.slice(0, count).map((item) => (
          <li key={item.id} className="dl-app-activity__item" data-tone={item.tone}>
            {timeline ? (
              <span className="dl-app-activity__node" aria-hidden="true">
                <Icon name={item.icon ?? "info"} />
              </span>
            ) : (
              <span className="dl-app-activity__avatar" aria-hidden="true">
                <Avatar name={item.actor} size="sm" />
              </span>
            )}
            <div className="dl-app-activity__body">
              <p className="dl-app-activity__text">
                <strong className="dl-app-activity__actor">{item.actor}</strong> {item.text}
              </p>
              <p className="dl-app-activity__time">{item.time}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
