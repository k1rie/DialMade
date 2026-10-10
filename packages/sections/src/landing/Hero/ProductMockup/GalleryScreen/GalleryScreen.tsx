import { Icon } from "@dialmade/ui";
import { BrandMark } from "../../../BrandMark";
import type { GalleryItem } from "../../../lib/copy";
import type { RenderContext } from "../../../../types";
import { GalleryTile } from "../../GalleryTile";
import "./GalleryScreen.css";

export interface GalleryScreenProps {
  ctx: RenderContext;
  items: readonly GalleryItem[];
  /** Menu of the screen (the landing's own nav labels). */
  links: readonly string[];
}

/** A storefront, catalog or portfolio screen: top bar and a grid of tiles. */
export function GalleryScreen({ ctx, items, links }: GalleryScreenProps) {
  return (
    <div className="dl-landing-gal">
      <div className="dl-landing-gal__top">
        <BrandMark name={ctx.brand.name} logoUrl={ctx.brand.logoUrl} size="sm" />
        <span className="dl-landing-gal__links">
          {links.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </span>
        <span className="dl-landing-gal__tools">
          <Icon name="search" />
          <Icon name="user" />
        </span>
      </div>
      {links[0] ? <p className="dl-landing-gal__title">{links[0]}</p> : null}
      <div className="dl-landing-gal__grid">
        {items.map((item) => (
          <GalleryTile key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
