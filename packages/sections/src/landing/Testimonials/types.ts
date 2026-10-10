import type { SectionStyle } from "../lib/knobs";

export interface TestimonialEntry {
  quote: string;
  name: string;
  role: string;
  /** Empty for consumer products. */
  company: string;
}

export interface TestimonialsProps extends SectionStyle {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: TestimonialEntry[];
  /** How many of `items` are shown (1–6). */
  count: number;
  showRating: boolean;
}
