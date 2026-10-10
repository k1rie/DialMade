import type { HeroVisual } from "../lib/copy";
import type { SectionStyle } from "../lib/knobs";

export interface HeroProps extends SectionStyle {
  /** Empty hides it. */
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  /** Empty hides it. */
  secondaryCta: string;
  /** Reassurance line under the buttons; empty hides it. */
  note: string;
  visual: HeroVisual;
}
