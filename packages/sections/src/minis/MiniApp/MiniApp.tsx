import { cx } from "../../lib/cx";
import { miniLabel } from "../labels";
import type { MiniProps } from "../types";
import { MINI_BARS, miniAppData } from "./miniData";
import "./MiniApp.css";

/**
 * Thumbnail of the dashboard (≈320×200, scales with its width): sidebar, three KPIs, bars in
 * chart-1..3 and two rows with success and warning badges. It only reads theme variables.
 */
export function MiniApp({ ctx, className }: MiniProps) {
  const data = miniAppData(ctx);
  return (
    <div className={cx("dl-mini-app", className)} role="img" lang={ctx.locale} aria-label={miniLabel("app", ctx.locale, ctx.brand.name)}>
      <div className="dl-mini-app__frame">
        <div className="dl-mini-app__sidebar">
          <span className="dl-mini-app__brand">
            <span className="dl-mini-app__mark" data-logo={ctx.brand.logoUrl ? "" : undefined}>
              {ctx.brand.logoUrl ? <img className="dl-mini-app__logo" src={ctx.brand.logoUrl} alt="" /> : data.initials}
            </span>
            <span className="dl-mini-app__name">{ctx.brand.name}</span>
          </span>
          {data.nav.map((item) => (
            <span key={item.id} className="dl-mini-app__nav-item" data-active={item.active ? "" : undefined}>
              <span className="dl-mini-app__nav-icon" />
              <span className="dl-mini-app__nav-label">{item.label}</span>
            </span>
          ))}
        </div>
        <div className="dl-mini-app__main">
          <div className="dl-mini-app__topbar">
            <span className="dl-mini-app__title">{data.title}</span>
            <span className="dl-mini-app__search" />
            <span className="dl-mini-app__avatar" />
          </div>
          <div className="dl-mini-app__kpis">
            {data.kpis.map((kpi) => (
              <span key={kpi.id} className="dl-mini-app__kpi">
                <span className="dl-mini-app__kpi-label">{kpi.label}</span>
                <span className="dl-mini-app__kpi-value">{kpi.display}</span>
                <span className="dl-mini-app__kpi-delta" data-good={(kpi.delta >= 0) !== kpi.invert ? "" : undefined}>
                  {kpi.deltaLabel}
                </span>
              </span>
            ))}
          </div>
          <div className="dl-mini-app__panels">
            <span className="dl-mini-app__chart">
              {MINI_BARS.map((height, index) => (
                <span key={index} className="dl-mini-app__bar" data-series={(index % 3) + 1} style={{ height: `${height}%` }} />
              ))}
            </span>
            <span className="dl-mini-app__rows">
              {data.rows.map((row) => (
                <span key={row.id} className="dl-mini-app__row">
                  <span className="dl-mini-app__row-dot" />
                  <span className="dl-mini-app__row-label">{row.label}</span>
                  <span className="dl-mini-app__badge" data-tone={row.tone}>
                    {row.status}
                  </span>
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
