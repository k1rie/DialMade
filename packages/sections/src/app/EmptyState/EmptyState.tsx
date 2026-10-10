"use client";

import { Button, Icon } from "@dialmade/ui";
import type { SectionComponentProps } from "../../types";
import type { EmptyStateProps } from "./schema";
import "./EmptyState.css";

/** What a list looks like before it has data: icon, one sentence and the action that fills it. */
export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant,
  elementId,
}: SectionComponentProps<EmptyStateProps>) {
  const titleId = `${elementId}-title`;
  const illustrated = variant === "illustrated";
  return (
    <section className="dl-app-empty" data-layout={illustrated ? "illustrated" : "dashed"} aria-labelledby={titleId}>
      {illustrated ? (
        <div className="dl-app-empty__art" aria-hidden="true">
          <span className="dl-app-empty__sheet" />
          <span className="dl-app-empty__sheet" />
          <span className="dl-app-empty__sheet">
            <span className="dl-app-empty__line" />
            <span className="dl-app-empty__line" />
            <span className="dl-app-empty__line" />
          </span>
          <span className="dl-app-empty__badge">
            <Icon name={icon} />
          </span>
        </div>
      ) : (
        <span className="dl-app-empty__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <div className="dl-app-empty__text">
        <h2 id={titleId} className="dl-app-empty__title">
          {title}
        </h2>
        {description ? <p className="dl-app-empty__description">{description}</p> : null}
      </div>
      <div className="dl-app-empty__actions">
        {primaryAction ? (
          <Button variant="primary" iconStart="plus">
            {primaryAction}
          </Button>
        ) : null}
        {secondaryAction ? <Button variant="outline">{secondaryAction}</Button> : null}
      </div>
    </section>
  );
}
