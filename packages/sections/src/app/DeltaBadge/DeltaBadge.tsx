import type { Locale } from "@dialmade/catalog";
import { Badge } from "@dialmade/ui";
import { formatDelta } from "../../content/format";

export interface DeltaBadgeProps {
  /** Change in %. */
  delta: number;
  /** A drop is good news (churn, wait time…). */
  invert?: boolean;
  locale: Locale;
  size?: "sm" | "md";
}

/** Signed change as a soft badge: green when it is good news, red when it is not. */
export function DeltaBadge({ delta, invert = false, locale, size = "md" }: DeltaBadgeProps) {
  const good = delta === 0 ? null : delta > 0 !== invert;
  return (
    <Badge
      variant={good === null ? "neutral" : good ? "success" : "destructive"}
      size={size}
      icon={delta === 0 ? undefined : delta > 0 ? "arrow-up-right" : "arrow-down-right"}
      className="dl-app-delta"
    >
      {formatDelta(delta, locale)}
    </Badge>
  );
}
