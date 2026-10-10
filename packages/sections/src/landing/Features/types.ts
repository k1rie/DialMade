import type { IconName } from "@dialmade/ui";
import type { SectionStyle } from "../lib/knobs";

export interface FeatureEntry {
  icon: IconName;
  title: string;
  description: string;
}

export interface FeaturesProps extends SectionStyle {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: FeatureEntry[];
  /** How many of `items` are shown (1–6). */
  count: number;
}
