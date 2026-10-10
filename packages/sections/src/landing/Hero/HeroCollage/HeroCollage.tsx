"use client";

import { useMemo } from "react";
import { Avatar, Badge, Card, CardHeader, Chart, StatCard } from "@dialmade/ui";
import { statList } from "../../../content";
import { dashboardMock, galleryItems } from "../../lib/copy";
import type { RenderContext } from "../../../types";
import { GalleryTile } from "../GalleryTile";
import "./HeroCollage.css";

export interface HeroCollageProps {
  ctx: RenderContext;
  kind: "dashboard" | "gallery";
}

const TONE_BADGE = { success: "success", warning: "warning", info: "info", destructive: "destructive", neutral: "neutral" } as const;

/** Layered cards for the split hero: a main panel and two floating pieces. Decorative and inert. */
export function HeroCollage({ ctx, kind }: HeroCollageProps) {
  const data = useMemo(
    () => (kind === "dashboard" ? { dashboard: dashboardMock(ctx) } : { tiles: galleryItems(ctx, 4), stat: statList(ctx)[0] }),
    [ctx, kind],
  );

  if (data.dashboard) {
    const { chart, kpis, activity } = data.dashboard;
    const [lead, second] = kpis;
    const event = activity[0];
    return (
      <div className="dl-landing-collage" data-kind="dashboard" aria-hidden="true" inert>
        <Card className="dl-landing-collage__main">
          <CardHeader
            title={chart.title}
            titleAs="p"
            description={lead ? `${lead.label} · ${lead.display}` : undefined}
            action={lead ? <Badge variant={(lead.delta >= 0) !== lead.invert ? "success" : "warning"}>{lead.deltaLabel}</Badge> : undefined}
          />
          <Chart type="area" title={chart.title} categories={chart.categories} series={chart.series} height={248} showLegend={false} />
        </Card>
        {second ? (
          <StatCard
            className="dl-landing-collage__float dl-landing-collage__float--top"
            label={second.label}
            value={second.display}
            delta={second.delta}
            invertDelta={second.invert}
            trend={second.trend}
          />
        ) : null}
        {event ? (
          <Card className="dl-landing-collage__float dl-landing-collage__float--bottom">
            <div className="dl-landing-collage__event">
              <Avatar name={event.actor} size="sm" />
              <p className="dl-landing-collage__event-text">
                <strong>{event.actor}</strong> {event.text}
              </p>
              <Badge variant={TONE_BADGE[event.tone]} size="sm" dot>
                {event.time}
              </Badge>
            </div>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="dl-landing-collage" data-kind="gallery" aria-hidden="true" inert>
      <div className="dl-landing-collage__mosaic">
        {data.tiles?.map((item) => (
          <GalleryTile key={item.id} item={item} className="dl-landing-collage__tile" />
        ))}
      </div>
      {data.stat ? (
        <Card className="dl-landing-collage__float dl-landing-collage__float--bottom dl-landing-collage__stat">
          <p className="dl-landing-collage__stat-value">{data.stat.value}</p>
          <p className="dl-landing-collage__stat-label">{data.stat.label}</p>
        </Card>
      ) : null}
    </div>
  );
}
