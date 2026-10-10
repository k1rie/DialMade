import type { SectionStyle } from "../lib/knobs";

export interface NavbarLink {
  label: string;
  href: string;
  /** Screen this link opens (Layout mode). */
  linkTo?: string;
}

export interface NavbarProps extends SectionStyle {
  brandName: string;
  links: NavbarLink[];
  /** How many of `links` show in the bar and the menu (0–6). */
  linkCount: number;
  /** Secondary action («Iniciar sesión»); empty hides it. */
  secondaryLabel: string;
  ctaLabel: string;
}
