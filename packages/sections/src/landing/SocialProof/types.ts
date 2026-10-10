import type { SectionStyle } from "../lib/knobs";

export interface ProofStat {
  value: string;
  label: string;
}

export interface SocialProofProps extends SectionStyle {
  title: string;
  /** Names of fictional companies or publications; each gets a generated logo. */
  logos: string[];
  /** How many of `logos` are shown (1–8). */
  count: number;
  stats: ProofStat[];
  showStats: boolean;
}
