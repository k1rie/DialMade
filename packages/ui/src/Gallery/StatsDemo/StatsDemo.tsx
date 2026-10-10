"use client";

import { formatNumber } from "../../lib/format";
import { StatCard } from "../../StatCard";
import { useUiLocale } from "../../UiProvider";
import { GalleryDemo } from "../GalleryDemo";
import { useGalleryCopy } from "../useGalleryCopy";

export function StatsDemo() {
  const locale = useUiLocale();
  const copy = useGalleryCopy();
  const t = copy.stats;
  const currency = copy.table.currency;
  return (
    <GalleryDemo label={copy.sections.stats.title} span="full" bare>
      <div className="dl-gallery-grid">
        <StatCard
          label={t.revenue}
          value={formatNumber(t.revenueValue, locale, { style: "currency", currency, maximumFractionDigits: 0 })}
          delta={12.4}
          deltaLabel={t.vsLastMonth}
          icon="bar-chart"
          trend={[31, 34, 33, 38, 41, 40, 45, 48]}
        />
        <StatCard
          label={t.activeUsers}
          value={formatNumber(t.activeUsersValue, locale)}
          delta={3.1}
          deltaLabel={t.vsLastMonth}
          icon="users"
          trend={[78, 80, 79, 81, 83, 82, 84]}
        />
        <StatCard
          label={t.churn}
          value={formatNumber(t.churnValue, locale, { style: "percent", maximumFractionDigits: 1 })}
          delta={-0.6}
          invertDelta
          deltaLabel={t.vsLastMonth}
          trend={[3.4, 3.1, 3.2, 2.9, 2.7, 2.6, 2.4]}
        />
        <StatCard
          label={t.tickets}
          value={formatNumber(t.ticketsValue, locale)}
          delta={18}
          invertDelta
          deltaLabel={t.vsLastMonth}
          icon="inbox"
        />
      </div>
    </GalleryDemo>
  );
}
