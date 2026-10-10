import { areaPath, monotonePath, type Point } from "../../lib/svgPaths";
import "./Sparkline.css";

export interface SparklineProps {
  values: readonly number[];
  sentiment?: "positive" | "negative" | "neutral";
}

const WIDTH = 100;
const HEIGHT = 32;

/** Tendencia decorativa: el dato que importa ya está en el valor y el delta de la tarjeta. */
export function Sparkline({ values, sentiment = "neutral" }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points: Point[] = values.map((value, index) => [
    (index / (values.length - 1)) * WIDTH,
    HEIGHT - 2 - ((value - min) / span) * (HEIGHT - 4),
  ]);
  const line = monotonePath(points);
  return (
    <svg
      className="dl-sparkline"
      data-sentiment={sentiment}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="dl-sparkline__area" d={areaPath(line, points, HEIGHT)} />
      <path className="dl-sparkline__line" d={line} />
    </svg>
  );
}
