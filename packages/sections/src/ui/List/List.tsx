"use client";

import { Avatar, Icon } from "@dialmade/ui";
import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import { UiBlock } from "../UiBlock";
import type { ListProps } from "./schema";
import "./List.css";

/** Rows of people and what they did: simple, with avatars or divided, and a «Ver todo» link. */
export function List({ title, items, count, showAvatars, action, frame, variant, ctx, elementId }: SectionComponentProps<ListProps>) {
  const titleId = `${elementId}-title`;
  const visible = items.slice(0, Math.max(1, count));
  const avatars = variant === "avatars" || showAvatars;
  return (
    <UiBlock className="dl-ui-list" variant={variant} frame={frame} labelledBy={title ? titleId : undefined}>
      {title || action ? (
        <div className="dl-ui__head">
          <div className="dl-ui__heading">
            {title ? (
              <h2 id={titleId} className="dl-ui__title" data-dl-prop="title">
                {title}
              </h2>
            ) : null}
          </div>
          {action ? (
            <a {...linkProps(ctx, elementId)} className="dl-ui__link" data-dl-prop="action">
              {action}
              <Icon name="arrow-right" />
            </a>
          ) : null}
        </div>
      ) : null}
      <ul className="dl-ui-list__items" role="list">
        {visible.map((item, i) => (
          <li key={item.id} className="dl-ui-list__item" data-tone={item.tone}>
            {avatars ? (
              <span className="dl-ui-list__avatar" aria-hidden="true">
                <Avatar name={item.primary} size={variant === "avatars" ? "md" : "sm"} />
              </span>
            ) : (
              <span className="dl-ui-list__dot" aria-hidden="true" />
            )}
            <div className="dl-ui-list__text">
              <p className="dl-ui-list__primary" data-dl-prop={`items/${i}/primary`}>
                {item.primary}
              </p>
              {item.secondary ? (
                <p className="dl-ui-list__secondary" data-dl-prop={`items/${i}/secondary`}>
                  {item.secondary}
                </p>
              ) : null}
            </div>
            {item.meta ? (
              <span className="dl-ui-list__meta" data-dl-prop={`items/${i}/meta`}>
                {item.meta}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </UiBlock>
  );
}
