import { Icon } from "@dialmade/ui";
import { cx } from "../../../lib/cx";
import type { GalleryItem } from "../../lib/copy";
import "./GalleryTile.css";

export interface GalleryTileProps {
  item: GalleryItem;
  className?: string;
}

/** A product, episode or project with generative artwork painted from the theme's chart colors. */
export function GalleryTile({ item, className }: GalleryTileProps) {
  return (
    <figure className={cx("dl-landing-tile", className)} data-art={item.art} data-icon={item.icon ? "" : undefined}>
      <div className="dl-landing-tile__art">{item.icon ? <Icon name={item.icon} className="dl-landing-tile__icon" /> : null}</div>
      <figcaption className="dl-landing-tile__caption">
        <span className="dl-landing-tile__title">{item.title}</span>
        {item.meta ? <span className="dl-landing-tile__meta">{item.meta}</span> : null}
      </figcaption>
    </figure>
  );
}
