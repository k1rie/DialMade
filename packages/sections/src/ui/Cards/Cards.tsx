"use client";

import { linkProps } from "../../context";
import type { SectionComponentProps } from "../../types";
import { uiStrings } from "../content";
import { UiBlock } from "../UiBlock";
import { CardsItem } from "./CardsItem";
import type { CardsProps } from "./schema";
import "./Cards.css";

/**
 * A grid of cards (feature, compact or stat), one column per 240 px; one column or a carousel on mobile. A
 * block linked to a screen (`linkTo`) links each card there: through its action link when it shows one, else
 * through its title.
 */
export function Cards({ title, level, items, count, columns, mobile, action, frame, variant, ctx, elementId }: SectionComponentProps<CardsProps>) {
  const titleId = `${elementId}-title`;
  const Heading = level ?? "h2";
  const visible = items.slice(0, Math.max(1, count));
  const carousel = mobile === "carousel";
  const linked = (ctx.linkTarget?.(elementId) ?? null) !== null;
  const link = action || linked ? linkProps(ctx, elementId) : null;
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
            <Heading id={titleId} className="dl-ui__title" data-dl-prop="title">
              {title}
            </Heading>
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
              linked={linked}
            />
          ))}
        </ul>
      </div>
    </UiBlock>
  );
}
