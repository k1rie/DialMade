"use client";

import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import { uiStrings } from "../content";
import { UiBlock } from "../UiBlock";
import { CardsItem } from "./CardsItem";
import type { CardsProps } from "./schema";
import "./Cards.css";

/** A grid of cards (feature, compact or stat), one column per 240 px; one column or a carousel on mobile. */
export function Cards({ title, items, count, columns, mobile, action, frame, variant, ctx, elementId }: SectionComponentProps<CardsProps>) {
  const titleId = `${elementId}-title`;
  const visible = items.slice(0, Math.max(1, count));
  const carousel = mobile === "carousel";
  const link = action ? linkProps(ctx, elementId) : null;
  return (
    <UiBlock
      className="dl-ui-cards"
      variant={variant}
      frame={frame}
      labelledBy={title ? titleId : undefined}
      data={{ "data-columns": columns, "data-mobile": mobile, "data-count": String(visible.length) }}
    >
      {title ? (
        <div className="dl-ui__head">
          <div className="dl-ui__heading">
            <h2 id={titleId} className="dl-ui__title" data-dl-prop="title">
              {title}
            </h2>
          </div>
        </div>
      ) : null}
      <div
        className="dl-ui-cards__scroller"
        {...(carousel ? { tabIndex: 0, role: "group", "aria-label": title || uiStrings(ctx.locale).cards } : {})}
      >
        <ul className="dl-ui-cards__grid" role="list">
          {visible.map((item, i) => (
            <CardsItem
              key={i}
              item={item}
              index={i}
              variant={variant}
              titleId={`${elementId}-card-${i + 1}`}
              action={action}
              link={link}
            />
          ))}
        </ul>
      </div>
    </UiBlock>
  );
}
