import type { SectionStyle } from "../lib/knobs";

export interface NavbarLink {
  label: string;
  href: string;
}

export interface NavbarProps extends SectionStyle {
  brandName: string;
  links: NavbarLink[];
  /** Secondary action («Iniciar sesión»); empty hides it. */
  secondaryLabel: string;
  ctaLabel: string;
}
