import { chartData, kpiList } from "../../../content";
import type { ContentContext } from "../../../types";
import "./FeatureVisual.css";

export interface FeatureVisualProps {
  ctx: ContentContext;
}

/** Decorative mini chart for the lead bento tile, drawn from the product's own data. */
export function FeatureVisual({ ctx }: FeatureVisualProps) {
  const chart = chartData(ctx, 8);
  const values = chart.series[0]?.values ?? [];
  const max = Math.max(...values, 1);
  const kpi = kpiList(ctx, 1)[0];
  return (
    <div className="dl-landing-feature-visual" aria-hidden="true">
      {kpi ? (
        <span className="dl-landing-feature-visual__pill">
          <span className="dl-landing-feature-visual__pill-label">{kpi.label}</span>
          <span className="dl-landing-feature-visual__pill-value">{kpi.display}</span>
        </span>
      ) : null}
      <span className="dl-landing-feature-visual__bars">
        {values.map((value, i) => (
          <span
            key={i}
            className="dl-landing-feature-visual__bar"
            data-last={i === values.length - 1 ? "" : undefined}
            style={{ blockSize: `${Math.max(12, Math.round((value / max) * 100))}%` }}
          />
        ))}
      </span>
    </div>
  );
}
