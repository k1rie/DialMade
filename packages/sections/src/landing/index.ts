import type { AnySectionDefinition } from "../types";
import { ctaSection } from "./Cta";
import { featuresSection } from "./Features";
import { footerSection } from "./Footer";
import { heroSection } from "./Hero";
import { navbarSection } from "./Navbar";
import { pricingSection } from "./Pricing";
import { socialProofSection } from "./SocialProof";
import { testimonialsSection } from "./Testimonials";

// Landing page: one folder per section (Component.tsx + Component.css + definition.ts + index.ts). Shared
// pieces: LandingSection (outer box and query container), SectionHeading, BrandMark and lib/ (knobs, copy, strings).
export const landingSections: readonly AnySectionDefinition[] = [
  navbarSection,
  heroSection,
  socialProofSection,
  featuresSection,
  testimonialsSection,
  pricingSection,
  ctaSection,
  footerSection,
];

export {
  ctaSection,
  featuresSection,
  footerSection,
  heroSection,
  navbarSection,
  pricingSection,
  socialProofSection,
  testimonialsSection,
};
