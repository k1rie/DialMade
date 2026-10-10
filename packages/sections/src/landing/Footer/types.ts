import type { SectionStyle } from "../lib/knobs";

export interface FooterLink {
  label: string;
  href: string;
  /** Screen this link opens (Layout mode). */
  linkTo?: string;
}

export interface FooterColumnEntry {
  title: string;
  links: FooterLink[];
}

export interface FooterProps extends SectionStyle {
  brandName: string;
  /** Empty hides it. */
  tagline: string;
  columns: FooterColumnEntry[];
  /** «Todos los derechos reservados.»; the section adds © year and name. */
  rights: string;
}
