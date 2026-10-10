import type { SectionBuilder } from "../../context";
import { ctaBuilder } from "./cta";
import { featuresBuilder } from "./features";
import { footerBuilder } from "./footer";
import { heroBuilder } from "./hero";
import { navbarBuilder } from "./navbar";
import { pricingBuilder } from "./pricing";
import { socialProofBuilder } from "./socialProof";
import { testimonialsBuilder } from "./testimonials";

/** Builders of the `landing.*` sections. */
export const LANDING_BUILDERS: Readonly<Record<string, SectionBuilder>> = {
  "landing.navbar": navbarBuilder,
  "landing.hero": heroBuilder,
  "landing.socialProof": socialProofBuilder,
  "landing.features": featuresBuilder,
  "landing.testimonials": testimonialsBuilder,
  "landing.pricing": pricingBuilder,
  "landing.cta": ctaBuilder,
  "landing.footer": footerBuilder,
};
