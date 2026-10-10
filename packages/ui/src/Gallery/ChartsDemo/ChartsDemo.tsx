"use client";

import { Card, CardHeader } from "../../Card";
import { Chart } from "../../Chart";
import { formatNumber } from "../../lib/format";
import { useUiLocale } from "../../UiProvider";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";

const WEEKLY_USERS = [1240, 1310, 1295, 1420, 1510, 1490, 1630, 1720, 1680, 1810, 1905, 2040];

export function ChartsDemo() {
  const locale = useUiLocale();
  const copy = useGalleryCopy();
  const t = copy.charts;
  const currency = (value: number) =>
    formatNumber(value, locale, { style: "currency", currency: copy.table.currency, notation: "compact", maximumFractionDigits: 1 });
  return (
    <>
      <GalleryDemo label={t.bar} bare>
        <Card>
          <CardHeader title={t.revenueTitle} titleAs="h4" />
          <Chart
            type="bar"
            title={t.revenueTitle}
            categoryLabel={t.month}
            categories={t.months}
            series={[
              { name: t.thisYear, values: [18400, 21300, 19800, 24600, 27100, 29800] },
              { name: t.lastYear, values: [15200, 16900, 17400, 18800, 20500, 22100] },
            ]}
            formatValue={currency}
          />
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.line} bare>
        <Card>
          <CardHeader title={t.usersTitle} titleAs="h4" />
          <Chart
            type="line"
            title={t.usersTitle}
            categoryLabel={t.week}
            categories={WEEKLY_USERS.map((_, index) => `${t.weekPrefix}${index + 1}`)}
            series={[{ name: t.users, values: WEEKLY_USERS }]}
          />
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.area} bare>
        <Card>
          <CardHeader title={t.trafficTitle} titleAs="h4" />
          <Chart
            type="area"
            title={t.trafficTitle}
            categoryLabel={t.day}
            categories={t.days}
            series={[
              { name: t.organic, values: [3200, 3900, 3700, 4300, 4100, 2600, 2300] },
              { name: t.paid, values: [1400, 1800, 2100, 1900, 2400, 1200, 900] },
            ]}
          />
        </Card>
      </GalleryDemo>
      <GalleryDemo label={t.palette} bare>
        <Card>
          <CardHeader title={t.usageTitle} titleAs="h4" />
          <Chart
            type="bar"
            title={t.usageTitle}
            categoryLabel={t.quarter}
            categories={t.quarters}
            series={t.plans.map((name, index) => ({
              name,
              values: t.quarters.map((_, quarter) => 20 + ((index * 17 + quarter * 11) % 45) + quarter * 6),
            }))}
          />
        </Card>
      </GalleryDemo>
    </>
  );
}
