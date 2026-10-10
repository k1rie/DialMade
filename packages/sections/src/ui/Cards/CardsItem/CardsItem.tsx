import { Card, Icon } from "@dialmade/ui";
import type { linkProps } from "../../../context";
import type { CardItem } from "../schema";

export interface CardsItemProps {
  item: CardItem;
  index: number;
  variant: string;
  titleId: string;
  action: string;
  /** Anchor props of the block's link (`linkProps`), or `null` without an action or a screen link. */
  link: ReturnType<typeof linkProps> | null;
  /** The block links to a screen: without a visible action link, the title carries the link. */
  linked?: boolean;
}

/** One card: icon, title, description and figure; the stat variant leads with the figure. */
export function CardsItem({ item, index, variant, titleId, action, link, linked = false }: CardsItemProps) {
  const stat = variant === "stat";
  const compact = variant === "compact";
  const prop = (key: string) => `items/${index}/${key}`;
  const actionLink = link !== null && action !== "" && !compact;
  const titleLink = link !== null && linked && !actionLink;
  return (
    <Card as="li" className="dl-ui-card" data-variant={variant}>
      {stat ? null : (
        <span className="dl-ui-card__icon" aria-hidden="true">
          <Icon name={item.icon} />
        </span>
      )}
      <div className="dl-ui-card__body">
        <h3 id={titleId} className="dl-ui-card__title" data-dl-prop={prop("title")}>
          {titleLink ? (
            <a {...link} className="dl-ui-card__title-link">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {!compact && item.description ? (
          <p className="dl-ui-card__text" data-dl-prop={prop("description")}>
            {item.description}
          </p>
        ) : null}
      </div>
      {/* The figure follows the title in reading order; CSS shows it first. */}
      {stat && item.meta ? (
        <p className="dl-ui-card__figure" data-dl-prop={prop("meta")}>
          {item.meta}
        </p>
      ) : null}
      {!stat && item.meta ? (
        <span className="dl-ui-card__meta" data-dl-prop={prop("meta")}>
          {item.meta}
        </span>
      ) : null}
      {actionLink ? (
        <a {...link} className="dl-ui__link dl-ui-card__link" aria-describedby={titleId}>
          {action}
          <Icon name="arrow-right" />
        </a>
      ) : null}
    </Card>
  );
}
