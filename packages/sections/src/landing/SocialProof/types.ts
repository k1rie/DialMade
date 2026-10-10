import type { SectionStyle } from "../lib/knobs";

export interface ProofStat {
  value: string;
  label: string;
}

export interface SocialProofProps extends SectionStyle {
  title: string;
  /** Names of fictional companies or publications; each gets a generated logo. */
  logos: string[];
  stats: ProofStat[];
  showStats: boolean;
}
