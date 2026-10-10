"use client";

import { Avatar, Badge, Button, Card, CardHeader, Chart, Icon, NavItem, StatCard } from "@dialmade/ui";
import { BrandMark } from "../../../BrandMark";
import type { DashboardMock } from "../../../lib/copy";
import { landingStrings } from "../../../lib/strings";
import type { RenderContext } from "../../../../types";
import "./DashboardScreen.css";

export interface DashboardScreenProps {
  ctx: RenderContext;
  data: DashboardMock;
}

/** The product's own dashboard (sidebar, KPIs, chart and activity) built with @dialmade/ui. */
export function DashboardScreen({ ctx, data }: DashboardScreenProps) {
  const strings = landingStrings(ctx.locale);
  const user = data.activity[0];
  return (
    <div className="dl-landing-dash">
      <aside className="dl-landing-dash__sidebar">
        <BrandMark name={ctx.brand.name} logoUrl={ctx.brand.logoUrl} size="sm" />
        <div className="dl-landing-dash__nav">
          {data.nav.map((item) => (
            <NavItem key={item.id} label={item.label} icon={item.icon} active={item.active} count={item.count} />
          ))}
        </div>
      </aside>
      <div className="dl-landing-dash__main">
        <div className="dl-landing-dash__top">
          <p className="dl-landing-dash__title">{strings.overview}</p>
          <span className="dl-landing-dash__search">
            <Icon name="search" />
            {strings.search}
          </span>
          <Button size="sm" variant="primary" iconStart="plus">
            {strings.create}
          </Button>
          {user ? <Avatar name={user.actor} size="sm" /> : null}
        </div>
        <div className="dl-landing-dash__kpis">
          {data.kpis.map((kpi) => (
            <StatCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.display}
              delta={kpi.delta}
              invertDelta={kpi.invert}
              trend={kpi.trend}
              icon={kpi.icon}
            />
          ))}
        </div>
        <div className="dl-landing-dash__panels">
          <Card className="dl-landing-dash__chart">
            <CardHeader
              title={data.chart.title}
              titleAs="p"
              action={
                <Badge variant="neutral" size="sm">
                  {data.chart.categories.at(-1)}
                </Badge>
              }
            />
            <Chart type="area" title={data.chart.title} categories={data.chart.categories} series={data.chart.series} height={188} showLegend={false} />
          </Card>
          <Card className="dl-landing-dash__activity">
            <CardHeader title={strings.recent} titleAs="p" />
            <ul className="dl-landing-dash__feed" role="list">
              {data.activity.map((item) => (
                <li key={item.id} className="dl-landing-dash__event">
                  <Avatar name={item.actor} size="xs" />
                  <span className="dl-landing-dash__event-text">
                    <strong>{item.actor}</strong> {item.text}
                  </span>
                  <span className="dl-landing-dash__event-time">{item.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
