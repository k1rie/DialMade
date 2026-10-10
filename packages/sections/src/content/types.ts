import type { LocalizedText } from "@dialmade/catalog";
import type { IconName } from "@dialmade/ui";

export type ContentProfileId =
  | "saas"
  | "analytics"
  | "devtools"
  | "commerce"
  | "finance"
  | "health"
  | "education"
  | "media"
  | "creative"
  | "community"
  | "services"
  | "consumer"
  | "public";

/** Maps to @dialmade/ui Badge variants. */
export type Tone = "success" | "warning" | "info" | "destructive" | "neutral";

export type ValueFormat = "number" | "decimal" | "compact" | "currency" | "percent" | "duration" | "ms";

export interface ProfileFeature {
  icon: IconName;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ProfileStat {
  value: number;
  format?: ValueFormat;
  suffix?: string;
  label: LocalizedText;
}

export interface ProfilePlan {
  name: LocalizedText;
  price: number;
  description: LocalizedText;
  features: LocalizedText[];
}

export interface ProfileKpi {
  id: string;
  label: LocalizedText;
  format: ValueFormat;
  min: number;
  max: number;
  /** Largest absolute change, in %. */
  deltaMax: number;
  /** A drop is good news (churn, errors, wait time). */
  invert?: boolean;
  unit?: LocalizedText;
  icon?: IconName;
}

export interface StatusOption {
  label: LocalizedText;
  tone: Tone;
  weight?: number;
}

interface ColumnBase {
  key: string;
  label: LocalizedText;
}

export type ProfileColumn =
  | (ColumnBase & { kind: "id"; prefix: string; start: number })
  | (ColumnBase & { kind: "person" })
  | (ColumnBase & { kind: "company" })
  | (ColumnBase & { kind: "choice"; options: LocalizedText[]; unique?: boolean })
  | (ColumnBase & { kind: "status"; options: StatusOption[] })
  | (ColumnBase & { kind: "money"; min: number; max: number })
  | (ColumnBase & { kind: "number"; min: number; max: number; unit?: LocalizedText; compact?: boolean })
  | (ColumnBase & { kind: "percent"; min: number; max: number })
  | (ColumnBase & { kind: "duration"; min: number; max: number })
  | (ColumnBase & { kind: "date" })
  | (ColumnBase & { kind: "relative" })
  | (ColumnBase & { kind: "time" });

export interface ProfileActivity {
  /** `{target}` is replaced by one of `targets`. */
  text: LocalizedText;
  targets: LocalizedText[];
  tone: Tone;
  icon?: IconName;
}

export interface ContentProfile {
  id: ContentProfileId;
  /** Customers are companies (testimonials carry a company, the logo wall shows companies). */
  b2b: boolean;
  hero: {
    eyebrows: LocalizedText[];
    /** `{name}` is replaced by the brand name in every text of the profile. */
    titles: LocalizedText[];
    subtitles: LocalizedText[];
    primaryCta: LocalizedText;
    secondaryCta: LocalizedText;
  };
  landingNav: LocalizedText[];
  proofTitle: LocalizedText;
  features: ProfileFeature[];
  featuresHeading?: { title: LocalizedText; subtitle: LocalizedText };
  stats: ProfileStat[];
  quotes: LocalizedText[];
  roles: LocalizedText[];
  pricing: {
    period: "month" | "once";
    plans: [ProfilePlan, ProfilePlan, ProfilePlan];
    note: LocalizedText;
    title?: LocalizedText;
    subtitle?: LocalizedText;
  };
  cta: { titles: LocalizedText[]; subtitle: LocalizedText; button: LocalizedText };
  kpis: ProfileKpi[];
  chart: {
    title: LocalizedText;
    period: "month" | "week" | "day";
    series: [LocalizedText, LocalizedText];
    format: ValueFormat;
    min: number;
    max: number;
  };
  table: { title: LocalizedText; columns: ProfileColumn[] };
  activity: ProfileActivity[];
  appNav: { icon: IconName; label: LocalizedText }[];
}
