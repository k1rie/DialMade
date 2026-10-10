"use client";

import { useMemo } from "react";
import { navLinks } from "../../../content";
import { brandDomain, dashboardMock, galleryItems } from "../../lib/copy";
import type { RenderContext } from "../../../types";
import { DashboardScreen } from "./DashboardScreen";
import { GalleryScreen } from "./GalleryScreen";
import "./ProductMockup.css";

export interface ProductMockupProps {
  ctx: RenderContext;
  kind: "dashboard" | "gallery";
}

/** A browser window with the product inside. Decorative: hidden from assistive tech and inert. */
export function ProductMockup({ ctx, kind }: ProductMockupProps) {
  const dashboard = useMemo(() => (kind === "dashboard" ? dashboardMock(ctx) : undefined), [ctx, kind]);
  const gallery = useMemo(
    () => (kind === "gallery" ? { items: galleryItems(ctx, 4), links: navLinks(ctx).slice(0, 3).map((link) => link.label) } : undefined),
    [ctx, kind],
  );
  return (
    <div className="dl-landing-mockup" data-kind={kind} aria-hidden="true" inert>
      <div className="dl-landing-mockup__chrome">
        <span className="dl-landing-mockup__dots">
          <span />
          <span />
          <span />
        </span>
        <span className="dl-landing-mockup__url">{dashboard ? dashboard.domain : brandDomain(ctx.brand.name)}</span>
      </div>
      <div className="dl-landing-mockup__screen">
        {dashboard ? <DashboardScreen ctx={ctx} data={dashboard} /> : null}
        {gallery ? <GalleryScreen ctx={ctx} items={gallery.items} links={gallery.links} /> : null}
      </div>
    </div>
  );
}
